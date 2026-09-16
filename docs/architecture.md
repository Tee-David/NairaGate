# Architecture

NairaGate separates application-facing bank operations from payment-provider protocols.

```text
Application
    |
    v
NairaGate client
    |
    v
BankProvider contract
    |
    +---- PaystackProvider
    |
    +---- future providers
```

## Core client

`createNairaGate` exposes the stable application API. It depends only on the `BankProvider` contract, so consumers do not need provider-specific response shapes throughout their application.

## Provider boundary

Each provider owns authentication, URLs, query encoding, response parsing, provider-specific status handling, and conversion into NairaGate domain types and errors.

The current Paystack provider accepts an injectable `fetch` implementation. This keeps unit tests deterministic and avoids live financial API calls during CI.

## Domain model

The public domain model contains `Bank`, `ResolveAccountInput`, `ResolvedAccount`, and `BankProvider`. Provider payload types remain private implementation details.

## Error model

External failures are normalized into `NairaGateError` with stable error codes. This prevents applications from depending directly on provider-specific error payloads while still preserving useful provider and HTTP status metadata for server-side handling.

## Security boundary

NairaGate belongs in trusted server-side code. It intentionally does not implement HTTP authentication or distributed rate limiting because those controls depend on the host application's identity and infrastructure. The library documents those requirements instead of providing a misleading in-memory security abstraction.

## Extension principle

A new provider should be added as an adapter implementing `BankProvider`. The core client should only change when a capability is genuinely common across providers.
