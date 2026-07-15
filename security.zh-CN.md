# LAPP v1 安全建议

## 信任边界

LAPP 是本地 Registry，并提供可选的设备级 Vault 引用；它不是安全沙箱，也不是不可导出的凭据系统。应用解析 LAPP 连接后会得到可用的 provider 凭据，并直接调用该 provider。因此，允许应用访问可用 profile 和凭据，就等同于允许它使用该凭据。

LAPP v1 假定同一 OS 用户下运行的应用可信。设备 Vault 可以保护静态存储中的凭据，但不防御能够调用兼容 resolver、读取解析后进程内存或访问用户凭据存储的恶意软件与同用户恶意应用。

如果应用必须在看不到 provider key 的情况下调用模型，就不可能继续直连上游。这个独立需求需要单独设计的 proxy 或短期受限凭据，不属于 LAPP v1。

## Profile 权限

Profile 同时选择凭据和发送目的地，因此它是具有执行效果的安全敏感配置。应用只应加载用户选择的 root（`LAPP_HOME` 或 `~/.lapp`），不得自动启用项目目录、下载压缩包或不可信同步目录中发现的 profile。

解析 secret 前必须校验完整 profile。模型发现地址必须绑定 provider origin，并拒绝重定向，避免 profile 把凭据发送到另一台主机。对于 `vault://`，返回 secret 前还必须要求存储的 provider ID、credential ID、origin 和 auth shape 与已校验 profile 完全一致。绑定可以阻止合规客户端在 profile 被篡改后误送凭据，但不是对抗恶意本地软件的授权边界。

## Secret

LAPP v1 支持：

- `vault://<providerId>/<credentialId>` 当前用户设备 Vault 引用；
- `env://NAME` 环境变量引用；
- 用户明确配置的明文 secret。

明文适合低门槛本地使用，但应产生警告。新工具收到 raw credential 时应默认存入 Vault；写入明文必须由用户显式选择。已有部署或用户流程负责环境管理时，`env://` 仍然合法。公开的 `file://`、`keychain://` 和自定义 scheme 在 v1 中非法；操作系统 keychain 或 credential manager 是 Vault 后端实现细节，不是 profile 语法。

Vault 以当前 OS 用户为作用域且独立于 `LAPP_HOME`，因此该用户下的兼容应用共享同一记录。它只提供静态加密或 OS 保护存储。LAPP v1 不提供逐应用 grant、主密码、跨设备同步、自动迁移、阻止导出、备份或恢复。后端不可用、记录缺失、envelope 损坏或绑定不符时必须明确失败，绝不能回退到其他 secret 来源。

更换设备、重置 OS 账户、重置凭据存储或失去 OS 账户访问权，都可能使 Vault 记录无法恢复。删除 profile 或卸载应用不会自动删除共享 Vault 记录；删除 Vault 记录也不能撤回已经复制或泄露的凭据，必要时仍应在 Provider 侧撤销或轮换。

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

不要在不可信仓库中使用项目本地 `LAPP_HOME`。`LAPP_HOME` 只改变 profile 位置，不提供隔离，也不会给 Vault 记录增加命名空间。

## 生产环境

LAPP v1 面向个人本机和开发环境。生产系统可以复用数据形状，但实际凭据边界应使用 workload identity、secret manager、KMS、受限 key、轮换和审计。
