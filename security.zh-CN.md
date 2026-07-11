# LAPP v1 安全建议

## 信任边界

LAPP 是本地 Registry，不是密钥保险箱或安全沙箱。应用解析 LAPP 连接后会得到可用的 provider 凭据，并直接调用该 provider。因此，允许应用访问可用 profile，就等同于允许它使用其中引用的凭据。

LAPP v1 假定同一 OS 用户下运行的应用可信，不防御能读取用户文件或环境变量的恶意软件和恶意本地应用。

如果应用必须在看不到 provider key 的情况下调用模型，就不可能继续直连上游。这个独立需求需要单独设计的 proxy 或短期受限凭据，不属于 LAPP v1。

## Profile 权限

Profile 同时选择凭据和发送目的地，因此它是具有执行效果的安全敏感配置。应用只应加载用户选择的 root（`LAPP_HOME` 或 `~/.lapp`），不得自动启用项目目录、下载压缩包或不可信同步目录中发现的 profile。

解析 secret 前必须校验完整 profile。模型发现地址必须绑定 provider origin，并拒绝重定向，避免 profile 把凭据发送到另一台主机。

## Secret

LAPP v1 支持：

- `env://NAME` 环境变量引用；
- 用户明确配置的明文 secret。

明文适合低门槛本地使用，但应产生警告；新工具应优先使用 `env://`。LAPP v1 刻意不定义 `file://`、`keychain://`、加密存储、secret 迁移或 secret 同步。

解析后的 secret 绝不能进入 diagnostics、日志、模型目录、缓存、异常或 debug 输出。脱敏应比较真实解析值，不能只依赖一份固定的常见 header 名单。

## 传输与 Headers

- 远端 provider 必须使用 HTTPS，只有 loopback 可以使用 HTTP。
- 拒绝 URL 中的用户名、密码和 fragment。
- `modelDiscovery.url` 必须与 `baseUrl` 完全同源。
- 带认证请求必须拒绝重定向。
- Header value 不能含 CR/LF。
- 所有携带凭据的 header 和 query 参数只能放在 `auth`，不能放在 `requestHeaders`。
- 发送前移除 `requestHeaders` 中与所选 auth header 大小写不敏感冲突的项，确保只传输一个凭据值。
- Origin 变化时绝不能继续携带认证。

## 文件系统

Provider ID 是不可信输入。必须拒绝非法或保留 ID，不能清洗后继续。每次写入和删除前，都要解析最终路径并确认它仍在选定的 LAPP root 内。平台支持时，应使用仅当前用户可读的权限。

不要在不可信仓库中使用项目本地 `LAPP_HOME`。`LAPP_HOME` 只改变位置，不提供隔离。

## 生产环境

LAPP v1 面向个人本机和开发环境。生产系统可以复用数据形状，但实际凭据边界应使用 workload identity、secret manager、KMS、受限 key、轮换和审计。
