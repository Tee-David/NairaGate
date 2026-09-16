# NairaGate

A secure, provider-oriented TypeScript toolkit for Nigerian bank discovery and account verification.

**Created and maintained by Taiwo David Dayomola, Senior Software Engineer.**

> NairaGate is under active development. Paystack is the first implemented provider. Flutterwave support is on the roadmap.

## The problem

Building Nigerian fintech, payments, onboarding, payout, marketplace, or financial-testing flows often requires a deceptively simple capability: given a bank and account number, resolve the account holder's name before continuing.

Direct financial-infrastructure integrations are not always appropriate for an early product, prototype, internal tool, test environment, or developer who is not yet ready to complete an institution-level integration process. Direct NIBSS connectivity, for example, is governed by technical, security, operational, certification, and formal approval requirements before live transaction access.

At the same time, every application should not need to reinvent provider authentication, bank-list normalization, request validation, error translation, timeouts, account-resolution calls, and the security considerations around exposing those operations to users.

**NairaGate exists to make that developer workflow smaller and safer.**

It provides one typed application-facing interface over supported account-resolution providers, beginning with Paystack. It is not a replacement for NIBSS, a bank, regulatory compliance, KYC obligations, or a payment processor. It is an open-source developer abstraction for applications that need bank discovery and account-name resolution through providers they are authorized to use.

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
| Additional providers | Planned | Planned | Community and maintainer roadmap |

A provider appearing on the roadmap does not mean it is currently supported. New integrations are only marked implemented after the adapter, error mapping, documentation, and automated tests are complete.

## Quick start

NairaGate is currently in pre-release development and is not yet published to npm. Clone the repository and run:

```bash
npm install
npm run check
```

The intended package API is already implemented:

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

Never put a provider secret key in browser or mobile client code.

## Design principles

NairaGate is deliberately small at the public API and strict at its boundaries. The core depends on a provider contract rather than Paystack-specific types. Provider adapters own authentication, URLs, upstream payloads, response normalization, and provider-specific failures. Network access is injectable so tests remain deterministic.

The project favors explicit failures over silent fallback behavior. A missing secret, malformed input, network failure, invalid provider response, rate limit, or authentication failure should be visible to the application as a typed error rather than disguised as a successful empty result.

Read [Architecture](docs/architecture.md) for the design in detail and [API reference](docs/api-reference.md) for the public contract.

## Security is part of the API

Account-name resolution can expose personal information and can become an enumeration surface if an application publishes it without controls. NairaGate validates inputs and normalizes provider failures, but it cannot know your application's users, authorization model, or distributed infrastructure.

Before exposing resolution over HTTP, implement the appropriate authentication or authorization boundary, per-user and per-IP rate limiting, abuse monitoring, conservative retries, and privacy-aware logging. Do not log complete account numbers and resolved names unless your application has a justified need and an appropriate retention policy.

Read [SECURITY.md](SECURITY.md) and the [security guide](docs/security.md) before production use.

## Documentation

- [Getting started](docs/getting-started.md)
- [API reference](docs/api-reference.md)
- [Architecture](docs/architecture.md)
- [Security guide](docs/security.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

A Next.js route-handler example is available under [`examples/nextjs`](examples/nextjs).

## Contributing

NairaGate welcomes useful, reviewed contributions, but changes do not go directly into the maintained codebase merely because a pull request is opened.

Start by reading [CONTRIBUTING.md](CONTRIBUTING.md). For non-trivial changes, open an issue first so the problem and proposed API can be discussed. Contributors should fork the repository, create a focused branch in their fork, add tests and documentation where required, run the complete quality gate, and then submit a pull request for maintainer review.

Every accepted change must preserve the project's architecture and security guarantees and pass automated checks. Provider integrations require deterministic tests and documentation before they are considered supported.

## Project status

NairaGate is being developed from a real integration problem encountered while building software in the Nigerian payments ecosystem. This repository intentionally uses a clean open-source history and contains no credentials or application-specific production data from the original integration.

The project is pre-1.0. APIs may evolve while the provider model, security behavior, and developer experience are hardened. Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## Author and maintainer

**Taiwo David Dayomola**  
Senior Software Engineer

NairaGate was conceived, designed, and built by Taiwo David Dayomola to reduce repeated integration work around Nigerian bank discovery and account verification and to provide a reusable foundation that can grow across supported providers.

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).
