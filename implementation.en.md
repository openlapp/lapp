# LAPP Application Integration Guidance

## Read Order

1. Locate the LAPP root directory, defaulting to `~/.lapp`.
2. Scan `providers/*/provider.json`.
3. Skip providers with `enabled: false`.
4. Create usable provider entries for supported `protocol` values.
5. If `models.json` exists, load model lists and aliases.
6. If `global.json` exists, load default models.

## Minimal Implementation

A minimal implementation only needs:

- `provider.json`
- `id`
- `protocol`
- `baseUrl`
- `auth.secret`
- plain secret strings and `env://`

`models.json`, `global.json`, `links`, and `requestHeaders` are enhanced behavior.

## URL Handling

Applications should normalize slashes when joining URLs. Whether `baseUrl` includes `/v1` depends on the provider documentation. Applications must not auto-append `/v1`.

## Model Aliases

Applications may let users select `aliases`, but requests to providers should use the model `id`. If `global.json` uses an alias, resolve it within the same provider.

## Unknown Fields

Applications should safely ignore unknown fields. LAPP is designed to be extensible without breaking older applications.
