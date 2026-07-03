# LAPP Security Guidance

LAPP does not mandate how secrets are stored. It only defines how applications interpret `auth.secret`.

## Security Boundary

LAPP is not a secret vault. Standardizing `~/.lapp` makes profiles easier for applications to discover, and it also makes them easier for malware to look for. This is the same class of risk as `.env`, cloud credentials, SSH keys, npm tokens, and other developer-machine secrets.

LAPP does not protect secrets from malware or untrusted local applications with filesystem access. If a malicious program can read `~/.lapp`, it may also be able to read other local credentials.

If an application directly calls a provider API, it must eventually obtain usable credentials. Users should treat access to a usable LAPP profile as permission for that application to use the referenced provider credentials.

To prevent an application from ever seeing the provider key while still allowing model calls, the key must live behind a trusted broker, local gateway, server-side proxy, OS permission system, or short-lived scoped credential flow. That is outside LAPP v1.

## Secret Forms

- Plain string: easiest to use, easiest to leak.
- `env://NAME`: read from an environment variable. LAPP v1 applications must support it.
- `keychain://namespace/item`: read from the system keychain. Recommended.
- `file://path`: read from a local file. Optional.

## Sync Guidance

You may sync `~/.lapp`, but syncing plain secrets is not recommended. For cross-machine sync, prefer `env://` or `keychain://` so each machine supplies its own secret.

## requestHeaders

`requestHeaders` is only for non-secret static headers, such as `User-Agent`. Do not put `Authorization`, API keys, or cookies in `requestHeaders`.

## Plain Secrets

LAPP allows plain secrets to reduce friction for personal users. Applications should not save new configurations as plain secrets by default unless the user explicitly chooses it.

Reference validators and tools should warn when they detect plain secrets or sensitive request headers, but warnings are not isolation. They reduce accidental leaks; they do not defend a compromised machine.
