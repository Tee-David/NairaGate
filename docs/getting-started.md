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

## Suggest a bank as the user types

Fetch `banks` once (above), then re-run this locally on every keystroke to offer a "matched bank" suggestion the way apps like OPay do, before the user has picked one:

```ts
import { guessBankCandidates } from "nairagate";

const candidates = guessBankCandidates(accountNumberSoFar, banks);
```

This is entirely offline (no network call, no provider needed) because it works from the account number's own CBN NUBAN check digit. It only ever considers banks with a standard 3-digit code, returns `[]` (never throws) for anything not yet a complete 10-digit number, and can return more than one bank if their codes collide on the same check digit. Treat the result as a candidate to confirm, not a resolved identity; call `accounts.resolve` for the real answer.

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
