# Security Policy

## Supported versions

NairaGate is pre-1.0. Security fixes are applied to the latest release.

## Reporting a vulnerability

Please do not disclose exploitable vulnerabilities in a public issue. Use GitHub's private vulnerability reporting feature when it is enabled for this repository. If private reporting is unavailable, contact the maintainer privately through the contact method listed on their GitHub profile.

## Deployment model

NairaGate is a server-side library. Provider secret keys must never be shipped to browsers, mobile clients, public bundles, logs, analytics events, or error responses.

Account resolution is sensitive even when the upstream provider permits it. An unauthenticated public endpoint can become an account-enumeration oracle. Applications exposing resolution over HTTP should implement authentication or another appropriate authorization boundary, per-principal and per-IP rate limits, abuse monitoring, request validation, and minimal logging of account identifiers.

NairaGate validates inputs and normalizes provider failures, but application-level authorization and distributed rate limiting remain the responsibility of the host application.

## Secret handling

Only environment-variable examples containing non-secret placeholders belong in this repository. Never commit production/test provider credentials, customer account details, API responses containing personal data, or copied `.env` files.

If a credential is committed accidentally, rotate/revoke it immediately. Removing it in a later commit does not remove it from Git history.
