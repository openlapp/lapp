# LAPP Reference Validator

This is a read-only reference validator for LAPP directories. It never edits `.lapp` files, never writes secrets, and never makes network requests.

The validator can warn about plain secrets and sensitive headers, but it is not a secret vault or sandbox. It does not protect credentials from malware or untrusted local applications with filesystem access.

## Usage

```bash
node tools/validator/lapp-validate.mjs <path-to-.lapp>
```

If no path is provided, the validator checks `LAPP_HOME` first, then `./.lapp`.

Examples:

```bash
node tools/validator/lapp-validate.mjs examples/en/minimal/.lapp
node tools/validator/lapp-validate.mjs examples/en/full/.lapp
```

## Output Levels

- `OK`: a file or section was parsed successfully.
- `INFO`: summary information.
- `WARN`: valid enough to read, but risky or non-ideal.
- `ERROR`: invalid structure or broken references.

## Exit Codes

- `0`: no `ERROR`
- `1`: one or more validation `ERROR`
- `2`: validator usage error or unexpected failure

## Scope

The validator checks directory shape, JSON/JSONC parsing, required provider fields, `protocols` entries, model-level `protocol` references, global provider references, common security footguns, and basic model alias consistency.

It does not:

- modify files
- initialize profiles
- save API keys
- refresh provider model lists
- call provider APIs
- manage fallback or routing behavior

## Self-test

A tiny self-test runs the validator over the examples and the invalid fixtures and asserts the exit codes:

```bash
node tools/validator/lapp-validate.selftest.mjs
```
