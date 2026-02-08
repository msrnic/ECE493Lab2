# ECE493Lab2 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-08

## Active Technologies
- HTML5, CSS3, JavaScript (ES2020+) + Browser Fetch API, Web Crypto API (idempotency key), Node.js 20 LTS runtime, Express-style HTTP routing, Playwright, Vitest, c8 (001-user-registration)
- Backend API persistence for `UserAccount`, `ConfirmationToken`, `RegistrationAttempt`, and `EmailOutboxJob` records (001-user-registration)
- HTML5, CSS3, JavaScript (ES2020+) + Browser Fetch API, Web Crypto API (idempotency-key generation), Node.js 20 LTS runtime, Express-style HTTP routing, email delivery integration, Playwright, Vitest, c8 (001-registration-spec-update)
- Backend persistence for `UserAccount`, `ConfirmationToken`, `RegistrationAttempt`, `RegistrationSubmissionIntent`, and `EmailOutboxJob` (001-registration-spec-update)

- HTML5, CSS3, JavaScript (ES2020+) + Browser Fetch API, Web Crypto API for idempotency-key generation, payment gateway hosted-fields/tokenization SDK, Node.js tooling for Playwright/Vitest/c8 (001-registration-payment)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

HTML5, CSS3, JavaScript (ES2020+): Follow standard conventions

## Recent Changes
- 001-registration-spec-update: Added HTML5, CSS3, JavaScript (ES2020+) + Browser Fetch API, Web Crypto API (idempotency-key generation), Node.js 20 LTS runtime, Express-style HTTP routing, email delivery integration, Playwright, Vitest, c8
- 001-user-registration: Added HTML5, CSS3, JavaScript (ES2020+) + Browser Fetch API, Web Crypto API (idempotency key), Node.js 20 LTS runtime, Express-style HTTP routing, Playwright, Vitest, c8

- 001-registration-payment: Added HTML5, CSS3, JavaScript (ES2020+) + Browser Fetch API, Web Crypto API for idempotency-key generation, payment gateway hosted-fields/tokenization SDK, Node.js tooling for Playwright/Vitest/c8

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
