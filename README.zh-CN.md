<p align="center">
  <img src="./assets/lapp-logo-github-avatar.png" alt="LAPP logo" width="140" />
</p>

<h1 align="center">LAPP</h1>

<p align="center"><strong>Local AI Provider Profiles</strong></p>
<p align="center">供 AI 应用共享的一份本机 Provider Registry。</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./spec.zh-CN.md">规范</a> ·
  <a href="./USER_AGREEMENT.zh-CN.md">用户协议</a> ·
  <a href="./examples/zh-CN/full/.lapp">示例</a>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg" /></a>
  <img alt="Status: draft" src="https://img.shields.io/badge/status-draft-orange.svg" />
  <img alt="LAPP v1" src="https://img.shields.io/badge/LAPP-v1-blue.svg" />
</p>

---

LAPP 让 AI 应用复用当前用户已经配置过的 provider、模型、endpoint 和凭据。

```text
直接实现：应用 → LAPP 文件 → 上游 API
SDK：    应用 → LAPP SDK → 上游 API
CLI：   应用 → LAPP CLI JSON → 上游 API
```

LAPP 是文件约定，不运行服务，不代理请求，不转换协议，不管理计费，也不控制远程机器。

## 为什么

没有共同 Registry 时，每个 AI 应用都会要求用户重复输入 API key、base URL、模型 ID 和默认模型。LAPP 把这些信息放在一个可预测目录：

```text
~/.lapp/
```

应用可以支持 `LAPP_HOME`，为 CI、容器或受管环境显式覆盖根目录。

## LAPP v1

```text
~/.lapp/
├── providers/
│   └── deepseek/
│       ├── provider.json
│       └── models.json
└── global.json
```

LAPP v1 只使用标准 JSON。所有文件都包含 `"schemaVersion": "1.0"`。每个 provider 必须有 `provider.json` 和 `models.json`；`global.json` 可选。

`provider.json`：

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

`models.json`：

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

`global.json`：

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

## 合同

- `models.json` 是本地权威模型目录。
- 远端模型刷新只能显式执行，只追加，绝不删除或覆盖本地条目。
- Protocol 顺序就是偏好顺序，应用选择自己支持的第一项。
- 核心对话协议是 `openai-chat-completions`、`openai-responses` 和 `anthropic-messages`。
- Auth 是严格的 `none`、`bearer`、`header` 或 `query` 结构。
- v1 secret 只支持明文或 `env://NAME`；明文会产生警告。
- 只有连接或显式刷新时解析凭据，列出模型时不解析。
- 应用使用自己的 adapter 或可选 SDK client 直接调用上游。

完整规则见[中文规范](./spec.zh-CN.md)和[英文规范](./spec.en.md)。

## 安全边界

应用解析 LAPP 连接后会得到可用 provider 凭据，因此访问可用 profile 就等同于获得使用该凭据的权限。

Profile 同时选择凭据和目的地。只加载用户选择的 LAPP root；远端必须使用 HTTPS；模型发现必须同源；带认证请求拒绝重定向；绝不记录解析后的 secret。详见[安全建议](./security.zh-CN.md)。

## 示例与校验器

- [中文最小示例](./examples/zh-CN/minimal/.lapp)
- [中文完整示例](./examples/zh-CN/full/.lapp)
- [英文最小示例](./examples/en/minimal/.lapp)
- [英文完整示例](./examples/en/full/.lapp)

```bash
npm install
npm test
node tools/validator/lapp-validate.mjs examples/zh-CN/full/.lapp
```

Reference validator 先执行版本化 JSON Schema 校验，再执行跨文件和安全检查。它不会修改 profile，也不会调用 provider API。

## 文档

| 主题 | English | 中文 |
| --- | --- | --- |
| Specification / 规范 | [spec.en.md](./spec.en.md) | [spec.zh-CN.md](./spec.zh-CN.md) |
| Implementation / 实现 | [implementation.en.md](./implementation.en.md) | [implementation.zh-CN.md](./implementation.zh-CN.md) |
| Security / 安全 | [security.en.md](./security.en.md) | [security.zh-CN.md](./security.zh-CN.md) |
| 用户协议与风险披露 | [USER_AGREEMENT.en.md](./USER_AGREEMENT.en.md) | [USER_AGREEMENT.zh-CN.md](./USER_AGREEMENT.zh-CN.md) |
| 示例来源 | [references.en.md](./references.en.md) | [references.zh-CN.md](./references.zh-CN.md) |
| Schemas | [schema/](./schema/) | [schema/](./schema/) |
| Validator / 校验器 | [tools/validator/](./tools/validator/) | [tools/validator/](./tools/validator/) |

## 授权

规范、Schema、示例和 Logo 概念稿使用 [MIT License](./LICENSE)。
