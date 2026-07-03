<p align="center">
  <img src="./assets/lapp-logo-github-avatar.png" alt="LAPP logo" width="140" />
</p>

<h1 align="center">LAPP</h1>

<p align="center">
  <strong>Local AI Provider Profiles</strong>
</p>

<p align="center">
  A lightweight local provider-profile convention for AI applications.
</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a>
  ·
  <a href="./README.en.md">English</a>
  ·
  <a href="./spec.en.md">Specification</a>
  ·
  <a href="./examples/en/full/.lapp">Example</a>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg" /></a>
  <img alt="Status: draft" src="https://img.shields.io/badge/status-draft-orange.svg" />
  <img alt="LAPP v1" src="https://img.shields.io/badge/LAPP-v1-blue.svg" />
</p>

---

LAPP is a tiny file-based convention for sharing AI provider configuration on one machine.

Instead of asking every AI app to configure DeepSeek, Kimi, OpenAI, MiniMax, SiliconFlow, OpenRouter, and other providers again and again, LAPP gives applications a common place to look:

```text
~/.lapp/
```

LAPP does **not** run a local service, proxy requests, manage billing, enforce fallback, or become another gateway. It only describes what providers and models the user already has.

## Why

AI applications keep reimplementing the same provider settings page:

- API keys
- base URLs
- protocol adapters
- model IDs and aliases
- default models
- model capabilities

LAPP keeps that shared profile data in a predictable local directory so applications can discover it instead of asking users to type it again.

## Minimal Shape

The smallest useful LAPP profile is just one provider:

```text
~/.lapp/
└── providers/
    └── deepseek/
        └── provider.json
```

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

A minimal LAPP v1 application only needs to scan:

```text
~/.lapp/providers/*/provider.json
```

and read `id`, `protocol`, `baseUrl`, and `auth.secret`.

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

- `provider.json`: required provider profile
- `models.json`: optional model list, aliases, and capabilities
- `global.json`: optional default chat, embedding, speech, and video models
- `manifest.json`: optional root metadata

## Core Protocols

LAPP v1 recommends support for:

- `openai-chat-completions`
- `openai-responses`
- `anthropic-messages`

Other protocols can be added as extension strings, such as `gemini-generate-content`, `ollama`, or `minimax-api`.

## Examples

- [Minimal example](./examples/en/minimal/.lapp)
- [Full example](./examples/en/full/.lapp)
- [中文最小示例](./examples/zh-CN/minimal/.lapp)
- [中文完整示例](./examples/zh-CN/full/.lapp)

The full example includes:

- DeepSeek for default chat
- SiliconFlow for embeddings
- MiniMax for text-to-speech and video generation
- Kimi coding-plan style `User-Agent` headers

## Documentation

| Topic | English | Chinese |
| --- | --- | --- |
| Specification | [spec.en.md](./spec.en.md) | [spec.zh-CN.md](./spec.zh-CN.md) |
| Implementation | [implementation.en.md](./implementation.en.md) | [implementation.zh-CN.md](./implementation.zh-CN.md) |
| Security | [security.en.md](./security.en.md) | [security.zh-CN.md](./security.zh-CN.md) |
| References | [references.en.md](./references.en.md) | [references.zh-CN.md](./references.zh-CN.md) |
| Schemas | [schema/](./schema/) | [schema/](./schema/) |

## License

The LAPP specification, schemas, examples, and logo concept are licensed under the [MIT License](./LICENSE).
