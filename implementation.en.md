# LAPP Application Integration Guidance

This guide is for application authors. It describes how to read a LAPP profile at runtime and what to implement first. It stays short on purpose: the [specification](./spec.en.md) defines the field shape; this document defines the read order and minimum behavior.

## Read Order

1. Locate the LAPP root directory. If `LAPP_HOME` is set, use it first. Otherwise default to `~/.lapp`.
2. Read `manifest.json` if present; treat it as informational only.
3. Scan `providers/*/provider.json` (or `.jsonc`).
4. Skip providers with `enabled: false`.
5. Build the supported protocol set from `protocols`. Order is meaningful: the first entry is the preferred fallback protocol.
6. If `models.json` exists, load the model list, aliases, and capabilities. A model-level `protocol` must reference one of the provider's declared `protocols`; if omitted, use the preferred protocol.
7. If `global.json` exists, load default model references. Resolve `model` against the referenced provider's `id` or `aliases`.

## Minimal Implementation

A minimal implementation only needs:

- `provider.json` with `id`, `baseUrl`, `protocols`, and `auth.secret`
- plain secret strings and `env://`
- `models.json` for model discovery

`global.json`, `links`, `requestHeaders`, `auth.type`, and `manifest.json` are enhanced behavior. A minimal useful profile includes `models.json` with at least one model entry. `global.json` is optional and only stores defaults; applications can still pick a model from `models.json` without it.

## LAPP_HOME

`LAPP_HOME` is an optional root-directory override:

```bash
LAPP_HOME=/path/to/.lapp
```

It points to the LAPP root, not to a provider directory. It is useful for CI, containers, workspaces, managed environments, and portable setups.

`LAPP_HOME` is not a security boundary. It should not be described as a way to hide secrets. See [Security Guidance](./security.en.md).

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

Use it to check generated profiles, examples, and CI fixtures. It validates the directory shape, parses JSON/JSONC, checks required provider fields, verifies `protocols` entries and model-level `protocol` references, verifies `global.json` provider references, reports model alias duplicates, and warns about common secret/header risks.

The validator is intentionally not a manager. It does not initialize profiles, edit files, save API keys, refresh model lists, call provider APIs, or implement fallback behavior.
