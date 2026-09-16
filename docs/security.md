# Security guide

NairaGate keeps provider credentials behind a server-side API, but a secure deployment also needs controls at the application boundary.

## Account enumeration

A bank-account resolution endpoint accepts an account number and bank code and may return the account holder's name. Publishing that operation without controls allows automated probing. NairaGate deliberately does not pretend that input validation alone solves this.

Recommended application controls include authenticated sessions where appropriate, authorization tied to a legitimate product flow, per-user and per-IP rate limits, conservative retry behavior, abuse monitoring, and avoiding logs that contain complete account numbers or resolved names.

## Credentials

Pass provider credentials from the runtime environment. Never hardcode them in source code, test fixtures, examples, screenshots, issue reports, or client-side environment variables.

## Network failures

The Paystack provider uses a finite request timeout and converts network/provider failures into typed `NairaGateError` instances. Applications should return generic client-facing errors rather than exposing upstream payloads or credentials.

## Privacy

Account holder names and account numbers should be handled as sensitive user data. Collect only what the product needs, restrict access, avoid analytics capture, and establish an appropriate retention policy for the application using NairaGate.
