# LAPP 安全建议

LAPP 不强制密钥保存方式，只约定应用如何理解 `auth.secret`。

## secret 形式

- 明文字符串：最容易使用，也最容易泄露。
- `env://NAME`：从环境变量读取，LAPP v1 应用必须支持。
- `keychain://namespace/item`：从系统钥匙串读取，推荐支持。
- `file://path`：从本地文件读取，可选支持。

## 同步建议

可以同步 `~/.lapp`，但不建议同步明文密钥。需要跨机器同步时，优先使用 `env://` 或 `keychain://`，让每台机器自己提供密钥。

## requestHeaders

`requestHeaders` 只用于非密钥静态请求头，例如 `User-Agent`。不要把 `Authorization`、API Key 或 Cookie 放进 `requestHeaders`。

## 明文密钥

LAPP 允许明文密钥是为了降低个人用户门槛。应用保存新配置时不应默认生成明文密钥，除非用户明确选择。
