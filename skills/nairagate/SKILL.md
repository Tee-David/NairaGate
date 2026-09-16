---
name: nairagate
description: Integrate Nigerian bank discovery and account-name resolution with NairaGate. Use when building, reviewing, testing, or securing Nigerian fintech flows that need bank lists or server-side account resolution through supported NairaGate providers.
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
- Do not claim roadmap providers are implemented. Paystack is the currently implemented provider; Flutterwave and other native providers are on the roadmap.

## TypeScript integration

Install the published `nairagate` package when available. Until publication, use the repository source for development.

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
  accountNumber: "0123456789",
  bankCode: "058",
});
```

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
