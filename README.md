<p align="center">
  <img src="assets/nairagate-social-preview.png" alt="NairaGate: Nigerian banks, simplified" width="100%" />
</p>

# NairaGate

[![CI](https://github.com/Tee-David/NairaGate/actions/workflows/ci.yml/badge.svg)](https://github.com/Tee-David/NairaGate/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/nairagate.svg)](https://www.npmjs.com/package/nairagate)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

A single, typed, provider-neutral gateway for Nigerian bank discovery and account-name resolution. Use it as a TypeScript SDK, an MCP server, or an Agent Skill.

> Pre-1.0. Paystack, Flutterwave, Korapay, Squad and Monnify are implemented behind one `BankProvider` contract. See [ROADMAP.md](ROADMAP.md) for what's next.

## Install

```bash
npm install nairagate
```

Requires Node.js 20+.

## Usage

```ts
import { createNairaGate, PaystackProvider } from "nairagate";

const nairaGate = createNairaGate({
  provider: new PaystackProvider({
    secretKey: process.env.PAYSTACK_SECRET_KEY!,
  }),
});

const banks = await nairaGate.banks.list();
const account = await nairaGate.accounts.resolve({
  accountNumber: "0123456789",
  bankCode: "058",
});
```

Every provider implements the same contract, so swapping one in only changes the constructor: `FlutterwaveProvider`, `KorapayProvider`, `SquadProvider` (each `{ secretKey }`), or `MonnifyProvider` (`{ apiKey, secretKey }`, OAuth2 under the hood). Keep credentials server-side, never in browser code, prompts, or logs.

## Providers

| Provider    | Credential                    | Status      |
| ----------- | ----------------------------- | ----------- |
| Paystack    | Secret key                    | Implemented |
| Flutterwave | Secret key                    | Implemented |
| Korapay     | Secret key                    | Implemented |
| Squad       | Secret key                    | Implemented |
| Monnify     | API key + secret key (OAuth2) | Implemented |

Each adapter is built against its provider's public REST API and covered by deterministic tests with an injected `fetch` boundary; no live calls run in CI. Paystack reflects a real integration; the other four have not yet been run against a live key, so smoke-test them in your own sandbox before production. Details and next providers: [ROADMAP.md](ROADMAP.md).

## MCP server

The package ships `nairagate-mcp`, a stdio MCP server exposing `list_banks` and `resolve_account` as read-only tools, without giving the model direct access to credentials.

```bash
PAYSTACK_SECRET_KEY=your_secret_key npx -y nairagate nairagate-mcp
NAIRAGATE_PROVIDER=flutterwave FLUTTERWAVE_SECRET_KEY=your_secret_key npx -y nairagate nairagate-mcp
```

`NAIRAGATE_PROVIDER` selects `paystack` (default), `flutterwave`, `korapay`, `squad`, or `monnify`; each reads its own credential env var(s). Never put credentials in prompts or repository files.

## Agent Skill

An Agent Skill at [`skills/nairagate/SKILL.md`](skills/nairagate/SKILL.md) teaches compatible coding agents to integrate and review NairaGate safely: credential handling, validation, provider boundaries, and MCP usage.

```bash
npx skills add https://github.com/Tee-David/NairaGate --skill nairagate
```

## Why NairaGate

- One typed contract instead of five separate provider integrations
- Predictable `NairaGateError` codes instead of provider-specific failure handling
- Input validated before any upstream call; credentials and calls stay server-side
- Deterministic, mockable tests with no live financial API calls
- The same core across SDK, MCP, and Agent Skill

## Commands

```bash
npm ci          # reproducible install
npm run check   # full quality gate: format, lint, typecheck, test, build, audit
npm run test    # test suite
npm run build   # compile
```

## Security

Account resolution can be an enumeration surface if exposed without controls. NairaGate validates input and normalizes errors, but authentication, rate limiting, and privacy-aware logging at your application boundary are still your responsibility. See [SECURITY.md](SECURITY.md) and the [security guide](docs/security.md).

## Documentation

- [Getting started](docs/getting-started.md)
- [API reference](docs/api-reference.md)
- [Architecture](docs/architecture.md)
- [Roadmap](ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Examples](examples/)

## Contributing

Contributions are welcome; open an issue before non-trivial changes. See [CONTRIBUTING.md](CONTRIBUTING.md) for the fork workflow and quality bar. A provider is only listed as supported once its adapter, tests, and docs are complete.

## Author

**Taiwo David Dayomola**, Senior Software Engineer, created and maintains NairaGate to turn a repeated Nigerian bank-verification integration problem into a reusable, provider-neutral foundation.

## License

Apache License 2.0. See [LICENSE](LICENSE).
