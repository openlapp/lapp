#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.resolve(SCRIPT_DIR, "../../schema");
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const ENV_SECRET = /^env:\/\/[A-Za-z_][A-Za-z0-9_]*$/;
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "api-key",
  "x-api-key",
]);

function readSchema(name) {
  return JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, `${name}.schema.json`), "utf8"));
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
const schemas = {
  provider: ajv.compile(readSchema("provider")),
  models: ajv.compile(readSchema("models")),
  global: ajv.compile(readSchema("global")),
};

function usage() {
  return `Usage: node tools/validator/lapp-validate.mjs [path-to-.lapp]

If no path is provided, the validator checks LAPP_HOME first, then ./.lapp.

Exit codes:
  0  no ERROR
  1  validation ERROR found
  2  usage error or validator failure`;
}

function relative(root, target) {
  return path.relative(root, target).replaceAll(path.sep, "/") || ".";
}

class Reporter {
  constructor(root) {
    this.root = root;
    this.errors = 0;
    this.warnings = 0;
    this.lines = [];
  }

  add(level, location, code, message) {
    if (level === "ERROR") this.errors += 1;
    if (level === "WARN") this.warnings += 1;
    this.lines.push({ level, location, code, message });
  }

  ok(location, message) {
    this.lines.push({ level: "OK", location, code: "OK", message });
  }

  info(message) {
    this.lines.push({ level: "INFO", location: "", code: "SUMMARY", message });
  }

  print(targetPath) {
    console.log(`LAPP validate: ${targetPath}\n`);
    for (const line of this.lines) {
      const location = line.location ? ` ${line.location}:` : "";
      console.log(`${line.level.padEnd(5)}${location} [${line.code}] ${line.message}`);
    }
    const result = this.errors > 0 ? "failed" : "passed";
    console.log(`\nResult: ${result} with ${this.errors} error(s), ${this.warnings} warning(s)`);
  }
}

function readJson(filePath, label, reporter, root) {
  try {
    return { ok: true, value: JSON.parse(fs.readFileSync(filePath, "utf8")) };
  } catch (error) {
    reporter.add("ERROR", relative(root, filePath), "INVALID_JSON", `${label} is not valid JSON: ${error.message}`);
    return { ok: false };
  }
}

function validateSchema(kind, value, location, reporter) {
  const validate = schemas[kind];
  if (validate(value)) return true;
  for (const error of validate.errors ?? []) {
    const pointer = error.instancePath || "/";
    reporter.add("ERROR", `${location}#${pointer}`, `SCHEMA_${kind.toUpperCase()}`, error.message ?? "schema validation failed");
  }
  return false;
}

function isLoopback(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1") return true;
  const match = host.match(/^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  return Boolean(match && match.slice(1).every((part) => Number(part) <= 255));
}

function parseSafeUrl(value, location, field, reporter) {
  let url;
  try {
    url = new URL(value);
  } catch {
    reporter.add("ERROR", location, "INVALID_URL", `${field} must be an absolute URL`);
    return null;
  }
  if (url.username || url.password) {
    reporter.add("ERROR", location, "URL_CREDENTIALS", `${field} must not contain credentials`);
  }
  if (url.hash) {
    reporter.add("ERROR", location, "URL_FRAGMENT", `${field} must not contain a fragment`);
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback(url.hostname))) {
    reporter.add("ERROR", location, "INSECURE_URL", `${field} must use HTTPS unless its host is loopback`);
  }
  return url;
}

function validateSecret(auth, location, reporter) {
  if (auth.type === "none") return;
  const secret = auth.secret;
  if (secret.startsWith("env://")) {
    if (!ENV_SECRET.test(secret)) {
      reporter.add("ERROR", location, "INVALID_ENV_SECRET", "auth.secret must use env:// followed by a valid environment-variable name");
    }
    return;
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(secret)) {
    reporter.add("ERROR", location, "UNSUPPORTED_SECRET_SCHEME", "auth.secret supports only plaintext or env://NAME in LAPP v1");
    return;
  }
  reporter.add("WARN", location, "PLAINTEXT_SECRET", "auth.secret is plaintext; prefer env://NAME");
}

function validateHeaders(headers, auth, location, reporter) {
  if (!headers) return;
  for (const name of Object.keys(headers)) {
    const lower = name.toLowerCase();
    const normalized = lower.replace(/[^a-z0-9]/g, "");
    if (SENSITIVE_HEADERS.has(lower)
      || normalized.endsWith("apikey")
      || normalized.endsWith("token")
      || normalized.endsWith("secret")
      || normalized.endsWith("credential")) {
      reporter.add("ERROR", location, "SENSITIVE_REQUEST_HEADER", `requestHeaders must not contain credential header "${name}"`);
    }
    if (auth.type === "header" && lower === auth.name.toLowerCase()) {
      reporter.add("ERROR", location, "DUPLICATE_AUTH_HEADER", `requestHeaders must not duplicate authentication header "${name}"`);
    }
  }
}

function reportUnsupportedFiles(root, reporter) {
  const candidates = [path.join(root, "global.jsonc"), path.join(root, "manifest.json"), path.join(root, "manifest.jsonc")];
  const providersDir = path.join(root, "providers");
  if (fs.existsSync(providersDir) && fs.statSync(providersDir).isDirectory()) {
    for (const entry of fs.readdirSync(providersDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      candidates.push(path.join(providersDir, entry.name, "provider.jsonc"));
      candidates.push(path.join(providersDir, entry.name, "models.jsonc"));
    }
  }
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      reporter.add("ERROR", relative(root, file), "UNSUPPORTED_FILE", "LAPP v1 supports only provider.json, models.json, and optional global.json");
    }
  }
}

function validateModels(provider, root, reporter) {
  const file = path.join(provider.dir, "models.json");
  const fileLocation = relative(root, file);
  if (!fs.existsSync(file)) {
    reporter.add("ERROR", relative(root, provider.dir), "MISSING_MODELS", "missing required models.json");
    return;
  }
  const parsed = readJson(file, "models.json", reporter, root);
  if (!parsed.ok || !validateSchema("models", parsed.value, fileLocation, reporter)) return;
  const data = parsed.value;

  const identities = new Map();
  for (const [index, model] of data.models.entries()) {
    const location = `${fileLocation}#/models/${index}`;
    const names = [model.id, ...(model.aliases ?? [])];
    for (const name of names) {
      const owner = identities.get(name);
      if (owner) {
        reporter.add("ERROR", location, "DUPLICATE_MODEL_IDENTITY", `model ID or alias "${name}" is already owned by "${owner}"`);
      } else {
        identities.set(name, model.id);
      }
    }
    for (const protocol of model.protocols ?? []) {
      if (!provider.protocols.has(protocol)) {
        reporter.add("ERROR", location, "MODEL_PROTOCOL_NOT_DECLARED", `model protocol "${protocol}" is not declared by provider "${provider.id}"`);
      }
    }
    provider.models.set(model.id, { enabled: model.enabled !== false });
    for (const alias of model.aliases ?? []) provider.aliases.add(alias);
  }
  reporter.ok(fileLocation, `models parsed (${data.models.length} model(s))`);
}

function validateProvider(providerDir, root, reporter) {
  const file = path.join(providerDir, "provider.json");
  const fileLocation = relative(root, file);
  if (!fs.existsSync(file)) {
    reporter.add("ERROR", relative(root, providerDir), "MISSING_PROVIDER", "missing required provider.json");
    return null;
  }
  const parsed = readJson(file, "provider.json", reporter, root);
  if (!parsed.ok || !validateSchema("provider", parsed.value, fileLocation, reporter)) return null;
  const data = parsed.value;

  const dirName = path.basename(providerDir);
  if (data.id !== dirName) {
    reporter.add("ERROR", fileLocation, "PROVIDER_DIRECTORY_MISMATCH", `provider id "${data.id}" must exactly match directory "${dirName}"`);
  }
  if (WINDOWS_RESERVED.test(data.id)) {
    reporter.add("ERROR", fileLocation, "RESERVED_PROVIDER_ID", `provider id "${data.id}" is a reserved Windows device name`);
  }
  if (data.id.endsWith(".")) {
    reporter.add("ERROR", fileLocation, "UNSAFE_PROVIDER_ID", `provider id "${data.id}" must not end with a dot`);
  }

  const baseUrl = parseSafeUrl(data.baseUrl, fileLocation, "baseUrl", reporter);
  if (data.modelDiscovery) {
    const discoveryUrl = parseSafeUrl(data.modelDiscovery.url, fileLocation, "modelDiscovery.url", reporter);
    if (baseUrl && discoveryUrl && baseUrl.origin !== discoveryUrl.origin) {
      reporter.add("ERROR", fileLocation, "CROSS_ORIGIN_DISCOVERY", "modelDiscovery.url must have the same origin as baseUrl");
    }
  }
  validateSecret(data.auth, fileLocation, reporter);
  validateHeaders(data.requestHeaders, data.auth, fileLocation, reporter);

  const record = {
    id: data.id,
    enabled: data.enabled !== false,
    dir: providerDir,
    protocols: new Set(data.protocols),
    models: new Map(),
    aliases: new Set(),
  };
  reporter.ok(fileLocation, "provider parsed");
  validateModels(record, root, reporter);
  return record;
}

function validateGlobal(root, providers, reporter) {
  const file = path.join(root, "global.json");
  if (!fs.existsSync(file)) return;
  const location = relative(root, file);
  const parsed = readJson(file, "global.json", reporter, root);
  if (!parsed.ok || !validateSchema("global", parsed.value, location, reporter)) return;
  const data = parsed.value;

  for (const [operation, ref] of Object.entries(data.defaults)) {
    const refLocation = `${location}#/defaults/${operation}`;
    const provider = providers.get(ref.providerId);
    if (!provider) {
      reporter.add("ERROR", refLocation, "DEFAULT_PROVIDER_NOT_FOUND", `provider "${ref.providerId}" does not exist`);
      continue;
    }
    if (!provider.enabled) {
      reporter.add("ERROR", refLocation, "DEFAULT_PROVIDER_DISABLED", `provider "${ref.providerId}" is disabled`);
    }
    const model = provider.models.get(ref.modelId);
    if (!model) {
      const detail = provider.aliases.has(ref.modelId) ? "aliases are not allowed in defaults" : "model does not exist";
      reporter.add("ERROR", refLocation, "DEFAULT_MODEL_NOT_FOUND", `${detail}: "${ref.modelId}"`);
      continue;
    }
    if (!model.enabled) {
      reporter.add("ERROR", refLocation, "DEFAULT_MODEL_DISABLED", `model "${ref.modelId}" is disabled`);
    }
  }
  reporter.ok(location, "global defaults parsed");
}

function validate(targetArg) {
  const root = path.resolve(targetArg || process.env.LAPP_HOME || ".lapp");
  const reporter = new Reporter(root);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    reporter.add("ERROR", ".", "INVALID_ROOT", "target must be an existing directory");
    reporter.print(root);
    return 1;
  }

  reportUnsupportedFiles(root, reporter);
  const providersDir = path.join(root, "providers");
  if (!fs.existsSync(providersDir) || !fs.statSync(providersDir).isDirectory()) {
    reporter.add("ERROR", "providers", "MISSING_PROVIDERS", "missing providers/ directory");
    reporter.print(root);
    return 1;
  }

  const providers = new Map();
  const dirs = fs.readdirSync(providersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of dirs) {
    const provider = validateProvider(path.join(providersDir, entry.name), root, reporter);
    if (!provider) continue;
    if (providers.has(provider.id)) {
      reporter.add("ERROR", relative(root, provider.dir), "DUPLICATE_PROVIDER_ID", `provider id "${provider.id}" is duplicated`);
    } else {
      providers.set(provider.id, provider);
    }
  }

  validateGlobal(root, providers, reporter);
  const modelCount = [...providers.values()].reduce((sum, provider) => sum + provider.models.size, 0);
  reporter.info(`providers: ${providers.size}, models: ${modelCount}`);
  reporter.print(root);
  return reporter.errors > 0 ? 1 : 0;
}

try {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    if (args.length !== 1) {
      console.error(usage());
      process.exit(2);
    }
    console.log(usage());
    process.exit(0);
  }
  if (args.length > 1) {
    console.error(usage());
    process.exit(2);
  }
  process.exit(validate(args[0]));
} catch (error) {
  console.error(`Validator failure: ${error.stack || error.message}`);
  process.exit(2);
}
