<p align="center">
  <img src="./assets/lapp-logo-github-avatar.png" alt="LAPP logo" width="140" />
</p>

<h1 align="center">LAPP</h1>

<p align="center">
  <strong>Local AI Provider Profiles</strong>
</p>

<p align="center">
  面向 AI 应用的轻量本机供应商配置规范。
</p>

<p align="center">
  <a href="./README.md">主 README</a>
  ·
  <a href="./README.en.md">English</a>
  ·
  <a href="./spec.zh-CN.md">规范</a>
  ·
  <a href="./examples/zh-CN/full/.lapp">示例</a>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg" /></a>
  <img alt="Status: draft" src="https://img.shields.io/badge/status-draft-orange.svg" />
  <img alt="LAPP v1" src="https://img.shields.io/badge/LAPP-v1-blue.svg" />
</p>

---

LAPP 是一套非常小的文件约定，用于在同一台机器上共享 AI 供应商配置。

不必让每个 AI 应用都重复配置 DeepSeek、Kimi、OpenAI、MiniMax、SiliconFlow、OpenRouter 和其他供应商，LAPP 给应用一个共同查找位置：

```text
~/.lapp/
```

LAPP **不是** 本地服务，不代理请求，不管理计费，不强制 fallback，也不试图成为另一个网关。它只描述用户已经拥有的供应商和模型。

默认根目录是 `~/.lapp`。应用可以支持 `LAPP_HOME` 作为根目录覆盖，用于工作区、CI、容器或受管环境。`LAPP_HOME` 是位置覆盖，不是保密机制。

## 为什么

AI 应用正在反复实现同一套供应商设置页：

- API key
- base URL
- 协议 adapter
- 模型 ID 和别名
- 默认模型
- 模型能力

LAPP 把这些共享 profile 数据放在一个可预测的本机目录里，让应用可以发现它，而不是反复要求用户输入。

## 最小形态

最小可用的 LAPP profile 只需要一个供应商：

```text
~/.lapp/
├── global.json
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

```json
{
  "schemaVersion": "1.0",
  "defaultModel": {
    "providerId": "deepseek",
    "model": "deepseek-v4-flash"
  }
}
```

一个最小 LAPP v1 应用只需要扫描：

```text
~/.lapp/providers/*/provider.json
```

并读取 `id`、`protocol`、`baseUrl` 和 `auth.secret`。

最小形态不要求 `models.json`。如果没有模型清单，应用仍然可以使用 `global.json` 中的默认模型，或让用户手动输入模型 ID。

## 目录结构

```text
~/.lapp/
├── manifest.json
├── providers/
│   └── {providerId}/
│       ├── provider.json
│       └── models.json
└── global.json
```

- `provider.json`：必需的供应商 profile
- `models.json`：可选的模型列表、别名和能力描述
- `global.json`：可选的默认对话、向量、语音和视频模型
- `manifest.json`：可选的根目录元信息

## 核心协议

LAPP v1 建议支持：

- `openai-chat-completions`
- `openai-responses`
- `anthropic-messages`

其他协议可以作为扩展字符串添加，例如 `gemini-generate-content`、`ollama` 或 `minimax-api`。

## 示例

- [最小示例](./examples/zh-CN/minimal/.lapp)
- [完整示例](./examples/zh-CN/full/.lapp)
- [英文最小示例](./examples/en/minimal/.lapp)
- [英文完整示例](./examples/en/full/.lapp)

完整示例包含：

- DeepSeek 作为默认对话模型
- SiliconFlow 作为向量模型
- MiniMax 作为语音合成和视频生成模型
- Kimi coding plan 风格的 `User-Agent` 请求头

## 参考校验器

本仓库包含一个只读参考校验器：

```bash
node tools/validator/lapp-validate.mjs examples/zh-CN/full/.lapp
```

校验器会检查目录结构、JSON/JSONC 解析、provider 必需字段、默认引用、模型别名和常见密钥/请求头风险。它不会修改 `.lapp` 文件，也不会调用供应商 API。

## 文档

| 主题 | English | 中文 |
| --- | --- | --- |
| Specification / 规范 | [spec.en.md](./spec.en.md) | [spec.zh-CN.md](./spec.zh-CN.md) |
| Implementation / 实现建议 | [implementation.en.md](./implementation.en.md) | [implementation.zh-CN.md](./implementation.zh-CN.md) |
| Security / 安全 | [security.en.md](./security.en.md) | [security.zh-CN.md](./security.zh-CN.md) |
| References / 参考 | [references.en.md](./references.en.md) | [references.zh-CN.md](./references.zh-CN.md) |
| Schemas | [schema/](./schema/) | [schema/](./schema/) |
| Validator / 校验器 | [tools/validator/](./tools/validator/) | [tools/validator/](./tools/validator/) |

## 授权

LAPP 规范、Schema、示例和 Logo 概念稿均使用 [MIT License](./LICENSE)。
