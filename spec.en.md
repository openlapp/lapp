# LAPP v1 Specification

LAPP stands for Local AI Provider Profiles. It defines a lightweight directory convention that lets applications discover AI providers already configured on the user's machine.

## Threat Model

LAPP is not a secret vault or a security sandbox. It standardizes provider profile discovery; it does not protect secrets from malware or untrusted local applications capable of reading the user's files.

If an application directly calls a provider API, it must eventually obtain usable credentials. Allowing an application to read a usable LAPP profile should therefore be treated as granting that application permission to use the referenced provider credentials.

LAPP can reduce accidental secret sprawl by recommending `env://` and `keychain://` references, and by warning about plain secrets. It cannot make an untrusted local application unable to read a key while still allowing it to call a provider directly. That stronger model needs a trusted broker, local gateway, server-side proxy, OS permission system, or provider-issued scoped and short-lived credentials. Those are outside the LAPP v1 core.

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
- `providers/{providerId}/models.json`: provider model list; recommended for the minimal useful profile.
- `global.json`: optional global default models.
- `manifest.json`: optional root metadata.

## Core Protocol Values

LAPP v1 recommends support for:

- `openai-chat-completions`
- `openai-responses`
- `anthropic-messages`

Extended protocols may use custom strings, such as `gemini-generate-content`, `ollama`, or `minimax-api`. Applications should report unsupported protocols instead of crashing.

## provider.json

`provider.json` describes a provider. It supports `.json` or `.jsonc` (JSON with comments). Minimal example:

```json
{
  "schemaVersion": "1.0",
  "id": "deepseek",
  "baseUrl": "https://api.deepseek.com",
  "protocols": [
    "openai-chat-completions"
  ],
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
- `baseUrl`: required provider API base URL. Applications must not auto-append `/v1`.
- `protocols`: required list of protocol adapters supported by this provider. Order is meaningful: the first item is the preferred protocol when an application or gateway must choose a fallback target. Items may be protocol strings (the common form) or protocol objects.
- `links`: optional homepage, console, docs, and API key links.
- `auth`: optional authentication configuration.
- `requestHeaders`: optional non-secret static request headers, such as a provider-required `User-Agent`.

The common form uses plain strings:

```json
{
  "protocols": ["openai-chat-completions", "anthropic-messages"]
}
```

Use a protocol object only when that protocol needs its own settings, such as a protocol-specific base URL:

```json
{
  "protocols": [
    "openai-chat-completions",
    {
      "id": "anthropic-messages",
      "baseUrl": "https://api.example.com"
    }
  ]
}
```

Protocol object fields:

- `id`: required protocol identifier, such as `openai-chat-completions`, `openai-responses`, or `anthropic-messages`.
- `baseUrl`: optional protocol-specific API base URL. If omitted, the provider-level `baseUrl` applies.
- `requestHeaders`: optional, same rules as the provider-level field. Merges with (and overrides matching keys from) the provider-level `requestHeaders` for this protocol.

`auth` fields:

- `type`: optional. Common values include `bearer` (default), `api-key`, and `none`. Unknown values are passed through.
- `secret`: the credential. See support levels below.
- `header`: optional, the header name to carry the secret when `type` is not `bearer`. Defaults depend on the provider protocol.
- `queryParam`: optional, the query parameter name to carry the secret for providers that use query auth.

`auth.secret` support levels:

- MUST: plain strings and `env://NAME`
- SHOULD: `keychain://namespace/item`
- MAY: `file://path`

`requestHeaders` must not be used for `Authorization` or API keys.

## models.json

`models.json` describes models under a provider. It supports `.json` or `.jsonc`. A model entry has these fields:

- `id`: required, the real invocation name.
- `name`: optional display name.
- `aliases`: optional local short names. Applications may let users select an alias, but requests to the provider must use `id`.
- `source`: where the entry came from.
  - `provider`: from the provider model list. On refresh, applications may remove or disable models no longer returned remotely.
  - `manual`: manually maintained by the user or application. Refreshes must not silently overwrite or delete it.
- `type`: model category. Common values include `chat`, `embedding`, `rerank`, `image-generation`, `image-edit`, `video-generation`, `audio-generation`, `speech-to-text`, and `text-to-speech`.
- `inputModalities` and `outputModalities`: input and output forms. Common values include `text`, `image`, `audio`, `video`, and `file`.
- `capabilities`: optional ability tags. Common values include `chat`, `stream`, `reasoning`, `tool-call`, `vision`, `coding`, `embedding`, `text-to-speech`, `audio-generation`, and `video-generation`.
- `protocol`: optional, the provider protocol to use for this model. If omitted, applications should use the provider's preferred (first) protocol. When set, it must reference one of the provider's declared `protocols`.
- `contextWindow` and `maxOutputTokens`: optional integer limits.
- `enabled`: optional, defaults to `true`.
- `links` and `metadata`: optional reference links and free-form metadata.

## global.json

`global.json` stores defaults applications can use when they do not have their own preference. It is optional, supports `.json` or `.jsonc`, and does not replace `models.json`:

```json
{
  "schemaVersion": "1.0",
  "defaultModel": {
    "providerId": "deepseek",
    "model": "deepseek-v4-flash"
  },
  "defaultEmbeddingModel": {
    "providerId": "siliconflow",
    "model": "BAAI/bge-m3"
  },
  "defaultTextToSpeechModel": {
    "providerId": "minimax",
    "model": "speech-2.8-turbo"
  },
  "defaultVideoModel": {
    "providerId": "minimax",
    "model": "MiniMax-Hailuo-2.3"
  }
}
```

Recognized default keys are `defaultModel`, `defaultEmbeddingModel`, `defaultImageModel`, `defaultTextToSpeechModel`, and `defaultVideoModel`. All are optional. Each is a `{ providerId, model }` reference; `model` may match a model `id` or an alias within that provider.

`model` is always a string. LAPP does not parse `/` inside model IDs.

A profile without `global.json` is still valid. Applications can select from `models.json` or let the user choose a model.

## manifest.json

`manifest.json` is optional root metadata about the profile collection. It supports `.json` or `.jsonc`. Applications should treat it as informational only; it does not change provider discovery. Fields:

- `schemaVersion`: recommended, currently `1.0`.
- `name`: optional human-readable profile collection name.
- `createdAt` and `updatedAt`: optional timestamps (ISO 8601).
- `license`: optional license note for the profile collection.

A profile without `manifest.json` is still valid.
