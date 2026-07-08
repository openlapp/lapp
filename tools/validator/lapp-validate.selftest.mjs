import { execFileSync } from "node:child_process";
import assert from "node:assert";

const V = "tools/validator/lapp-validate.mjs";

function run(target) {
  try {
    execFileSync(process.execPath, [V, target], { encoding: "utf8" });
    return 0;
  } catch (error) {
    return error.status ?? 2; // child exits with code on nonzero exit
  }
}

// Valid examples clean up to exit 0.
const valid = [
  "examples/en/minimal/.lapp",
  "examples/zh-CN/minimal/.lapp",
];
for (const v of valid) assert.equal(run(v), 0, `${v} should pass (exit 0)`);

assert.notEqual(run("examples/en/full/.lapp"), 1, "full example should be WARN-only, not ERROR");

// Invalid fixtures all exit 1.
const invalid = [
  "tools/validator/fixtures/invalid/bad-global-reference/.lapp",
  "tools/validator/fixtures/invalid/bad-jsonc/.lapp",
  "tools/validator/fixtures/invalid/missing-base-url/.lapp",
  "tools/validator/fixtures/invalid/bad-model-protocol/.lapp",
];
for (const f of invalid) assert.equal(run(f), 1, `${f} should fail (exit 1)`);

// missing providers dir is also a failure.
assert.equal(run("tools/validator/fixtures/invalid/missing-providers/.lapp"), 1);

console.log("selftest: ok (11 assertions)");
