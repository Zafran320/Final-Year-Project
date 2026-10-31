# Security Boundary — FutureMaker AI

## Current deployment mode

FutureMaker AI is presently a **static frontend demonstration**. It uses fictional sample data and does not implement production authentication, database persistence, real document uploads, or direct model calls. The interface must not be represented as a secure production data service until the server-side controls below are implemented.

## Required controls before real-user launch

The future application/API layer must validate and sanitize every resume, job description, answer, file, and profile field on the server. It must authenticate the user, verify resource ownership, apply per-IP and per-user rate limits, keep AI/model credentials out of browser code, cap model tokens and usage budgets, validate model outputs before display, and restrict CORS to the application’s own domains.

Uploads must receive server-side MIME, size, and extension validation; be renamed outside the web root; and be stored through a private object-storage policy. Resume files and coaching data should be tied to the authenticated owner and deleted when the user requests deletion.

## Release checks

Before the production API is enabled, add a trusted authentication provider, server-side security headers, CSP, HSTS, monitoring, generic client-facing errors, and a reviewed secret-management workflow. No API key, model prompt containing private data, database URL, refresh token, or audit log belongs in browser-accessible source code.
