# Contributing to NairaGate

Thanks for considering a contribution.

## Development

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run check
```

`npm run check` is the local quality gate and runs formatting checks, linting, TypeScript validation, tests, and the production build.

## Pull requests

Keep changes focused. Add or update tests for behavioral changes. Do not include real bank-account data, credentials, production API responses, or unrelated formatting churn. Public APIs should include a clear rationale and documentation.

## Provider integrations

Provider adapters must implement the `BankProvider` contract, keep credentials server-side, encode user-controlled query values, normalize provider failures into NairaGate errors, expose a testable fetch boundary, and include tests for success and failure paths.

## Commits

Prefer concise conventional-style commit messages such as `feat: add provider`, `fix: normalize rate-limit errors`, or `docs: explain server integration`.

## Security issues

Do not open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md).
