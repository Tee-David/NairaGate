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

## `KorapayProvider`

```ts
new KorapayProvider({
  secretKey,
  fetch,
  baseUrl,
  timeoutMs,
});
```

`secretKey` is required and must remain server-side. `baseUrl` defaults to `https://api.korapay.com/merchant/api/v1`. Bank discovery calls `GET /misc/banks?countryCode=NG` and account resolution calls `POST /misc/banks/resolve` with `{ bank_code, account_number }`, against Korapay's documented misc and payout API contract.

## `SquadProvider`

```ts
new SquadProvider({
  secretKey,
  fetch,
  baseUrl,
  timeoutMs,
});
```

`secretKey` is required and must remain server-side. `baseUrl` defaults to `https://api-d.squadco.com` (Squad also documents a distinct sandbox host; pass it as `baseUrl` if your key is sandbox-scoped). Bank discovery calls `GET /transaction/ussd/banklist` and account resolution calls `POST /payout/account/lookup` with `{ bank_code, account_number }`. Squad's bank-list response field names were not independently verifiable in this project's environment, so the adapter accepts both `name`/`code` and `bank_name`/`bank_code` field spellings defensively. Verify this against a live response before depending on it.

## `MonnifyProvider`

```ts
new MonnifyProvider({
  apiKey,
  secretKey,
  fetch,
  baseUrl,
  timeoutMs,
});
```

Monnify authenticates differently from the other providers: instead of a single static secret key attached to every request, it issues a short-lived OAuth2 bearer token. `apiKey` and `secretKey` are both required and must remain server-side; the adapter exchanges them for an access token via `POST /api/v1/auth/login` (HTTP Basic auth), caches the token in memory, and transparently re-authenticates once it is close to expiry. `baseUrl` defaults to `https://api.monnify.com`.

Bank discovery calls `GET /api/v1/sdk/transactions/banks` (Monnify's documented USSD-bank listing endpoint, used here as the best available bank-discovery source) and account resolution calls `GET /api/v1/disbursements/account/validate` with `accountNumber`/`bankCode` query parameters.

## `ResolveAccountInput`

```ts
type ResolveAccountInput = {
  accountNumber: string;
  bankCode: string;
};
```

NairaGate currently validates Nigerian account numbers as exactly ten digits and provider bank codes as two to six digits. When `bankCode` is exactly 3 digits (the standard CBN code for a deposit money bank), the account number's 10th digit is also checked against the CBN NUBAN check-digit algorithm before any provider call. Longer, provider-specific codes (fintechs, microfinance banks) don't follow that scheme, so the check-digit is skipped for those.

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
