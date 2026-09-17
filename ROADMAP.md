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

## 0.3.x: Korapay, Squad, Monnify

Three more providers are implemented behind the same `BankProvider` contract:

- **`KorapayProvider`** — bank discovery via `GET /misc/banks?countryCode=NG`, account resolution via `POST /misc/banks/resolve` with `{ bank_code, account_number }`. Built against Korapay's documented misc and payout API contract.
- **`SquadProvider`** — bank discovery via `GET /transaction/ussd/banklist`, account resolution via `POST /payout/account/lookup` with `{ bank_code, account_number }`. Squad's account-lookup contract (endpoint, fields, response envelope) is well corroborated; its bank-list response field names were not independently confirmed, so the adapter accepts more than one plausible field spelling for a bank entry's name/code — verify this against a real response before relying on it.
- **`MonnifyProvider`** — the first adapter with a different authentication shape: an `apiKey` and `secretKey` are exchanged for a short-lived OAuth2 bearer token via `POST /api/v1/auth/login`, cached in memory, and refreshed transparently near expiry. Bank discovery uses Monnify's documented USSD-bank listing endpoint (`GET /api/v1/sdk/transactions/banks`) as the best available source, and account resolution uses the confirmed `GET /api/v1/disbursements/account/validate` endpoint.

All three follow the same bar as Paystack and Flutterwave: deterministic tests with an injected `fetch` boundary, typed error normalization, and no live provider calls in CI. None have been exercised against a live sandbox key — that verification step is still outstanding for each, and Squad's bank-list shape specifically carries a real, flagged chance of being wrong until someone checks it against a live response.

## Providers deliberately not implemented yet

These popular Nigerian providers were considered and left out of this round, not overlooked:

- **Interswitch / Quickteller**, **Providus Bank**, **VFD Microfinance Bank**, **Remita**, **OPay**, **Paga**, **Wema Bank / ALAT**, **Kuda** — either their bank-discovery/account-resolution capability is not exposed through a public, self-serve REST contract (it requires bilateral/enterprise onboarding), or no sufficiently confident, verifiable API contract for it could be established in this project's development environment. Shipping an adapter for a live-money integration on a guessed endpoint or field name is worse than not shipping one.

Adding any of these is welcome as a contribution once someone can supply or verify the current public API contract (official docs, an OpenAPI spec, or a working sandbox trace). See "Contribution opportunities" below.

## Multi-provider maturity

With the provider model now proven across five implementations — including one with a materially different auth shape (Monnify) — remaining work is about scale rather than proving the abstraction:

- Additional Nigerian provider adapters based on real developer demand and verifiable documentation
- Live sandbox verification of the Flutterwave, Korapay, Squad and Monnify adapters against real provider keys
- Compatibility guidance for provider capabilities and differences
- More framework and runtime examples
- Stronger release automation and package verification
- Improved observability guidance without exposing sensitive financial data

## Contribution opportunities

Good contribution areas include documentation improvements, deterministic test cases, framework examples, provider research, bug fixes and narrowly scoped developer-experience improvements.

For a new provider or a substantial public API change, open an issue before implementation. Provider additions must preserve the provider-neutral core and meet the testing and security expectations in [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## Non-goals

NairaGate does not aim to replace NIBSS, banks, payment processors, KYC systems, regulatory obligations, or provider authorization. It is an application-level integration abstraction for developers using supported providers they are authorized to access.
