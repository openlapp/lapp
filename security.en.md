# LAPP v1 Security Guidance

## Trust boundary

LAPP is a local registry with an optional device-backed Vault reference; it is not a security sandbox or a non-exportable credential system. An application that resolves a LAPP connection receives a usable provider credential and can call that provider directly. Granting an application access to a usable profile and credential therefore grants it permission to use that credential.

LAPP v1 assumes applications running as the same OS user are trusted. Device Vault can protect a credential at rest, but it does not defend against malware or a malicious same-user application that invokes a compatible resolver, reads the resolved process memory, or accesses the user's credential store.

If an application must call a model without seeing the provider key, direct upstream communication is impossible. That separate requirement needs an independently designed proxy or short-lived scoped credentials; it is not part of LAPP v1.

## Profile authority

A profile selects both a credential and its destination, so it is executable security-sensitive configuration. Applications should load only the user-selected root (`LAPP_HOME` or `~/.lapp`) and must not automatically activate profiles found in a project checkout, downloaded archive, or synchronized untrusted directory.

Before resolving a secret, validate the complete profile. Bind model discovery to the provider origin and reject redirects so a profile cannot send a credential to another host. For `vault://`, also require the stored provider ID, credential ID, origin, and auth shape to match the validated profile before returning the secret. Binding prevents a conforming client from accidentally sending a stored credential after profile tampering; it is not an authorization boundary against malicious local software.

## Secrets

LAPP v1 supports:

- `vault://<providerId>/<credentialId>` for a current-user device Vault record;
- `env://NAME` for an environment variable;
- an explicit plaintext secret.

Plaintext is valid for low-friction local use but should produce a warning. New tools that receive a raw credential should store it in Vault by default; plaintext storage must be an explicit choice. `env://` remains valid when deployment or user workflow already manages the environment. Public `file://`, `keychain://`, and custom schemes are invalid in v1; operating-system keychains and credential managers are Vault backend details, not profile syntax.

Vault is scoped to the current OS user and independent of `LAPP_HOME`, so compatible applications under that user share the same record. It provides encrypted-at-rest or OS-protected storage only. LAPP v1 does not provide per-application grants, a master password, cross-device synchronization, automatic migration, export prevention, backup, or recovery. An unavailable backend, missing record, invalid envelope, or binding mismatch must fail explicitly and must never fall back to another secret source.

Device replacement, operating-system account reset, credential-store reset, or lost OS account access can make Vault records unrecoverable. Deleting a profile or uninstalling an application does not automatically delete a shared Vault record; deleting a Vault record does not revoke a credential already copied or disclosed, so revoke or rotate it at the Provider when needed.

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

Avoid project-local `LAPP_HOME` values in untrusted repositories. `LAPP_HOME` changes profile location; it does not create isolation and does not namespace Vault records.

## Production

LAPP v1 targets personal local and development use. Production systems may reuse its data shape, but should use workload identity, a secret manager, KMS, scoped keys, rotation, and audit controls for the actual credential boundary.
