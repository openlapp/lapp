<p align="center">
  <img src="./assets/lapp-logo-github-avatar.png" alt="LAPP logo" width="140" />
</p>

<h1 align="center">LAPP</h1>

<p align="center"><strong>Local AI Provider Profiles</strong></p>
<p align="center">One local provider registry for AI applications.</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="./README.en.md">English</a> ·
  <a href="./spec.en.md">Specification</a> ·
  <a href="./USER_AGREEMENT.en.md">User Agreement</a> ·
  <a href="./examples/en/full/.lapp">Example</a>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg" /></a>
  <img alt="Status: draft" src="https://img.shields.io/badge/status-draft-orange.svg" />
  <img alt="LAPP v1" src="https://img.shields.io/badge/LAPP-v1-blue.svg" />
</p>

---

LAPP lets AI applications reuse the providers, models, endpoints, and credentials already configured for the current user.

```text
Direct:  application → LAPP files → upstream API
SDK:     application → LAPP SDK → upstream API
CLI:     application → LAPP CLI JSON → upstream API
```

LAPP is a file convention. It does not run a service, proxy requests, translate protocols, manage billing, or control remote machines.

## Why

Without a shared registry, every AI application asks the user to enter the same API keys, base URLs, model IDs, and defaults again. LAPP puts that information in one predictable directory:

```text
~/.lapp/
```

Applications may support `LAPP_HOME` as an explicit root override for CI, containers, or managed environments.

## LAPP v1

```text
~/.lapp/
├── providers/
│   └── deepseek/
│       ├── provider.json
│       └── models.json
└── global.json
```

LAPP v1 uses standard JSON only. Every file has `"schemaVersion": "1.0"`. `provider.json` and `models.json` are required for each provider; `global.json` is optional.

`provider.json`:

```json
{
  "schemaVersion": "1.0",
  "id": "deepseek",
  "baseUrl": "https://api.deepseek.com",
  "protocols": ["openai-chat-completions"],
  "auth": {
    "type": "bearer",
    "secret": "env://DEEPSEEK_API_KEY"
  }
}
```

`models.json`:

```json
{
  "schemaVersion": "1.0",
  "models": [
    {
      "id": "deepseek-v4-flash",
      "name": "DeepSeek V4 Flash",
      "type": "chat",
      "capabilities": ["chat", "stream"]
    }
  ]
}
```

`global.json`:

```json
{
  "schemaVersion": "1.0",
  "defaults": {
    "chat": {
      "providerId": "deepseek",
      "modelId": "deepseek-v4-flash"
    }
  }
}
```

## Contract

- `models.json` is the local authoritative model catalog.
- Remote model refresh is explicit, append-only, and never deletes or overwrites local entries.
- Protocol order is preference order; an application selects the first protocol it supports.
- Core chat protocol IDs are `openai-chat-completions`, `openai-responses`, and `anthropic-messages`.
- Authentication is a strict `none`, `bearer`, `header`, or `query` shape.
- v1 secrets are plaintext or `env://NAME`; plaintext produces a warning.
- Credentials are resolved only when connecting or explicitly refreshing, never when listing models.
- Applications call upstream providers directly using their own adapter or the optional SDK client.

See the [English specification](./spec.en.md) or [Chinese specification](./spec.zh-CN.md) for the complete rules.

## Security boundary

An application that resolves a LAPP connection receives a usable provider credential. Access to a usable profile must therefore be treated as permission to use that credential.

Profiles select both credentials and destinations. Load only a user-selected LAPP root, require HTTPS except for loopback, keep model discovery on the provider origin, reject authenticated redirects, and never log resolved secrets. See [Security Guidance](./security.en.md).

## Examples and validator

- [Minimal English example](./examples/en/minimal/.lapp)
- [Full English example](./examples/en/full/.lapp)
- [中文最小示例](./examples/zh-CN/minimal/.lapp)
- [中文完整示例](./examples/zh-CN/full/.lapp)

```bash
npm install
npm test
node tools/validator/lapp-validate.mjs examples/en/full/.lapp
```

The reference validator performs versioned JSON Schema validation followed by cross-file and security checks. It never modifies a profile or calls a provider API.

## Documentation

| Topic | English | Chinese |
| --- | --- | --- |
| Specification | [spec.en.md](./spec.en.md) | [spec.zh-CN.md](./spec.zh-CN.md) |
| Implementation | [implementation.en.md](./implementation.en.md) | [implementation.zh-CN.md](./implementation.zh-CN.md) |
| Security | [security.en.md](./security.en.md) | [security.zh-CN.md](./security.zh-CN.md) |
| User agreement and risk disclosure | [USER_AGREEMENT.en.md](./USER_AGREEMENT.en.md) | [USER_AGREEMENT.zh-CN.md](./USER_AGREEMENT.zh-CN.md) |
| Example sources | [references.en.md](./references.en.md) | [references.zh-CN.md](./references.zh-CN.md) |
| Schemas | [schema/](./schema/) | [schema/](./schema/) |
| Validator | [tools/validator/](./tools/validator/) | [tools/validator/](./tools/validator/) |

## License

The specification, schemas, examples, and logo concept are licensed under the [MIT License](./LICENSE).
