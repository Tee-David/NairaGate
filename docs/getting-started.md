# Getting started

NairaGate's core is framework-agnostic and intended to run in trusted server-side code.

## Install

```bash
npm install nairagate
```

To work on NairaGate itself instead of consuming it, clone the repository and install dependencies:

```bash
npm install
npm run check
```

## Configure a provider

Store your provider secret key in the server environment. Do not prefix it with framework-specific variables that expose values to browser bundles.

```ts
import { createNairaGate, PaystackProvider } from "nairagate";

const provider = new PaystackProvider({
  secretKey: process.env.PAYSTACK_SECRET_KEY!,
});

export const nairaGate = createNairaGate({ provider });
```

To use a different provider, construct that provider's class instead. Nothing else in your application changes, since every provider implements the same `BankProvider` contract:

```ts
import { createNairaGate, FlutterwaveProvider } from "nairagate";

const provider = new FlutterwaveProvider({
  secretKey: process.env.FLUTTERWAVE_SECRET_KEY!,
});

export const nairaGate = createNairaGate({ provider });
```

```ts
import { createNairaGate, KorapayProvider } from "nairagate";

const provider = new KorapayProvider({
  secretKey: process.env.KORAPAY_SECRET_KEY!,
});

export const nairaGate = createNairaGate({ provider });
```

```ts
import { createNairaGate, SquadProvider } from "nairagate";

const provider = new SquadProvider({
  secretKey: process.env.SQUAD_SECRET_KEY!,
});

export const nairaGate = createNairaGate({ provider });
```

Monnify is the exception: it takes an `apiKey` and a `secretKey` (it exchanges them for a short-lived OAuth2 token internally, rather than using a single static secret on every request):

```ts
import { createNairaGate, MonnifyProvider } from "nairagate";

const provider = new MonnifyProvider({
  apiKey: process.env.MONNIFY_API_KEY!,
  secretKey: process.env.MONNIFY_SECRET_KEY!,
});

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
  accountNumber: "0123456785",
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
