# API reference

## `createNairaGate(options)`

Creates an immutable NairaGate client around a `BankProvider`.

### Options

`provider: BankProvider` is required.

### Client operations

`client.provider` contains the provider name.

`client.banks.list()` returns `Promise<Bank[]>`.

`client.accounts.resolve(input)` returns `Promise<ResolvedAccount>`.

## `PaystackProvider`

```ts
new PaystackProvider({
  secretKey,
  fetch,
  baseUrl,
  timeoutMs,
});
```

`secretKey` is required and must remain server-side. `fetch` is optional and primarily useful for testing or controlled runtimes. `baseUrl` defaults to Paystack's API origin. `timeoutMs` defaults to 10 seconds.

## `FlutterwaveProvider`

```ts
new FlutterwaveProvider({
  secretKey,
  fetch,
  baseUrl,
  timeoutMs,
});
```

`secretKey` is required and must remain server-side. `fetch` is optional and primarily useful for testing or controlled runtimes. `baseUrl` defaults to Flutterwave's `v3` API origin. `timeoutMs` defaults to 10 seconds.

Bank discovery calls `GET /banks/NG` and account resolution calls `POST /accounts/resolve` against Flutterwave's documented v3 contract. Flutterwave sometimes returns HTTP 200 with a failure envelope for an invalid account/bank combination; the adapter treats that the same as a 400/404/422 and maps it to `ACCOUNT_NOT_FOUND`.

## `ResolveAccountInput`

```ts
type ResolveAccountInput = {
  accountNumber: string;
  bankCode: string;
};
```

NairaGate currently validates Nigerian account numbers as exactly ten digits and provider bank codes as two to six digits.

## `ResolvedAccount`

```ts
type ResolvedAccount = {
  accountNumber: string;
  accountName: string;
  bankCode: string;
};
```

## `NairaGateError`

All normalized library failures use `NairaGateError`.

Stable error codes are `INVALID_INPUT`, `AUTHENTICATION_FAILED`, `ACCOUNT_NOT_FOUND`, `RATE_LIMITED`, `PROVIDER_ERROR`, and `NETWORK_ERROR`.

The error may also include `provider` and `status`. A `cause` can be retained for server-side diagnostics. Do not serialize complete error objects directly into public HTTP responses.

## `BankProvider`

Provider adapters implement:

```ts
interface BankProvider {
  readonly name: string;
  listBanks(): Promise<Bank[]>;
  resolveAccount(input: ResolveAccountInput): Promise<ResolvedAccount>;
}
```

This is the primary extension point for future providers.
