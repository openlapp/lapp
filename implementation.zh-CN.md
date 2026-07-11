# LAPP v1 应用接入

应用可以直接实现 LAPP、调用 SDK，或调用提供稳定 JSON 输出的 CLI。三种方式完成同一件事：读取本地 Provider Registry，解析模型和凭据，然后由应用直接调用上游 API。

## 最小读取流程

1. 优先解析 `LAPP_HOME`，否则使用 `~/.lapp`。
2. 扫描 `providers/` 的直接子目录。
3. 从每个目录精确读取 UTF-8 JSON 格式的 `provider.json` 和 `models.json`。
4. 使用 LAPP 1.0 Schema 校验每份文档。
5. 执行目录身份、URL 安全、协议子集、model/alias 唯一性和 defaults 等语义校验。
6. 在不解析凭据、不访问网络的前提下列出启用的本地模型。
7. 选择模型时，只解析出一个 canonical model、一个应用支持的协议和一种认证方式。
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

连接解析必须遵循规范中的算法。Alias 输入最终归一成 canonical model ID；协议是有序候选中应用支持的第一项。凭据缺失、target disabled、alias 歧义或协议无交集都必须报错。

## 显式远端刷新

只有配置 `modelDiscovery` 的 provider 可以远端刷新。必须精确使用配置的 URL，要求与 `baseUrl` 同源，拒绝重定向，完整校验响应，并返回内存中的建议结果。

Apply 使用只追加合并：保留全部现有条目和字段，把新 ID 排序后追加，不猜测能力，也不删除模型。CLI 应在写入前展示建议结果。

## 写入

不得把非法 ID 清洗成文件名。每次写入或删除前都要解析目标路径，并检查它属于 root。文件有变化时，在同目录写临时文件、flush，再原子 rename；未变化文件不重写。

LAPP v1 假定单写入者。在真实并发需求出现前，不增加锁、daemon、数据库、缓存、迁移层或 profile 级事务。

## 一致性

使用本仓库的版本化 Schema 和 fixtures 作为共同合同。合规实现必须与 reference validator 对 fixtures 的接受和拒绝结果一致；可以增加 diagnostics，但不能接受 canonical validator 拒绝的 profile。

运行：

```bash
npm test
node tools/validator/lapp-validate.mjs examples/zh-CN/full/.lapp
```
