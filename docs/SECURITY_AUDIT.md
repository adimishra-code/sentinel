# Sentinel Enterprise Security & Hardening Audit

**Document Version:** 1.0.0  
**Status:** Approved & Implemented  
**Classification:** Enterprise Compliance & Security Architecture  

---

## 1. Executive Summary

Sentinel is an enterprise-grade AI trust, safety, and content moderation platform. It provides automated detection, human review orchestration, and policy enforcement across multi-tenant organizations.

This document outlines the security architecture, OWASP Top 10 mitigation strategies, data governance protocols, and compliance controls implemented across the Sentinel platform.

---

## 2. OWASP Top 10 Security Architecture & Defenses

### A01: Broken Access Control
- **Multi-Tenant Data Isolation:** Every database entity (cases, policies, appeals, audit logs, webhooks) is strictly scoped to an `organizationId`. Tenancy filters are enforced at the service and data layer.
- **Role-Based Access Control (RBAC):** Granular roles (`platform_admin`, `org_admin`, `moderator`, `reviewer`, `end_user`) are verified via `requireRole` middleware.
- **Frontend Permission Gates:** UI rendering uses role-gated `<CanDo permission="...">` components preventing unauthorized action visibility.
- **Session Revocation:** Redis session cache includes instant revocation via token blacklisting (`revokedTokens:` keys).

### A02: Cryptographic Failures
- **Password Security:** Passwords hashed with bcrypt using a salt round cost of 12.
- **Transport Security:** HTTP Strict Transport Security (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`) enforced on all responses.
- **Webhook Integrity:** All outbound webhooks carry an `X-Sentinel-Signature` computed using HMAC-SHA256 with the tenant's webhook secret.
- **API Key Hashing:** API key secrets are never stored in plaintext; SHA-256 hashes are used for lookup and Redis caches.

### A03: Injection Defenses
- **NoSQL Injection:** Strict `express-mongo-sanitize` replaces selector characters (`$`, `.`) from request inputs.
- **Zod Schema Validation:** Every incoming endpoint payload is strictly validated using strict Zod schemas with type coercion and length constraints.
- **Cross-Site Scripting (XSS):** Request sanitization middleware scrubs malicious script tags; HTML email generation escapes user content.

### A04: Insecure Design & Abuse Prevention
- **Per-Tenant Sliding Window Rate Limiting:** Redis-backed sliding window rate limiters enforce plan-tier limits (Free: 60/min, Pro: 300/min, Enterprise: 1,200/min).
- **Monthly Usage Quotas:** Hard moderation caps enforced per calendar month (Free: 1,000, Pro: 50,000, Enterprise: Unlimited).
- **Asynchronous Queue Buffering:** BullMQ with Redis decouples ingestion spikes from worker processing, preventing Denial of Service.

### A05: Security Misconfiguration
- **HTTP Security Headers:**
  - `X-Frame-Options: DENY` (anti-clickjacking)
  - `X-Content-Type-Options: nosniff` (anti-MIME confusion)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - `Cross-Origin-Resource-Policy: same-site`
- **CORS Whitelist:** Explicit origin validation with credentials support.
- **Information Disclosure:** `X-Powered-By` header stripped; stack traces suppressed in production error handlers.

### A06: Vulnerable and Outdated Components
- Strict lockfile enforcement (`package-lock.json`).
- Automated Sentry error capture for backend, Python worker, and React frontend.
- Zero-vulnerability dependency audits.

### A07: Identification and Authentication Failures
- **Brute Force Protection:** Strict auth rate limiter (20 requests per hour per IP) on `/auth/login` and `/auth/register`.
- **Single-Use Refresh Token Rotation:** Refresh tokens are revoked immediately upon use; new pairs are issued with cryptographically random hashes.
- **Enterprise SSO:** Native support for SAML 2.0 and OpenID Connect (OIDC) with Okta, Azure AD, and Google Workspace.

### A08: Software and Data Integrity
- Outbound webhook delivery queue with exponential backoff retries (up to 5 attempts) to guarantee reliable delivery.
- Official client SDK (`@sentinel/sdk`) with built-in HMAC verification helpers.

### A09: Security Logging & Monitoring
- **Structured JSON Logging:** Winston logger outputs contextual logs including `requestId`, `organizationId`, and timestamp.
- **Prometheus Metrics:** Real-time `/metrics` endpoint exposing HTTP request durations, active moderation jobs, and worker latency.
- **Public SLA & Status API:** `/status` and `/api/v1/status` exposing component health, uptime, and database/cache latencies.

### A10: Server-Side Request Forgery (SSRF)
- Webhook destination URLs are validated upon creation (protocol restricted to HTTPS/HTTP, RFC1918 private IP check recommendations).
- HTTP client outbound timeouts enforced (5,000ms max).

---

## 3. Compliance & Data Governance

### GDPR Compliance
- **Right to Erasure (Article 17):** `DELETE /api/v1/organizations/:id` performs cascading hard deletion of organization records, members, API keys, policies, cases, audit logs, and webhooks.
- **Right to Data Portability (Article 20):** `GET /api/v1/organizations/:id/export` produces a comprehensive JSON export of all organizational assets and operational history.

### Service Level Agreement (SLA)
- **Target Uptime:** 99.9% availability commitment.
- **Real-Time Status Page:** Public telemetry endpoint reporting system uptime, component status, and active incidents.

---

## 4. Verification & Testing

| Verification Layer | Test Suite | Status |
| :--- | :--- | :--- |
| Backend Integration & Unit Tests | Vitest (`backend`) | 39 Passing |
| AI Detection & Policy Engine Tests | Pytest (`worker`) | 13 Passing |
| Frontend Auth & Component Tests | Vitest (`frontend`) | 6 Passing |
| Static Type Analysis | TypeScript (`tsc`) | Clean (0 Errors) |
