# LAPP: Local AI Provider Profiles

![LAPP logo](./assets/lapp-logo-github-avatar.png)

LAPP 是一套本机 AI 供应商配置规范，默认目录为 `~/.lapp`。它的目标很小：让同一台电脑上的多个 AI 应用复用同一份供应商、模型和默认选择配置。

LAPP 不做网关，不代理请求，不定义运行时服务，也不强制 fallback、限流、日志或计费策略。

## 文件

- [spec.zh-CN.md](./spec.zh-CN.md)：协议结构和字段语义
- [implementation.zh-CN.md](./implementation.zh-CN.md)：应用接入建议
- [security.zh-CN.md](./security.zh-CN.md)：密钥和同步安全建议
- [references.zh-CN.md](./references.zh-CN.md)：示例模型与文档来源快照
- [schema/](./schema/)：JSON Schema
- [examples/zh-CN/](./examples/zh-CN/)：中文注释示例

## 最小适配

一个 LAPP v1 应用只需要扫描：

```text
~/.lapp/providers/*/provider.json
```

并读取 `id`、`protocol`、`baseUrl`、`auth.secret`，就能完成最小供应商发现。

## 授权

LAPP 规范、Schema 和示例均使用 [MIT License](./LICENSE)。
