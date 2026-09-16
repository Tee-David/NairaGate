# Contributing to NairaGate

Thanks for considering a contribution to NairaGate, created and maintained by Taiwo David Dayomola.

NairaGate handles financial-integration boundaries, so correctness, privacy, and security take priority over accepting changes quickly. Opening a pull request does not imply that a change will be merged.

## Before you start

For bug fixes with a clear reproduction, an issue is encouraged. For new providers, public API changes, architecture changes, new dependencies, or substantial features, open an issue before implementation so the problem and proposed approach can be discussed.

Security vulnerabilities must not be reported through public issues. Follow [SECURITY.md](SECURITY.md).

## Fork workflow

1. Fork `Tee-David/NairaGate` into your own GitHub account.
2. Clone your fork locally.
3. Create a focused branch from the latest `main`.
4. Implement one coherent change.
5. Add or update automated tests and documentation.
6. Run the full quality gate locally.
7. Push the branch to your fork and open a pull request against NairaGate's `main` branch.

Maintainers may request changes, decline changes that do not fit the project direction, or close inactive proposals. Do not force-push changes into the upstream repository or expect direct write access.

## Development

Requirements: a currently supported Node.js release compatible with the repository `engines` field and npm.

```bash
npm install
npm run check
```

`npm run check` is the required local quality gate. It runs formatting checks, linting, TypeScript validation, tests, and the production package build.

Tests must be deterministic and must not require a real Paystack, Flutterwave, NIBSS, bank, or customer credential. CI must be able to run from a clean checkout without access to financial secrets.

## Pull request acceptance bar

A pull request should be focused, explain the problem it solves, preserve backward compatibility unless a breaking change was explicitly discussed, add tests for changed behavior, update relevant documentation, avoid unrelated formatting churn, and pass every required automated check.

Do not include real bank-account data, account-holder names, credentials, copied production responses, `.env` files, internal infrastructure identifiers, or other sensitive information in code, tests, screenshots, issues, or pull requests.

The maintainer reviews contributions for architecture, security, API design, test quality, documentation, maintainability, and project scope. Passing CI is necessary but does not guarantee merge.

## Provider integrations

A provider adapter must implement the `BankProvider` contract, keep credentials server-side, safely encode user-controlled values, normalize upstream failures into NairaGate errors, expose a testable network boundary, and include deterministic success and failure tests.

New providers should document configuration, supported operations, known upstream limitations, security considerations, and provider-specific behavior. A provider is not listed as supported until its implementation, tests, and documentation are complete and reviewed.

## Public API changes

Treat exported types, functions, classes, error codes, and documented behavior as deliberate API. Changes to them require a clear use case, tests, documentation, and consideration of migration impact.

## Dependencies

Avoid adding dependencies for functionality that can be implemented clearly and safely with the platform or existing dependencies. New runtime dependencies require justification because they increase the project's maintenance and supply-chain surface.

## Commits

Prefer concise conventional-style commit messages, for example `feat: add provider`, `fix: normalize rate-limit errors`, `test: cover malformed responses`, or `docs: explain server integration`.

## Review ownership

Taiwo David Dayomola is the project creator and primary maintainer. Final merge and release decisions remain with the maintainer while NairaGate is a single-maintainer project. This policy can evolve transparently if the maintainer community grows.
