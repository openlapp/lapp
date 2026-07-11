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
    execFileSync(process.execPath, [VALIDATOR, ...args], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
    return 0;
  } catch (error) {
    return error.status ?? 2;
  }
}

function expectExit(args, expected, message) {
  assertions += 1;
  assert.equal(run(args), expected, message);
}

const valid = [
  "examples/en/minimal/.lapp",
  "examples/en/full/.lapp",
  "examples/zh-CN/minimal/.lapp",
  "examples/zh-CN/full/.lapp",
  "tools/validator/fixtures/valid/auth-forms/.lapp",
];
for (const target of valid) expectExit([target], 0, `${target} should pass`);

const invalidRoot = path.join(ROOT, "tools/validator/fixtures/invalid");
const invalid = fs.readdirSync(invalidRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `tools/validator/fixtures/invalid/${entry.name}/.lapp`)
  .sort();
for (const target of invalid) expectExit([target], 1, `${target} should fail validation without crashing`);

expectExit(["--help"], 0, "--help should succeed");
expectExit(["--help", "extra"], 2, "--help with extra arguments should be a usage error");
expectExit(["one", "two"], 2, "extra arguments should be a usage error");

console.log(`selftest: ok (${assertions} assertions)`);
