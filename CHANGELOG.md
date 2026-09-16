# Changelog

All notable changes to NairaGate are documented here. The project follows Semantic Versioning.

## [Unreleased]

### Planned

- Flutterwave and additional native provider adapters
- Continued SDK, MCP and Agent Skill hardening

## [0.1.0] - 2026-09-16

Initial public release.

### Added

- Framework-agnostic TypeScript client and provider contract
- Paystack provider for Nigerian bank discovery and account resolution
- Strict account and bank-code validation
- Typed domain and provider errors
- Configurable network timeout and injectable fetch boundary
- Deterministic tests for core Paystack behavior
- `nairagate-mcp` stdio MCP server with `list_banks` and `resolve_account` tools
- NairaGate Agent Skill under `skills/nairagate/SKILL.md`
- Security, architecture and contributor documentation
- CI, CodeQL, dependency automation and npm release workflow
- npm package distribution for `nairagate`
