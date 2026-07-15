# LAPP v1 Application Integration

An application may implement LAPP directly, use an SDK, or call a CLI with stable JSON output. All three paths implement the same job: read a local provider registry, resolve a model and credential, then call the upstream API directly.

## Minimum read path

1. Resolve `LAPP_HOME`, otherwise use `~/.lapp`.
2. Scan directories directly under `providers/`.
3. Read exactly `provider.json` and `models.json` from each directory as UTF-8 JSON.
4. Validate each document against the LAPP 1.0 Schema.
5. Apply semantic checks: directory identity, URL safety, protocol subsets, model/alias uniqueness, and defaults.
6. Expose enabled local models without resolving credentials or accessing the network.
7. On model selection, resolve one canonical model, one supported protocol, and exactly one auth mechanism. Recognize plaintext, `env://`, and `vault://`; reject every other scheme.
8. Use the application's own upstream adapter to send the request directly.

Do not read JSONC, `manifest.json`, legacy `protocol`, or protocol objects. Do not guess `/v1`, model-list URLs, model capabilities, or auth behavior.

## Data boundaries

Keep raw input, validated data, and diagnostics separate:

```text
JSON bytes → schema validation → semantic validation → normalized profile
```

Only normalized profiles should reach request code. File paths and diagnostics are load metadata, not profile fields. Errors must identify a file and stable rule without including resolved secret values.

## Model listing and connection resolution

Model listing is a pure read of `models.json`. It should support filtering by provider and enabled state, but must not refresh remote data implicitly.

Connection resolution follows the normative algorithm in the specification. Alias input becomes a canonical model ID. Protocol selection is the first ordered candidate supported by the application. Missing credentials, disabled targets, ambiguity, no protocol intersection, an unavailable Vault backend, and a Vault binding mismatch are errors.

Resolve credentials just in time for an authenticated request or explicit refresh. Do not keep a resolved Vault value for a client object's lifetime: resolving again on the next operation makes rotation effective and narrows the lifetime of plaintext in memory. Recheck the final request origin against the validated provider and Vault binding immediately before sending.

## Credential storage

Use the exact secret-reference grammar in the specification. The profile stores only `vault://<providerId>/<credentialId>`; the OS credential facility stores the `VaultEnvelopeV1` value under service `dev.lapp.vault.v1` and account `<providerId>/<credentialId>`. Keep that backend adapter behind a credential-resolver interface so model listing and profile validation remain pure operations.

A high-level credential-creation API should store a supplied raw secret in Vault with credential ID `default` unless the caller explicitly requests plaintext or supplies an environment-variable name. A low-level profile editor may still accept any valid secret form without accessing the Vault. Never derive Vault binding metadata from caller-supplied fields separate from the final validated provider; derive provider ID, URL origin, and auth shape from that provider.

For a Vault read, parse and validate the stored JSON before using its secret. Require an exact provider ID, credential ID, origin, and normalized auth match. Do not automatically rebind a record after configuration changes, and never use a file, environment variable, plaintext value, or second credential as a fallback. A missing record is a runtime error and does not make model discovery or the profile itself invalid.

Credential implementations should expose stable, redacted failures. The official SDK and CLI use:

```text
INVALID_SECRET_REFERENCE
UNSUPPORTED_SECRET_SCHEME
ENV_SECRET_MISSING
VAULT_BACKEND_UNAVAILABLE
VAULT_CREDENTIAL_NOT_FOUND
VAULT_CREDENTIAL_EXISTS
VAULT_RECORD_INVALID
VAULT_BINDING_MISMATCH
VAULT_ACCESS_DENIED
VAULT_OPERATION_FAILED
CREDENTIAL_UPDATE_PARTIAL_FAILURE
```

Native causes, if retained internally, must first be sanitized and must not be serialized. Error objects, diagnostics, and output must not include native backend text, the resolved secret, or the stored envelope.

Credential-management tools should provide set, status, and delete operations without a routine get/export/rebind operation. Status may report scheme, availability, and binding state but not the value. Deleting a provider must not automatically delete its current-user shared Vault record.

## Explicit remote refresh

Only providers with `modelDiscovery` can refresh remotely. Use the configured URL exactly, require the same origin as `baseUrl`, reject redirects, validate the complete response, and return an in-memory proposal.

Apply uses append-only merge semantics: preserve existing entries and fields, append new IDs in sorted order, and never infer capabilities or remove models. A CLI should show the proposal before writing.

## Writes

Never turn an invalid ID into a filename. Resolve and check every target path against the root before writing or deleting. For a changed file, write a temporary sibling, flush it, and atomically rename it. Do not rewrite unchanged files.

When one high-level operation writes both a Vault record and a profile, validate the complete proposed profile first, preserve any prior Vault value, write the Vault, and then atomically write the profile. If the profile write fails, restore the prior Vault state. If restoration fails, return a distinct partial-failure error without exposing either secret. A dry run must not read or write the Vault.

LAPP v1 assumes one writer. Do not add a lock, daemon, database, secret file fallback, cache, migration layer, or profile-wide transaction until a real concurrency requirement exists.

## Conformance

Use the versioned schemas and the fixtures in this repository as the common contract. A conforming implementation must agree with the reference validator on fixture acceptance and rejection; it may add diagnostics but may not accept a profile the canonical validator rejects.

Run:

```bash
npm test
node tools/validator/lapp-validate.mjs examples/en/full/.lapp
```

## Distributing the user agreement

Installers and application packages that incorporate the LAPP user agreement
must ship both `USER_AGREEMENT.en.md` and `USER_AGREEMENT.zh-CN.md`.
Distribution alone is not proof of acceptance.

Before installation or first use, a GUI or native installer that relies on the
agreement should identify the Distributor and effective terms, show the key
credential, data-transfer, Provider-cost, AI-output, and tool-action risks,
offer the complete offline text, use an unselected affirmative consent control,
allow cancellation, and retain the accepted version and time where lawful.
Material changes should be presented again. A Distributor that processes
personal data must provide a separate privacy notice.

Library package managers should include the files in the installed artifact but
should not use a `postinstall` script to simulate consent. Every Distributor
must obtain legal review for its entity, jurisdiction, privacy practices, and
installer flow before treating the template as binding.
