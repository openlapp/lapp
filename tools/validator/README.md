# LAPP v1 Reference Validator

The reference validator is a read-only executable definition of the LAPP v1 acceptance rules. It never edits profiles, resolves environment secrets, or makes network requests.

## Usage

```bash
npm install
node tools/validator/lapp-validate.mjs <path-to-.lapp>
```

Without a path it checks `LAPP_HOME`, then `./.lapp`.

The validator:

1. parses standard JSON;
2. validates `provider.json`, `models.json`, and optional `global.json` with the versioned Ajv schemas;
3. checks directory identity, reserved IDs, URL and credential safety, model/alias uniqueness, protocol subsets, and canonical default references.

JSONC, `manifest.json`, legacy protocol fields, and unknown core properties are rejected.

## Output and exit codes

- `OK` and `INFO` describe accepted data.
- `WARN` reports a valid but risky choice, currently plaintext secrets.
- `ERROR` reports an invalid profile with a stable diagnostic code.

Exit codes are `0` for no errors, `1` for an invalid profile, and `2` for bad CLI usage or an unexpected validator failure.

## Self-test

```bash
npm test
```

The self-test requires every example and valid fixture to exit `0`, every invalid fixture to exit exactly `1`, and usage errors to exit `2`. A validator crash therefore cannot be mistaken for a successful validation test.
