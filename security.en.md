# LAPP v1 Security Guidance

## Trust boundary

LAPP is a local registry, not a secret vault or sandbox. An application that resolves a LAPP connection receives a usable provider credential and can call that provider directly. Granting an application access to a usable profile therefore grants it permission to use the referenced credential.

LAPP v1 assumes applications running as the same OS user are trusted. It does not defend against malware or a malicious local application that can read the user's files or environment.

If an application must call a model without seeing the provider key, direct upstream communication is impossible. That separate requirement needs an independently designed proxy or short-lived scoped credentials; it is not part of LAPP v1.

## Profile authority

A profile selects both a credential and its destination, so it is executable security-sensitive configuration. Applications should load only the user-selected root (`LAPP_HOME` or `~/.lapp`) and must not automatically activate profiles found in a project checkout, downloaded archive, or synchronized untrusted directory.

Before resolving a secret, validate the complete profile. Bind model discovery to the provider origin and reject redirects so a profile cannot send a credential to another host.

## Secrets

LAPP v1 supports:

- `env://NAME` for an environment variable;
- an explicit plaintext secret.

Plaintext is valid for low-friction local use but should produce a warning. New tools should prefer `env://`. LAPP v1 deliberately does not define `file://`, `keychain://`, encrypted storage, secret migration, or secret synchronization.

Never include a resolved secret in diagnostics, logs, model catalogs, caches, exceptions, or debug output. Redaction should compare against actual resolved values rather than only a fixed list of common header names.

## Transport and headers

- Require HTTPS for remote providers; allow HTTP only on loopback.
- Reject URL credentials and fragments.
- Require `modelDiscovery.url` to share the exact origin of `baseUrl`.
- Reject redirects on authenticated requests.
- Reject CR/LF in header values.
- Keep all credential-bearing headers and query parameters in `auth`, never `requestHeaders`.
- Remove any case-insensitive `requestHeaders` collision with the selected auth header before sending, so exactly one credential value is transmitted.
- Do not forward auth across an origin change.

## Filesystem

Provider IDs are untrusted input. Reject invalid or reserved IDs instead of sanitizing them. Before every write or delete, resolve the final path and verify that it remains under the selected LAPP root. Use restrictive user-only permissions where the platform supports them.

Avoid project-local `LAPP_HOME` values in untrusted repositories. `LAPP_HOME` changes location; it does not create isolation.

## Production

LAPP v1 targets personal local and development use. Production systems may reuse its data shape, but should use workload identity, a secret manager, KMS, scoped keys, rotation, and audit controls for the actual credential boundary.
