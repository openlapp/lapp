# LAPP v1 Application Integration

An application may implement LAPP directly, use an SDK, or call a CLI with stable JSON output. All three paths implement the same job: read a local provider registry, resolve a model and credential, then call the upstream API directly.

## Minimum read path

1. Resolve `LAPP_HOME`, otherwise use `~/.lapp`.
2. Scan directories directly under `providers/`.
3. Read exactly `provider.json` and `models.json` from each directory as UTF-8 JSON.
4. Validate each document against the LAPP 1.0 Schema.
5. Apply semantic checks: directory identity, URL safety, protocol subsets, model/alias uniqueness, and defaults.
6. Expose enabled local models without resolving credentials or accessing the network.
7. On model selection, resolve one canonical model, one supported protocol, and exactly one auth mechanism.
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

Connection resolution follows the normative algorithm in the specification. Alias input becomes a canonical model ID. Protocol selection is the first ordered candidate supported by the application. Missing credentials, disabled targets, ambiguity, and no protocol intersection are errors.

## Explicit remote refresh

Only providers with `modelDiscovery` can refresh remotely. Use the configured URL exactly, require the same origin as `baseUrl`, reject redirects, validate the complete response, and return an in-memory proposal.

Apply uses append-only merge semantics: preserve existing entries and fields, append new IDs in sorted order, and never infer capabilities or remove models. A CLI should show the proposal before writing.

## Writes

Never turn an invalid ID into a filename. Resolve and check every target path against the root before writing or deleting. For a changed file, write a temporary sibling, flush it, and atomically rename it. Do not rewrite unchanged files.

LAPP v1 assumes one writer. Do not add a lock, daemon, database, cache, migration layer, or profile-wide transaction until a real concurrency requirement exists.

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
