---
name: nairagate
description: Integrate Nigerian bank discovery and account-name resolution with NairaGate. Use when building, reviewing, testing, or securing Nigerian fintech flows that need bank lists or server-side account resolution through the NairaGate SDK or MCP server.
license: Apache-2.0
compatibility: Requires Node.js 20+ for NairaGate runtime integrations. Provider credentials must remain server-side.
metadata:
  author: Taiwo David Dayomola
  repository: Tee-David/NairaGate
---

# NairaGate

Use NairaGate as the provider-neutral boundary for Nigerian bank discovery and account-name resolution.

## Core rules

- Keep provider credentials in trusted server-side code. Never place them in browser, mobile, generated client code, prompts, logs, or committed files.
- Validate account numbers and bank codes before calling a provider.
- Treat resolved account names and account numbers as privacy-sensitive financial data.
- Add application-level authentication, authorization, rate limiting, abuse monitoring, and privacy-aware logging before exposing resolution over HTTP.
- Do not describe NairaGate as a replacement for NIBSS, banks, KYC, regulatory compliance, or payment processors.
- Do not claim roadmap providers are implemented. Paystack, Flutterwave, Korapay, Squad and Monnify are currently implemented; other native providers are on the roadmap.
- Monnify authenticates differently from the other providers: it takes `apiKey` and `secretKey` (not a single `secretKey`) and exchanges them internally for a short-lived OAuth2 token. Do not conflate its constructor shape with the other providers'.

## TypeScript integration

Install the `nairagate` package from npm. To work on NairaGate itself instead of consuming it, use the repository source directly.

Create the provider on the server, read the secret from the environment, and pass the provider to `createNairaGate`.

```ts
import { createNairaGate, PaystackProvider } from "nairagate";

const secretKey = process.env.PAYSTACK_SECRET_KEY;
if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is required.");

const nairaGate = createNairaGate({
  provider: new PaystackProvider({ secretKey }),
});

const banks = await nairaGate.banks.list();
const account = await nairaGate.accounts.resolve({
  accountNumber: "0123456785",
  bankCode: "058",
});
```

`FlutterwaveProvider`, `KorapayProvider`, and `SquadProvider` take the same `{ secretKey }` shape as `PaystackProvider` and can be substituted directly. `MonnifyProvider` is the exception: it takes `{ apiKey, secretKey }` instead of a single `secretKey`, since it exchanges those for a short-lived OAuth2 token internally. In every case, only the provider construction changes; `createNairaGate` and the rest of the application code stay the same.

For a "matched bank" suggestion as the user types an account number (before they've picked a bank), use `guessBankCandidates(accountNumber, banks)` with a bank list already fetched from `banks.list()`. It runs entirely offline against the account number's own CBN NUBAN check digit, never calls a provider, and returns `[]` instead of throwing for incomplete or malformed input, so it's safe to call on every keystroke. Never treat its result as a resolved identity; it is a suggestion the user confirms, and `accounts.resolve` remains the only authoritative check.

## MCP integration

NairaGate includes a stdio MCP server exposed by the `nairagate-mcp` binary. It provides two read-only tools:

- `list_banks` lists banks available through the configured provider.
- `resolve_account` resolves an account holder name from a validated Nigerian account number and bank code.

The MCP process reads the credential(s) for its configured provider from its server-side environment, selected via `NAIRAGATE_PROVIDER` (`paystack` by default, or `flutterwave`, `korapay`, `squad`, `monnify`): `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, `KORAPAY_SECRET_KEY`, `SQUAD_SECRET_KEY`, or `MONNIFY_API_KEY` + `MONNIFY_SECRET_KEY` respectively. Never put provider credentials into prompts or tool arguments. Treat MCP hosts as application boundaries: only configure the server in environments where the credential and returned financial data are appropriately protected.

## When generating an API route

1. Read the provider secret from the server environment.
2. Reject missing or malformed input before the upstream request.
3. Call NairaGate through its public API rather than provider-specific endpoints.
4. Map typed NairaGate errors to conservative HTTP responses.
5. Never return provider secrets, raw authorization headers, or unnecessary upstream payloads.
6. Apply authentication and rate limiting appropriate to the host application.

## When reviewing an integration

Check for secrets in client bundles, provider-specific coupling outside adapters, unvalidated account input, unrestricted public resolution endpoints, verbose financial logging, raw upstream errors, unsafe retries, and tests that depend on live financial APIs.

Prefer deterministic tests with an injected network boundary.

## Project references

Consult the repository README, `docs/getting-started.md`, `docs/api-reference.md`, `docs/architecture.md`, `docs/security.md`, `SECURITY.md`, and `ROADMAP.md` when additional detail is required.
