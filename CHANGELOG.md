# Changelog

All notable changes to NairaGate are documented here. The project follows Semantic Versioning.

## [Unreleased]

### Added

- Flutterwave provider (`FlutterwaveProvider`) for Nigerian bank discovery and account resolution, behind the existing `BankProvider` contract
- Korapay provider (`KorapayProvider`) for Nigerian bank discovery and account resolution
- Squad provider (`SquadProvider`) for Nigerian bank discovery and account resolution
- Monnify provider (`MonnifyProvider`), the first adapter authenticating via OAuth2 (API key + secret key exchanged for a cached, auto-refreshing bearer token) rather than a static secret key
- `NAIRAGATE_PROVIDER` environment variable to select the `nairagate-mcp` provider (`paystack`, `flutterwave`, `korapay`, `squad`, or `monnify`)
- Deterministic tests for all four new providers' bank listing, account resolution, error mapping, and (for Monnify) token caching and expiry
- CBN NUBAN check-digit validation for the standard 3-digit bank-code case, rejecting a malformed account number before any provider call instead of after a network round trip
- `guessBankCandidates(accountNumber, banks)`: an offline "matched bank" suggestion (à la OPay) driven by the account number's own NUBAN check digit against an already-fetched bank list, with no bundled directory and no network call

### Planned

- Additional native provider adapters, pending a verifiable public API contract for each
- Live sandbox verification of the Flutterwave, Korapay, Squad and Monnify adapters against real provider keys
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
