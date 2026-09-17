# NairaGate Roadmap

NairaGate is intentionally growing in small, reviewable stages. The roadmap communicates direction, not a guarantee that a feature or provider will ship on a particular date.

## 0.1.x: Paystack foundation

The first release line focuses on making the existing Paystack integration dependable as a reusable library.

- Stable bank discovery and account-name resolution contract
- Strict input validation and typed errors
- Runtime validation of provider responses
- Deterministic tests with no live financial API calls
- Security guidance for server-side integrations
- Framework examples and contributor documentation
- Reproducible package and release workflow

## 0.2.x: Flutterwave

Flutterwave is implemented behind the existing `BankProvider` contract:

- Native provider adapter (`FlutterwaveProvider`) behind the existing `BankProvider` contract
- Bank discovery via Flutterwave's `GET /v3/banks/NG`
- Nigerian account-name resolution via `POST /v3/accounts/resolve`
- Provider-specific authentication and response validation, including Flutterwave's HTTP-200-with-error-envelope behavior on invalid accounts
- Error normalization into NairaGate domain errors
- Tests for success, invalid input, authentication, rate limits, provider failures and malformed responses
- Usage documentation and examples

The adapter was built and tested against Flutterwave's publicly documented v3 REST contract, with no live provider key, the same way the Paystack adapter is tested. It has not yet been exercised against a live Flutterwave sandbox key; treat that as an outstanding verification step before depending on it in production.

## Multi-provider maturity

With the provider model now proven across two implementations, next candidates are additional Nigerian payment providers with public bank-discovery and account-resolution APIs (for example Monnify, Paga, Interswitch/Quickteller, or Providus/9PSB-style BaaS providers), added one at a time as real developer demand and API documentation availability allow. Each addition follows the same bar as Paystack and Flutterwave:

- A native adapter behind the existing `BankProvider` contract, built from that provider's own public API documentation
- Deterministic tests with an injected `fetch` boundary and no live API calls required
- Documented, explicit assumptions where the provider's real-world response quirks could not be verified against a live key
- Compatibility guidance for provider capabilities and differences
- More framework and runtime examples
- Stronger release automation and package verification
- Improved observability guidance without exposing sensitive financial data

## Contribution opportunities

Good contribution areas include documentation improvements, deterministic test cases, framework examples, provider research, bug fixes and narrowly scoped developer-experience improvements.

For a new provider or a substantial public API change, open an issue before implementation. Provider additions must preserve the provider-neutral core and meet the testing and security expectations in [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## Non-goals

NairaGate does not aim to replace NIBSS, banks, payment processors, KYC systems, regulatory obligations, or provider authorization. It is an application-level integration abstraction for developers using supported providers they are authorized to access.
