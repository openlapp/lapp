# LAPP: Local AI Provider Profiles

![LAPP logo](./assets/lapp-logo-github-avatar.png)

LAPP is a local AI provider profile convention. Its default directory is `~/.lapp`. Its goal is intentionally small: let AI applications on the same machine reuse provider, model, and default-selection configuration.

LAPP is not a gateway. It does not proxy requests, define a runtime service, or require fallback, rate-limit, logging, or billing behavior.

## Files

- [spec.en.md](./spec.en.md): directory layout and field semantics
- [implementation.en.md](./implementation.en.md): integration guidance for applications
- [security.en.md](./security.en.md): secret and sync safety guidance
- [references.en.md](./references.en.md): example model and documentation snapshot
- [schema/](./schema/): JSON Schema files
- [examples/en/](./examples/en/): examples with English comments

## Minimal Support

A LAPP v1 application only needs to scan:

```text
~/.lapp/providers/*/provider.json
```

and read `id`, `protocol`, `baseUrl`, and `auth.secret` to implement minimal provider discovery.

## License

The LAPP specification, schemas, and examples are licensed under the [MIT License](./LICENSE).
