import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VALIDATOR = "tools/validator/lapp-validate.mjs";
let assertions = 0;

function run(args) {
  try {
    const stdout = execFileSync(process.execPath, [VALIDATOR, ...args], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
    return { status: 0, output: stdout };
  } catch (error) {
    return {
      status: error.status ?? 2,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

function expectExit(args, expected, message) {
  assertions += 1;
  assert.equal(run(args).status, expected, message);
}

function expectDiagnostic(target, code, expectedCount = 1, expectedStatus = 1) {
  const result = run([target]);
  assertions += 2;
  assert.equal(result.status, expectedStatus, `${target} should exit with ${expectedStatus}`);
  const actualCount = [...result.output.matchAll(new RegExp(`\\[${code}\\]`, "g"))].length;
  assert.equal(actualCount, expectedCount, `${target} should report ${code} ${expectedCount} time(s)`);
}

function expectMessages(target, messages, expectedStatus = 1) {
  const result = run([target]);
  assertions += 1 + messages.length;
  assert.equal(result.status, expectedStatus, `${target} should exit with ${expectedStatus}`);
  for (const message of messages) {
    assert.ok(result.output.includes(message), `${target} should report: ${message}`);
  }
}

const valid = [
  "examples/en/minimal/.lapp",
  "examples/en/full/.lapp",
  "examples/zh-CN/minimal/.lapp",
  "examples/zh-CN/full/.lapp",
  "tools/validator/fixtures/valid/auth-forms/.lapp",
];
for (const target of valid) expectExit([target], 0, `${target} should pass`);
expectDiagnostic("tools/validator/fixtures/valid/auth-forms/.lapp", "PLAINTEXT_SECRET", 1, 0);

const invalidRoot = path.join(ROOT, "tools/validator/fixtures/invalid");
const invalid = fs.readdirSync(invalidRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `tools/validator/fixtures/invalid/${entry.name}/.lapp`)
  .sort();
for (const target of invalid) expectExit([target], 1, `${target} should fail validation without crashing`);

const secretReferences = "tools/validator/fixtures/invalid/secret-references/.lapp";
expectDiagnostic(secretReferences, "INVALID_VAULT_SECRET", 8);
expectDiagnostic(secretReferences, "VAULT_PROVIDER_MISMATCH");
expectDiagnostic(secretReferences, "INVALID_ENV_SECRET");
expectDiagnostic(secretReferences, "UNSUPPORTED_SECRET_SCHEME", 3);

const vaultPortableIds = "tools/validator/fixtures/invalid/vault-portable-ids/.lapp";
expectDiagnostic(vaultPortableIds, "INVALID_VAULT_SECRET", 4);
expectMessages(vaultPortableIds, [
  "vault provider id must not use a reserved Windows device basename",
  "vault provider id must not end with a dot",
  "vault credential id must not use a reserved Windows device basename",
  "vault credential id must not end with a dot",
]);

expectExit(["--help"], 0, "--help should succeed");
expectExit(["--help", "extra"], 2, "--help with extra arguments should be a usage error");
expectExit(["one", "two"], 2, "extra arguments should be a usage error");

console.log(`selftest: ok (${assertions} assertions)`);
