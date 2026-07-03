#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const CORE_PROTOCOLS = new Set([
  "openai-chat-completions",
  "openai-responses",
  "anthropic-messages",
]);

const SECRET_SCHEMES = new Set(["env", "keychain", "file"]);
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "proxy-authorization",
]);

const MODEL_REF_KEYS = [
  "defaultModel",
  "defaultEmbeddingModel",
  "defaultImageModel",
  "defaultTextToSpeechModel",
  "defaultVideoModel",
];

function usage() {
  return `Usage: node tools/validator/lapp-validate.mjs [path-to-.lapp]

If no path is provided, the validator checks LAPP_HOME first, then ./.lapp.

Exit codes:
  0  no ERROR
  1  validation ERROR found
  2  validator failure`;
}

function stripJsonc(input) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      i += 2;
      while (i < input.length && input[i] !== "\n" && input[i] !== "\r") {
        i += 1;
      }
      output += input[i] ?? "";
      continue;
    }

    if (char === "/" && next === "*") {
      i += 2;
      while (i + 1 < input.length && !(input[i] === "*" && input[i + 1] === "/")) {
        i += 1;
      }
      i += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function readJsonc(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(stripJsonc(raw));
}

function findConfigFile(dir, baseName) {
  const jsonPath = path.join(dir, `${baseName}.json`);
  if (fs.existsSync(jsonPath)) return jsonPath;
  const jsoncPath = path.join(dir, `${baseName}.jsonc`);
  if (fs.existsSync(jsoncPath)) return jsoncPath;
  return null;
}

function relative(root, target) {
  return path.relative(root, target).replaceAll(path.sep, "/") || ".";
}

class Reporter {
  constructor(root) {
    this.root = root;
    this.errors = 0;
    this.warnings = 0;
    this.infos = 0;
    this.lines = [];
  }

  add(level, location, message) {
    if (level === "ERROR") this.errors += 1;
    if (level === "WARN") this.warnings += 1;
    if (level === "INFO") this.infos += 1;
    this.lines.push({ level, location, message });
  }

  ok(location, message) {
    this.lines.push({ level: "OK", location, message });
  }

  print(targetPath) {
    console.log(`LAPP validate: ${targetPath}`);
    console.log("");
    for (const line of this.lines) {
      const location = line.location ? ` ${line.location}:` : "";
      console.log(`${line.level.padEnd(5)}${location} ${line.message}`);
    }
    console.log("");
    const result = this.errors > 0 ? "failed" : "passed";
    console.log(`Result: ${result} with ${this.errors} error(s), ${this.warnings} warning(s)`);
  }
}

function parseConfig(filePath, label, reporter, root) {
  try {
    return readJsonc(filePath);
  } catch (error) {
    reporter.add("ERROR", relative(root, filePath), `invalid JSON/JSONC in ${label}: ${error.message}`);
    return null;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateSecret(secret, location, reporter) {
  if (typeof secret !== "string" || secret.trim() === "") {
    reporter.add("WARN", location, "auth.secret is missing or empty");
    return;
  }

  const schemeMatch = secret.match(/^([A-Za-z][A-Za-z0-9+.-]*):\/\//);
  if (!schemeMatch) {
    reporter.add("WARN", location, "auth.secret is a plain secret; prefer env:// or keychain://");
    return;
  }

  const scheme = schemeMatch[1].toLowerCase();
  if (!SECRET_SCHEMES.has(scheme)) {
    reporter.add("WARN", location, `auth.secret uses unknown URI scheme "${scheme}://"`);
  }
}

function validateRequestHeaders(headers, location, reporter) {
  if (!isObject(headers)) return;
  for (const header of Object.keys(headers)) {
    if (SENSITIVE_HEADERS.has(header.toLowerCase())) {
      reporter.add("WARN", location, `requestHeaders contains sensitive header "${header}"`);
    }
  }
}

function validateProvider(providerDir, root, reporter) {
  const dirName = path.basename(providerDir);
  const providerFile = findConfigFile(providerDir, "provider");
  if (!providerFile) {
    reporter.add("ERROR", relative(root, providerDir), "missing provider.json or provider.jsonc");
    return null;
  }

  const provider = parseConfig(providerFile, "provider.json", reporter, root);
  if (!provider) return null;

  const location = relative(root, providerFile);
  for (const field of ["id", "protocol", "baseUrl"]) {
    if (typeof provider[field] !== "string" || provider[field].trim() === "") {
      reporter.add("ERROR", location, `missing required field "${field}"`);
    }
  }

  if (typeof provider.id === "string" && provider.id !== dirName) {
    reporter.add("WARN", location, `provider id "${provider.id}" does not match directory "${dirName}"`);
  }

  if (typeof provider.baseUrl === "string" && provider.baseUrl.endsWith("/")) {
    reporter.add("WARN", location, "baseUrl should not end with /");
  }

  if (typeof provider.protocol === "string" && !CORE_PROTOCOLS.has(provider.protocol)) {
    reporter.add("WARN", location, `protocol "${provider.protocol}" is not a core LAPP v1 protocol`);
  }

  validateSecret(provider.auth?.secret, location, reporter);
  validateRequestHeaders(provider.requestHeaders, location, reporter);
  reporter.ok(location, "provider parsed");

  return {
    id: typeof provider.id === "string" && provider.id.trim() ? provider.id : dirName,
    dirName,
    dir: providerDir,
    file: providerFile,
    data: provider,
    modelIds: new Set(),
    modelAliases: new Set(),
    modelCount: 0,
  };
}

function validateModels(providerRecord, root, reporter) {
  const modelsFile = findConfigFile(providerRecord.dir, "models");
  if (!modelsFile) return;

  const modelsDoc = parseConfig(modelsFile, "models.json", reporter, root);
  if (!modelsDoc) return;

  const location = relative(root, modelsFile);
  if (!Array.isArray(modelsDoc.models)) {
    reporter.add("ERROR", location, "models must be an array");
    return;
  }

  const aliasOwner = new Map();
  for (const [index, model] of modelsDoc.models.entries()) {
    const modelLocation = `${location}#models[${index}]`;
    if (!isObject(model)) {
      reporter.add("ERROR", modelLocation, "model entry must be an object");
      continue;
    }

    if (typeof model.id !== "string" || model.id.trim() === "") {
      reporter.add("ERROR", modelLocation, "model is missing required field \"id\"");
      continue;
    }

    providerRecord.modelCount += 1;
    providerRecord.modelIds.add(model.id);

    if (typeof model.type !== "string" || model.type.trim() === "") {
      reporter.add("WARN", modelLocation, "model is missing type");
    }

    if (typeof model.source !== "string" || model.source.trim() === "") {
      reporter.add("WARN", modelLocation, "model source is missing; treat as manual");
    } else if (!["provider", "manual"].includes(model.source)) {
      reporter.add("WARN", modelLocation, `model source "${model.source}" is not provider or manual`);
    }

    if (Array.isArray(model.aliases)) {
      for (const alias of model.aliases) {
        if (typeof alias !== "string" || alias.trim() === "") continue;
        providerRecord.modelAliases.add(alias);
        if (aliasOwner.has(alias)) {
          reporter.add("WARN", modelLocation, `duplicate alias "${alias}" also used by "${aliasOwner.get(alias)}"`);
        } else {
          aliasOwner.set(alias, model.id);
        }
      }
    }
  }

  reporter.ok(location, `models parsed (${providerRecord.modelCount} model(s))`);
}

function validateGlobal(root, providerRecords, reporter) {
  const globalFile = findConfigFile(root, "global");
  if (!globalFile) return;

  const globalDoc = parseConfig(globalFile, "global.json", reporter, root);
  if (!globalDoc) return;

  const location = relative(root, globalFile);
  for (const key of MODEL_REF_KEYS) {
    const ref = globalDoc[key];
    if (!isObject(ref)) continue;

    if (typeof ref.providerId !== "string" || ref.providerId.trim() === "") {
      reporter.add("ERROR", `${location}#${key}`, "missing providerId");
      continue;
    }

    const provider = providerRecords.get(ref.providerId);
    if (!provider) {
      reporter.add("ERROR", `${location}#${key}`, `providerId "${ref.providerId}" does not exist`);
      continue;
    }

    if (typeof ref.model !== "string" || ref.model.trim() === "") {
      reporter.add("WARN", `${location}#${key}`, "model is missing or empty");
      continue;
    }

    const knownModel = provider.modelIds.has(ref.model) || provider.modelAliases.has(ref.model);
    const hasModelsFile = Boolean(findConfigFile(provider.dir, "models"));
    if (hasModelsFile && !knownModel) {
      reporter.add("WARN", `${location}#${key}`, `model "${ref.model}" was not found in provider "${ref.providerId}" models.json`);
    }
  }

  reporter.ok(location, "global defaults parsed");
}

function validateManifest(root, reporter) {
  const manifestFile = findConfigFile(root, "manifest");
  if (!manifestFile) return;
  const manifest = parseConfig(manifestFile, "manifest.json", reporter, root);
  if (manifest) reporter.ok(relative(root, manifestFile), "manifest parsed");
}

function validate(targetArg) {
  const root = path.resolve(targetArg || process.env.LAPP_HOME || ".lapp");
  const reporter = new Reporter(root);
  const providerRecords = new Map();

  if (!fs.existsSync(root)) {
    reporter.add("ERROR", ".", "target directory does not exist");
    reporter.print(root);
    return reporter.errors > 0 ? 1 : 0;
  }

  const stat = fs.statSync(root);
  if (!stat.isDirectory()) {
    reporter.add("ERROR", ".", "target path is not a directory");
    reporter.print(root);
    return 1;
  }

  validateManifest(root, reporter);

  const providersDir = path.join(root, "providers");
  if (!fs.existsSync(providersDir) || !fs.statSync(providersDir).isDirectory()) {
    reporter.add("ERROR", "providers", "missing providers/ directory");
    reporter.print(root);
    return 1;
  }

  const providerDirs = fs.readdirSync(providersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(providersDir, entry.name))
    .sort((a, b) => a.localeCompare(b));

  for (const providerDir of providerDirs) {
    const record = validateProvider(providerDir, root, reporter);
    if (!record) continue;
    validateModels(record, root, reporter);
    providerRecords.set(record.id, record);
  }

  validateGlobal(root, providerRecords, reporter);

  const providerList = [...providerRecords.values()];
  const totalModels = providerList.reduce((sum, provider) => sum + provider.modelCount, 0);
  reporter.add("INFO", "", `providers: ${providerList.length}, models: ${totalModels}`);
  if (providerList.length > 0) {
    reporter.add("INFO", "", `provider ids: ${providerList.map((provider) => provider.id).join(", ")}`);
  }

  reporter.print(root);
  return reporter.errors > 0 ? 1 : 0;
}

try {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
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
