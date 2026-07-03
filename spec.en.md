# LAPP v1 Specification

LAPP stands for Local AI Provider Profiles. It defines a lightweight directory convention that lets applications discover AI providers already configured on the user's machine.

## Threat Model

LAPP is not a secret vault or a security sandbox. It standardizes provider profile discovery; it does not protect secrets from malware or untrusted local applications that can read the user's files.

If an application directly calls a provider API, it must eventually obtain usable credentials. Allowing an application to read a usable LAPP profile should therefore be treated as allowing that application to use the referenced provider credentials.

LAPP can reduce accidental secret sprawl by recommending `env://` and `keychain://` references, and by warning about plain secrets. It cannot make an untrusted local application both unable to read a key and still able to call a provider directly. That stronger model needs a trusted broker, local gateway, server-side proxy, OS permission system, or provider-issued scoped and short-lived credentials. Those are outside the LAPP v1 core.

## Root Directory

The default LAPP root is:

```text
~/.lapp
```

Applications may also support `LAPP_HOME` as a root-directory override:

```bash
LAPP_HOME=/path/to/.lapp
```

`LAPP_HOME` points to the LAPP root directory, not to a provider directory. If it is set, applications should read that location first. If it is not set, applications should fall back to `~/.lapp`.

`LAPP_HOME` is a location override, not a secrecy mechanism. It is useful for workspaces, CI, containers, portable setups, managed environments, and users who do not want to store profiles at the default path. It does not protect secrets from software that can read environment variables or local files.

LAPP v1 is mainly intended for personal local use and development environments. Production systems may reuse the LAPP profile shape, but should not treat local files as their credential boundary. Production deployments should use a secret manager, KMS, vault, workload identity, trusted broker, or server-side gateway for credential control.

## Directory Layout

```text
~/.lapp/
├── manifest.json
├── providers/
│   └── {providerId}/
│       ├── provider.json
│       └── models.json
└── global.json
```

- `providers/{providerId}/provider.json`: required provider configuration.
- `providers/{providerId}/models.json`: optional provider model list.
- `global.json`: optional global default models.
- `manifest.json`: optional root metadata.

## Core Protocol Values

LAPP v1 recommends support for:

- `openai-chat-completions`
- `openai-responses`
- `anthropic-messages`

Extended protocols may use custom strings, such as `gemini-generate-content`, `ollama`, or `minimax-api`. Applications should report unsupported protocols instead of crashing.

## provider.json

`provider.json` describes a provider. Minimal example:

```json
{
  "schemaVersion": "1.0",
  "id": "deepseek",
  "protocol": "openai-chat-completions",
  "baseUrl": "https://api.deepseek.com",
  "auth": {
    "secret": "env://DEEPSEEK_API_KEY"
  }
}
```

Fields:

- `schemaVersion`: recommended, currently `1.0`.
- `id`: required, should match the directory name.
- `name`: optional display name.
- `enabled`: optional, defaults to `true`.
- `protocol`: required adapter identifier.
- `baseUrl`: required provider API base URL. Applications must not auto-append `/v1`.
- `links`: optional homepage, console, docs, and API key links.
- `auth`: optional authentication configuration.
- `requestHeaders`: optional non-secret static request headers, such as a provider-required `User-Agent`.

`auth.secret` support levels:

- MUST: plain strings and `env://NAME`
- SHOULD: `keychain://namespace/item`
- MAY: `file://path`

`requestHeaders` must not be used for `Authorization` or API keys.

## models.json

`models.json` describes models under a provider. `id` is the real invocation name. `aliases` are local short names.

Model-level `source`:

- `provider`: from the provider model list. On refresh, applications may remove or disable models no longer returned remotely.
- `manual`: manually maintained by the user or application. Refreshes must not silently overwrite or delete it.

`type` is the model category. Common values include `chat`, `embedding`, `rerank`, `image-generation`, `image-edit`, `video-generation`, `audio-generation`, `speech-to-text`, and `text-to-speech`.

`inputModalities` and `outputModalities` describe input and output forms. Common values include `text`, `image`, `audio`, `video`, and `file`.

## global.json

`global.json` stores defaults applications can use when they do not have their own preference:

```json
{
  "schemaVersion": "1.0",
  "defaultModel": {
    "providerId": "deepseek",
    "model": "deepseek-v4-flash"
  }
}
```

`model` is always a string. LAPP does not parse `/` inside model IDs.
