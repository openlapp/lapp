# LAPP Application Integration Guidance

## Read Order

1. Locate the LAPP root directory. If `LAPP_HOME` is set, use it first. Otherwise default to `~/.lapp`.
2. Scan `providers/*/provider.json`.
3. Skip providers with `enabled: false`.
4. Create usable provider entries for supported `protocols` values. If only legacy `protocol` exists, treat it as a one-item `protocols` list.
5. If `models.json` exists, load model lists and aliases.
6. If `global.json` exists, load default models.

## Minimal Implementation

A minimal implementation only needs:

- `provider.json`
- `id`
- `protocols` (and legacy `protocol`)
- `baseUrl`
- `auth.secret`
- plain secret strings and `env://`
- `models.json` for model discovery

`global.json`, `links`, and `requestHeaders` are enhanced behavior.

For a minimal useful profile, include `models.json` with at least one model entry. `global.json` is optional and only stores defaults; applications can still pick a model from `models.json` without it.

## LAPP_HOME

`LAPP_HOME` is an optional root-directory override:

```bash
LAPP_HOME=/path/to/.lapp
```

It points to the LAPP root, not to a provider directory. It is useful for CI, containers, workspaces, managed environments, and portable setups.

`LAPP_HOME` is not a security boundary. It should not be described as a way to hide secrets.

## URL Handling

Applications should normalize slashes when joining URLs. Whether `baseUrl` includes `/v1` depends on the provider documentation. Applications must not auto-append `/v1`.

## Model Aliases

Applications may let users select `aliases`, but requests to providers should use the model `id`. If `global.json` uses an alias, resolve it within the same provider.

## Unknown Fields

Applications should safely ignore unknown fields. LAPP is designed to be extensible without breaking older applications.

## Reference Validator

This repository includes a read-only reference validator:

```bash
node tools/validator/lapp-validate.mjs <path-to-.lapp>
```

Use it to check generated profiles, examples, and CI fixtures. It validates the directory shape, parses JSON/JSONC, checks required provider fields, verifies `global.json` provider references, reports model alias duplicates, and warns about common secret/header risks.

The validator is intentionally not a manager. It does not initialize profiles, edit files, save API keys, refresh model lists, call provider APIs, or implement fallback behavior.
