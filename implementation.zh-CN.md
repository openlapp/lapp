# LAPP v1 应用接入

应用可以直接实现 LAPP、调用 SDK，或调用提供稳定 JSON 输出的 CLI。三种方式完成同一件事：读取本地 Provider Registry，解析模型和凭据，然后由应用直接调用上游 API。

## 最小读取流程

1. 优先解析 `LAPP_HOME`，否则使用 `~/.lapp`。
2. 扫描 `providers/` 的直接子目录。
3. 从每个目录精确读取 UTF-8 JSON 格式的 `provider.json` 和 `models.json`。
4. 使用 LAPP 1.0 Schema 校验每份文档。
5. 执行目录身份、URL 安全、协议子集、model/alias 唯一性和 defaults 等语义校验。
6. 在不解析凭据、不访问网络的前提下列出启用的本地模型。
7. 选择模型时，只解析出一个 canonical model、一个应用支持的协议和一种认证方式。识别明文、`env://` 与 `vault://`，拒绝其他全部 scheme。
8. 使用应用自己的上游 adapter 直接发送请求。

不要读取 JSONC、`manifest.json`、legacy `protocol` 或 protocol object。不要猜测 `/v1`、模型列表 URL、模型能力或认证行为。

## 数据边界

原始输入、已校验数据和 diagnostics 应分离：

```text
JSON 字节 → Schema 校验 → 语义校验 → normalized profile
```

只有 normalized profile 能进入请求代码。文件路径和 diagnostics 是加载元数据，不是 profile 字段。错误应标识文件和稳定规则，但绝不能包含解析后的 secret。

## 模型列表与连接解析

模型列表是对 `models.json` 的纯读取。可以按 provider 和 enabled 状态过滤，但不得隐式刷新远端数据。

连接解析必须遵循规范中的算法。Alias 输入最终归一成 canonical model ID；协议是有序候选中应用支持的第一项。凭据缺失、target disabled、alias 歧义、协议无交集、Vault 后端不可用或 Vault 绑定不符都必须报错。

只在带认证请求或显式刷新即将执行时解析凭据。不要在 client object 的整个生命周期缓存解析后的 Vault 值；每次操作重新解析可以让轮换在下次请求立即生效，并缩短明文驻留内存的时间。发送前还要再次核对最终请求 origin 与已校验 provider 和 Vault 绑定。

## 凭据存储

严格使用规范定义的 secret 引用语法。Profile 只保存 `vault://<providerId>/<credentialId>`；OS 凭据设施以 service `dev.lapp.vault.v1`、account `<providerId>/<credentialId>` 保存 `VaultEnvelopeV1`。应把平台后端封装在 credential resolver 接口之后，使模型列表和 profile 校验保持纯读取操作。

高级凭据创建 API 收到 raw secret 时，应默认把它以 credential ID `default` 存入 Vault；只有调用方显式要求明文或给出环境变量名时才使用其他形式。低级 profile 编辑器仍可接受任一合法 secret 形式，并且不访问 Vault。Vault 绑定元数据不能来自调用方在最终 provider 之外另传的字段，必须从已校验 provider 推导 provider ID、URL origin 与 auth shape。

读取 Vault 时，必须先解析并校验存储的 JSON，再使用其中的 secret。Provider ID、credential ID、origin 和 normalized auth 必须完全匹配。配置改变后不得自动 rebind，也不能回退到文件、环境变量、明文或第二份凭据。记录缺失是运行时错误，不会使模型发现或 profile 本身失效。

凭据实现应提供稳定且脱敏的错误。官方 SDK 与 CLI 使用：

```text
INVALID_SECRET_REFERENCE
UNSUPPORTED_SECRET_SCHEME
ENV_SECRET_MISSING
VAULT_BACKEND_UNAVAILABLE
VAULT_CREDENTIAL_NOT_FOUND
VAULT_CREDENTIAL_EXISTS
VAULT_RECORD_INVALID
VAULT_BINDING_MISMATCH
VAULT_ACCESS_DENIED
VAULT_OPERATION_FAILED
CREDENTIAL_UPDATE_PARTIAL_FAILURE
```

Native cause 如需在内部保留，必须先脱敏且不得序列化。错误对象、diagnostics 与输出不得包含原生后端文本、解析后的 secret 或存储 envelope。

凭据管理工具应提供 set、status 和 delete，不提供常规 get/export/rebind。Status 可以报告 scheme、可用性与绑定状态，但不能返回值。删除 provider 时不得自动删除当前用户共享的 Vault 记录。

## 显式远端刷新

只有配置 `modelDiscovery` 的 provider 可以远端刷新。必须精确使用配置的 URL，要求与 `baseUrl` 同源，拒绝重定向，完整校验响应，并返回内存中的建议结果。

Apply 使用只追加合并：保留全部现有条目和字段，把新 ID 排序后追加，不猜测能力，也不删除模型。CLI 应在写入前展示建议结果。

## 写入

不得把非法 ID 清洗成文件名。每次写入或删除前都要解析目标路径，并检查它属于 root。文件有变化时，在同目录写临时文件、flush，再原子 rename；未变化文件不重写。

一个高级操作同时写 Vault 与 profile 时，应先校验完整的拟写入 profile、保存 Vault 原值、写入 Vault，再原子写 profile。Profile 写入失败时恢复 Vault 原状态；如果恢复也失败，返回独立的 partial-failure 错误，且不能暴露新旧 secret。Dry run 不得读取或写入 Vault。

LAPP v1 假定单写入者。在真实并发需求出现前，不增加锁、daemon、数据库、secret 文件 fallback、缓存、迁移层或 profile 级事务。

## 一致性

使用本仓库的版本化 Schema 和 fixtures 作为共同合同。合规实现必须与 reference validator 对 fixtures 的接受和拒绝结果一致；可以增加 diagnostics，但不能接受 canonical validator 拒绝的 profile。

运行：

```bash
npm test
node tools/validator/lapp-validate.mjs examples/zh-CN/full/.lapp
```

## 分发用户协议

纳入 LAPP 用户协议的安装器与应用包必须同时携带 `USER_AGREEMENT.en.md` 和
`USER_AGREEMENT.zh-CN.md`。仅随包分发文件不能证明用户已经同意。

依赖该协议的 GUI 或原生安装器，应在安装或首次使用前标明发行方和生效条款，显著
展示凭据访问、数据传输、Provider 费用、AI 输出和工具操作风险，提供完整离线文本，
使用默认未选中的明确同意控件，允许取消，并在法律允许时记录接受的版本和时间。
重大变更应再次展示。发行方处理个人信息时，还必须提供独立隐私告知。

包管理器分发的 library 应把协议文件放入安装产物，但不应使用 `postinstall` 脚本
模拟用户同意。每个发行方在把模板作为有约束力的协议前，都必须针对自身主体、司法
辖区、隐私实践和安装流程完成法律审查。
