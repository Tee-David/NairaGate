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

## Next provider: Flutterwave

Flutterwave and other native provider support is on the roadmap. A provider is not considered supported until its adapter, normalization behavior, error mapping, documentation and deterministic tests are complete.

The Flutterwave milestone is expected to include:

- Native provider adapter behind the existing `BankProvider` contract
- Bank discovery where supported by the provider API
- Nigerian account-name resolution
- Provider-specific authentication and response validation
- Error normalization into NairaGate domain errors
- Tests for success, invalid input, authentication, rate limits, provider failures and malformed responses
- Usage documentation and examples

## Multi-provider maturity

After the provider model has been proven across more than one implementation, the project can focus on the areas that become valuable at that scale:

- Additional Nigerian provider adapters based on real developer demand
- Compatibility guidance for provider capabilities and differences
- More framework and runtime examples
- Stronger release automation and package verification
- Improved observability guidance without exposing sensitive financial data

## Contribution opportunities

Good contribution areas include documentation improvements, deterministic test cases, framework examples, provider research, bug fixes and narrowly scoped developer-experience improvements.

For a new provider or a substantial public API change, open an issue before implementation. Provider additions must preserve the provider-neutral core and meet the testing and security expectations in [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## Non-goals

NairaGate does not aim to replace NIBSS, banks, payment processors, KYC systems, regulatory obligations, or provider authorization. It is an application-level integration abstraction for developers using supported providers they are authorized to access.
