# LAPP 应用接入建议

## 读取顺序

1. 定位 LAPP 根目录，默认是 `~/.lapp`。
2. 扫描 `providers/*/provider.json`。
3. 跳过 `enabled: false` 的供应商。
4. 对支持的 `protocol` 创建可用供应商条目。
5. 如果存在 `models.json`，加载模型清单和 alias。
6. 如果存在 `global.json`，读取默认模型。

## 最小实现

最小实现只需要支持：

- `provider.json`
- `id`
- `protocol`
- `baseUrl`
- `auth.secret`
- 明文 secret 和 `env://`

`models.json`、`global.json`、`links`、`requestHeaders` 都属于增强体验。

## URL 处理

应用应自行处理 URL 拼接中的斜杠。`baseUrl` 是否包含 `/v1` 取决于供应商文档，应用不得自动追加。

## 模型 alias

应用可以允许用户选择 `aliases`，但向供应商发请求时应使用模型 `id`。如果 `global.json` 中的 `model` 命中 alias，应用应解析为同 provider 下的真实 `id`。

## 未知字段

应用应安全忽略未知字段。LAPP 的目标是扩展友好，而不是让旧应用因为新字段失效。
