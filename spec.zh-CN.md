# LAPP v1 规范

LAPP 是 Local AI Provider Profiles 的缩写。它约定一个轻量目录结构，让应用发现用户本机已经配置过的 AI 供应商。

## 威胁模型

LAPP 不是密钥保险箱，也不是安全沙箱。它标准化的是供应商 profile 的发现方式；如果恶意软件或不可信应用已经能读取本机文件，LAPP 本身挡不住。

如果一个应用要直接调用供应商 API，它最终必须获得可用凭证。因此，允许一个应用读取可用的 LAPP profile，应被视为允许该应用使用其中引用的供应商凭证。

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
- `providers/{providerId}/models.json`：可选，供应商模型清单。
- `global.json`：可选，全局默认模型。
- `manifest.json`：可选，LAPP 根目录元信息。

## 核心协议值

LAPP v1 建议优先支持：

- `openai-chat-completions`
- `openai-responses`
- `anthropic-messages`

扩展协议可以使用自定义字符串，例如 `gemini-generate-content`、`ollama`、`minimax-api`。应用遇到未知协议时应提示不支持，而不是崩溃。

## provider.json

`provider.json` 描述供应商本身。最小示例：

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

字段说明：

- `schemaVersion`：建议提供，当前为 `1.0`。
- `id`：必需，建议与目录名一致。
- `name`：可选，展示名称。
- `enabled`：可选，缺省视为 `true`。
- `protocol`：必需，应用据此选择 adapter。
- `baseUrl`：必需，供应商 API 基础地址。应用不得自动追加 `/v1`。
- `links`：可选，官网、控制台、文档、API Key 链接。
- `auth`：可选，认证配置。
- `requestHeaders`：可选，非密钥静态请求头，例如特定供应商要求的 `User-Agent`。

`auth.secret` 支持：

- MUST：明文字符串、`env://NAME`
- SHOULD：`keychain://namespace/item`
- MAY：`file://path`

`requestHeaders` 不应用于保存 `Authorization` 或 API Key。

## models.json

`models.json` 描述供应商下的模型。`id` 是真实调用名，`aliases` 是本地短别名。

模型级 `source`：

- `provider`：来自供应商模型列表。刷新时如果远端不存在，应用可以移除或禁用。
- `manual`：用户或应用手动维护。刷新时不得静默覆盖或删除。

`type` 表示模型大类，常见值包括 `chat`、`embedding`、`rerank`、`image-generation`、`image-edit`、`video-generation`、`audio-generation`、`speech-to-text`、`text-to-speech`。

`inputModalities` 和 `outputModalities` 描述输入输出形态，常见值包括 `text`、`image`、`audio`、`video`、`file`。

## global.json

`global.json` 保存应用没有自己偏好时可参考的默认模型：

```json
{
  "schemaVersion": "1.0",
  "defaultModel": {
    "providerId": "deepseek",
    "model": "deepseek-v4-flash"
  }
}
```

`model` 永远是字符串。LAPP 不解析模型 ID 中的 `/`。
