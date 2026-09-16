# NairaGate

A secure, provider-oriented TypeScript toolkit for Nigerian bank discovery and account verification.

> NairaGate is under active development. The first provider integration is Paystack.

## Why NairaGate?

Bank account verification looks simple until it becomes part of a real application. Credentials must stay server-side, upstream failures need consistent handling, user input must be validated, and account-resolution endpoints need protection against abuse.

NairaGate packages those concerns behind a small typed API while keeping payment-provider integrations isolated behind adapters.

## Goals

- Secure-by-default server-side bank account verification
- Strong TypeScript types and predictable errors
- Provider isolation instead of application code coupled directly to an upstream API
- Framework-agnostic core with optional adapters
- Testable network boundaries
- Clear documentation for production deployment

## Planned API

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

## Security

Never expose provider secret keys to browser code. Account-resolution functionality can be abused as an enumeration oracle when exposed without authentication and rate limiting. Read [SECURITY.md](SECURITY.md) before deploying an HTTP endpoint around NairaGate.

## Project status

NairaGate is being rebuilt as an independent open-source project from a small production integration. The public repository intentionally starts with clean history and contains no credentials or application-specific data from the original project.

## License

Apache-2.0. See [LICENSE](LICENSE).
