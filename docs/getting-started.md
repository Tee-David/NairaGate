# Getting started

NairaGate's core is framework-agnostic and intended to run in trusted server-side code.

## Install

During pre-1.0 development, clone the repository and install dependencies:

```bash
npm install
npm run check
```

Once the package is published, installation will use the package name `nairagate`.

## Configure Paystack

Store your Paystack secret key in the server environment. Do not prefix it with framework-specific variables that expose values to browser bundles.

```ts
import { createNairaGate, PaystackProvider } from "nairagate";

const secretKey = process.env.PAYSTACK_SECRET_KEY;
if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is required.");

const provider = new PaystackProvider({ secretKey });

export const nairaGate = createNairaGate({ provider });
```

## List Nigerian banks

```ts
const banks = await nairaGate.banks.list();
```

The provider returns a normalized, alphabetically sorted list and de-duplicates entries by provider bank code.

## Resolve an account

```ts
const account = await nairaGate.accounts.resolve({
  accountNumber: "0123456789",
  bankCode: "058",
});
```

Account numbers are validated before the provider is called. Treat the returned account name as personal information and avoid unnecessary storage or logging.

## Handle failures

```ts
import { NairaGateError } from "nairagate";

try {
  await nairaGate.accounts.resolve(input);
} catch (error) {
  if (error instanceof NairaGateError) {
    console.error(error.code);
  }
}
```

See [security.md](security.md) before wrapping resolution in a public HTTP endpoint.
