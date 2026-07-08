# LAPP v1 规范

LAPP 是 Local AI Provider Profiles 的缩写。它约定一个轻量目录结构，让应用发现用户本机已经配置过的 AI 供应商。

## 威胁模型

LAPP 不是密钥保险箱，也不是安全沙箱。它标准化的是供应商 profile 的发现方式；如果恶意软件或不可信应用已经能读取本机文件，LAPP 本身挡不住。

如果一个应用要直接调用供应商 API，它最终必须拿到可用凭证。因此，允许一个应用读取可用的 LAPP profile，就应视为允许该应用使用其中引用的供应商凭证。

LAPP 可以通过推荐 `env://` 和 `keychain://`、提示明文 secret 风险，减少意外泄露和密钥散落。但它不能让一个不可信本地应用“既拿不到 key，又能直接调用供应商”。要做到这一点，需要可信 broker、本地网关、服务端代理、操作系统权限系统，或供应商签发的受限短期凭证。这些都不属于 LAPP v1 核心。

## 根目录

LAPP 默认根目录是：

```text
~/.lapp
```

应用也可以支持 `LAPP_HOME` 作为根目录覆盖：

```bash
LAPP_HOME=/path/to/.lapp
```

`LAPP_HOME` 指向 LAPP 根目录，不是某个 provider 目录。设置了 `LAPP_HOME` 时，应用应优先读取该位置；没有设置时，再回退到 `~/.lapp`。

`LAPP_HOME` 是位置覆盖，不是保密机制。它适合工作区、CI、容器、便携配置、受管环境，或不想使用默认路径的用户。它不能防止能读取环境变量或本机文件的软件找到配置。

LAPP v1 主要面向个人本机和开发环境。生产系统可以复用 LAPP 的 profile 形状，但不应把本地文件当作凭证安全边界。生产部署应使用 secret manager、KMS、vault、workload identity、可信 broker 或服务端网关来管理凭证。

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

- `providers/{providerId}/provider.json`：必需，供应商基础配置。
- `providers/{providerId}/models.json`：供应商模型清单；最小可用 profile 建议包含。
- `global.json`：可选，全局默认模型。
- `manifest.json`：可选，LAPP 根目录元信息。

## 核心协议值

LAPP v1 建议优先支持：

- `openai-chat-completions`
- `openai-responses`
- `anthropic-messages`

扩展协议可以使用自定义字符串，例如 `gemini-generate-content`、`ollama`、`minimax-api`。应用遇到未知协议时应提示不支持，而不是崩溃。

## provider.json

`provider.json` 描述供应商本身。支持 `.json` 或 `.jsonc`（带注释的 JSON）。最小示例：

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

字段说明：

- `schemaVersion`：建议提供，当前为 `1.0`。
- `id`：必需，建议与目录名一致。
- `name`：可选，展示名称。
- `enabled`：可选，缺省视为 `true`。
- `baseUrl`：必需，供应商 API 基础地址。应用不得自动追加 `/v1`。
- `protocols`：必需，供应商支持的协议 adapter 列表。顺序有意义：当应用或网关需要选择 fallback 目标协议时，第一个协议是首选协议。条目可以是协议字符串（常规形态），也可以是协议对象。
- `links`：可选，官网、控制台、文档、API Key 链接。
- `auth`：可选，认证配置。
- `requestHeaders`：可选，非密钥静态请求头，例如特定供应商要求的 `User-Agent`。

常规形态直接使用字符串：

```json
{
  "protocols": ["openai-chat-completions", "anthropic-messages"]
}
```

只有某个协议需要自己的设置（如该协议专用的基础地址）时，才使用协议对象：

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

协议对象字段：

- `id`：必需，协议标识，例如 `openai-chat-completions`、`openai-responses` 或 `anthropic-messages`。
- `baseUrl`：可选，该协议专用的 API 基础地址。未提供时使用 provider 级 `baseUrl`。
- `requestHeaders`：可选，规则同 provider 级字段。在该协议下与 provider 级 `requestHeaders` 合并，同名键以协议级为准。

`auth` 字段：

- `type`：可选，常见值包括 `bearer`（缺省）、`api-key`、`none`。未知值原样透传。
- `secret`：凭证，支持级别见下文。
- `header`：可选，当 `type` 不是 `bearer` 时携带密钥的请求头名，缺省值取决于供应商协议。
- `queryParam`：可选，使用 query 鉴权的供应商所用的查询参数名。

`auth.secret` 支持：

- MUST：明文字符串、`env://NAME`
- SHOULD：`keychain://namespace/item`
- MAY：`file://path`

`requestHeaders` 不应用于保存 `Authorization` 或 API Key。

## models.json

`models.json` 描述供应商下的模型，支持 `.json` 或 `.jsonc`。一个模型条目包含这些字段：

- `id`：必需，真实调用名。
- `name`：可选，展示名称。
- `aliases`：可选，本地短别名。应用可以允许用户选择 alias，但向供应商发请求时必须使用 `id`。
- `source`：条目来源。
  - `provider`：来自供应商模型列表。刷新时如果远端不存在，应用可以移除或禁用。
  - `manual`：用户或应用手动维护。刷新时不得静默覆盖或删除。
- `type`：模型大类，常见值包括 `chat`、`embedding`、`rerank`、`image-generation`、`image-edit`、`video-generation`、`audio-generation`、`speech-to-text`、`text-to-speech`。
- `inputModalities` 和 `outputModalities`：输入输出形态，常见值包括 `text`、`image`、`audio`、`video`、`file`。
- `capabilities`：可选能力标签，常见值包括 `chat`、`stream`、`reasoning`、`tool-call`、`vision`、`coding`、`embedding`、`text-to-speech`、`audio-generation`、`video-generation`。
- `protocol`：可选，调用该模型时使用的供应商协议。未提供时应用应使用供应商首选（第一个）协议。提供时必须引用该供应商 `protocols` 中已声明的协议之一。
- `contextWindow` 和 `maxOutputTokens`：可选整数限制。
- `enabled`：可选，缺省视为 `true`。
- `links` 和 `metadata`：可选参考链接和自由元数据。

## global.json

`global.json` 保存应用没有自己偏好时可参考的默认模型。它是可选文件，支持 `.json` 或 `.jsonc`，不能替代 `models.json`：

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

可识别的默认键为 `defaultModel`、`defaultEmbeddingModel`、`defaultImageModel`、`defaultTextToSpeechModel` 和 `defaultVideoModel`，均为可选。每个键是 `{ providerId, model }` 引用；`model` 可以命中该供应商下某个模型的 `id` 或 alias。

`model` 永远是字符串。LAPP 不解析模型 ID 中的 `/`。

没有 `global.json` 的 profile 仍然合法。应用可以从 `models.json` 中选择模型，或让用户自己选择。

## manifest.json

`manifest.json` 是可选的根目录元信息，描述整份 profile 集合，支持 `.json` 或 `.jsonc`。应用应仅将其视为信息性内容，不影响供应商发现。字段：

- `schemaVersion`：建议提供，当前为 `1.0`。
- `name`：可选，profile 集合的可读名称。
- `createdAt` 和 `updatedAt`：可选时间戳（ISO 8601）。
- `license`：可选，profile 集合的授权说明。

没有 `manifest.json` 的 profile 仍然合法。
