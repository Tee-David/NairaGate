# AGENTS.md

This file gives coding agents the same repository expectations as human contributors.

## Mission

NairaGate is a secure, framework-agnostic TypeScript toolkit for Nigerian bank discovery and account verification. Paystack is the first provider. Do not claim support for providers that are not implemented and tested.

## Required checks

Before proposing a change, run `npm run check`. A change is incomplete if formatting, linting, type checking, tests, or the package build fail.

## Architecture rules

Keep the public core provider-agnostic. Provider-specific payloads and behavior belong under `src/providers`. Keep credentials and provider calls server-side. Prefer dependency injection at network and infrastructure boundaries. Public API changes require tests and documentation.

## Security rules

Never commit credentials, real account-holder information, production API payloads, or copied environment files. Do not weaken input validation or expose raw upstream errors without an explicit security rationale. Account resolution must be documented as requiring application-level authorization and abuse controls when exposed over HTTP.

## Testing rules

Tests must not call live banking APIs. Use deterministic mocked responses. Cover successful behavior, invalid input, provider failures, authentication failures, rate limits, malformed responses, and network failures when modifying provider code.

## Style

Use strict TypeScript, small focused modules, typed domain errors, explicit public exports, and concise conventional-style commit messages.
