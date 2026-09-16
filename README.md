# NairaGate

[![CI](https://github.com/Tee-David/NairaGate/actions/workflows/ci.yml/badge.svg)](https://github.com/Tee-David/NairaGate/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

A secure, provider-oriented TypeScript toolkit for Nigerian bank discovery and account verification.

**Created and maintained by Taiwo David Dayomola, Senior Software Engineer.**

> **Status:** Pre-1.0 and under active development. Paystack is the first implemented provider. Flutterwave and other native provider support is on the roadmap. See [ROADMAP.md](ROADMAP.md).

## The problem

NairaGate started with a problem I ran into while building a Nigerian fintech product. I needed reliable bank account-name verification, but getting from a simple product requirement to a dependable implementation meant dealing with access and onboarding constraints, provider-specific authentication, different response shapes, inconsistent failure handling, and security decisions that had little to do with the feature I was actually trying to ship.

I built the integration I needed on the spot. Once it worked, the architectural problem became obvious: that solution should not stay buried inside one application, and the next Nigerian developer should not have to rebuild the same provider plumbing from scratch.

Building Nigerian fintech, payments, onboarding, payout, marketplace, or financial-testing flows often requires the same deceptively simple capability: given a bank and account number, resolve the account holder's name before continuing. Direct financial-infrastructure integrations are not always appropriate for an early product, prototype, internal tool, test environment, or developer who is not yet ready to complete an institution-level integration process.

At the provider layer, applications still have to deal with authentication, bank-list normalization, validation, timeouts, upstream payloads, error translation, and the security implications of exposing account-resolution operations. Those details become application coupling when every product implements them independently.

**NairaGate turns that repeated integration work into a small, typed, security-conscious abstraction.**

## Architecture

```text
Your application
      |
      v
  NairaGate
      |
      v
Provider contract
      |
      +--> Paystack (implemented)
      +--> Flutterwave (roadmap)
      +--> Other native providers (roadmap)
```

Your application depends on NairaGate's stable domain contract. Provider adapters own provider-specific authentication, endpoints, payloads, response normalization and failure mapping.

NairaGate is not a replacement for NIBSS, a bank, regulatory compliance, KYC obligations, or a payment processor. It does not bypass institutional requirements or provider authorization. It reduces application-level integration friction for developers using providers they are authorized to access.

## Why use it?

- Build and test Nigerian account-verification flows without coupling your application directly to one provider's response format.
- Keep provider credentials and financial API calls in trusted server-side code.
- Validate account inputs before making upstream requests.
- Receive predictable typed errors instead of scattering provider-specific failure handling across your application.
- Swap or add providers behind a common contract as NairaGate grows.
- Mock the network boundary for deterministic tests without calling live banking APIs.

## Provider status

| Provider | Bank discovery | Account resolution | Status |
| --- | --- | --- | --- |
| Paystack | Yes | Yes | Implemented |
| Flutterwave | Planned | Planned | Roadmap |
| Other native providers | Planned | Planned | Roadmap |

A provider appearing on the roadmap does not mean it is currently supported. New integrations are only marked implemented after the adapter, error mapping, documentation and automated tests are complete.

## Quick start

NairaGate is currently pre-release and is not yet published to npm. To work with the repository:

```bash
npm install
npm run check
```

The intended package API is implemented:

```ts
import { createNairaGate, PaystackProvider } from "nairagate";

const secretKey = process.env.PAYSTACK_SECRET_KEY;
if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is required.");

const nairaGate = createNairaGate({
  provider: new PaystackProvider({ secretKey }),
});

const banks = await nairaGate.banks.list();

const account = await nairaGate.accounts.resolve({
  accountNumber: "0123456789",
  bankCode: "058",
});
```

Never put a provider secret key in browser or mobile client code.

## Design principles

NairaGate is deliberately small at the public API and strict at its boundaries. The core depends on a provider contract rather than Paystack-specific types. Provider adapters own authentication, URLs, upstream payloads, response normalization and provider-specific failures. Network access is injectable so tests remain deterministic.

The project favors explicit failures over silent fallback behavior. A missing secret, malformed input, network failure, invalid provider response, rate limit, or authentication failure should be visible to the application as a typed error rather than disguised as a successful empty result.

Read [Architecture](docs/architecture.md) for the design in detail and [API reference](docs/api-reference.md) for the public contract.

## Testing

The test suite is deterministic and never calls live banking APIs. Provider behavior is exercised through an injectable network boundary, with coverage focused on validation, successful normalization, authentication failures, rate limits, unavailable accounts, malformed provider responses, network failures and preventing secrets from leaking through public errors.

Run the complete quality gate with:

```bash
npm run check
```

That runs formatting verification, linting, TypeScript type checking, tests and the package build.

## Security is part of the API

Account-name resolution can expose personal information and can become an enumeration surface if an application publishes it without controls. NairaGate validates inputs and normalizes provider failures, but it cannot know your application's users, authorization model, or distributed infrastructure.

Before exposing resolution over HTTP, implement the appropriate authentication or authorization boundary, per-user and per-IP rate limiting, abuse monitoring, conservative retries, and privacy-aware logging. Do not log complete account numbers and resolved names unless your application has a justified need and an appropriate retention policy.

Read [SECURITY.md](SECURITY.md) and the [security guide](docs/security.md) before production use.

## Examples and documentation

- [Getting started](docs/getting-started.md)
- [API reference](docs/api-reference.md)
- [Architecture](docs/architecture.md)
- [Security guide](docs/security.md)
- [Roadmap](ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Next.js route handler](examples/nextjs/app/api/banks/resolve/route.ts)
- [Minimal Node HTTP server](examples/node-http/server.ts)

## Contributing

NairaGate welcomes useful, reviewed contributions, but changes do not go directly into the maintained codebase merely because a pull request is opened.

Start by reading [CONTRIBUTING.md](CONTRIBUTING.md). For non-trivial changes, open an issue first so the problem and proposed API can be discussed. Contributors should fork the repository, create a focused branch in their fork, add tests and documentation where required, run the complete quality gate, and then submit a pull request for maintainer review.

Every accepted change must preserve the project's architecture and security guarantees and pass automated checks. Provider integrations require deterministic tests and documentation before they are considered supported.

## Project status

NairaGate is being developed from a real integration problem encountered while building software in the Nigerian payments ecosystem. The public repository contains no credentials or application-specific production data from the original integration.

The project is pre-1.0. APIs may evolve while the provider model, security behavior and developer experience are hardened. Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## Author and maintainer

**Taiwo David Dayomola**  
Senior Software Engineer

NairaGate was conceived, designed and built by Taiwo David Dayomola to reduce repeated integration work around Nigerian bank discovery and account verification and to provide a reusable foundation that can grow across supported providers.

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).
