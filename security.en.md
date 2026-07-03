# LAPP Security Guidance

LAPP does not mandate how secrets are stored. It only defines how applications interpret `auth.secret`.

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
