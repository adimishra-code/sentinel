# Sentinel — Phase 0 Reality Report

Generated from direct code inspection. Docker is not available on this machine; baseline established via `npm test`, `tsc --noEmit`, and `pytest`.

## Baseline test results

| Suite | Result |
|-------|--------|
| Backend (vitest) | 39 passed / 7 files |
| Frontend (vitest) | 6 passed / 2 files |
| Worker (pytest) | 13 passed |
| Backend `tsc --noEmit` | Clean (0 errors) |
| Frontend `tsc --noEmit` | Clean (0 errors) |
| ESLint | **Broken** — no `.eslintrc*` config file exists in backend or frontend |

## What exists (verified)

Backend (~90% per doc, mostly accurate):

- **Auth**: register, login, JWT access (15m) + refresh (7d) with rotation + hashing, logout, getMe, bcrypt (SALT_ROUNDS=10, not 12 as audit doc claims). SSO callback stub exists.
- **Organizations**: CRUD, invite generation (token generated but NOT stored — `acceptInvitation` throws "implemented in Phase 5"), member removal (last-admin guard), role listing, custom-domain middleware.
- **API keys**: create (shown once), list metadata (prefix, created, lastUsedAt — but `lastUsedAt` is never updated on use), revoke; SHA-256 hashed. No per-key rate limits, no scopes enforcement beyond role perms, no IP allowlist.
- **Moderation pipeline**: preprocessing (NFKC normalize, language detect, URL count, caps/repeat), regex heuristics (toxicity, hate, threats, sexual harassment, spam, phishing, self-harm), risk scoring, AI escalation at risk>=0.5, auto case creation, webhook firing. Text only.
- **Cases**: list w/ filters + cursor + page pagination, detail, self-assign, resolve w/ action+rationale, bulk assign/dismiss. ModerationDecision record created on resolve.
- **Appeals**: create (only resolved cases), list, detail, resolve (uphold/reverse/modify). Backend resolve does NOT update the case or content status, does NOT create a notification, does NOT fire a webhook — only audit log + socket emit.
- **Analytics**: overview, content, cases, decisions, appeals (reversal rate), categories, timeseries.
- **Policies**: CRUD, activate, archive, versions.
- **Notifications**: model, service, list/unread/mark-read, HTML email templates, Socket.IO emit. No preferences backend.
- **Audit logs**: list + per-entity trail, append-only (no update/delete routes). Includes request ID.
- **Webhooks**: CRUD, HMAC-SHA256 `X-Sentinel-Signature`, delivery tracking, auto-disable after 5 failures, BullMQ retry w/ exponential backoff, last 50 deliveries retained. **No SSRF protection** (no private/loopback/metadata IP block, no redirect disable, no timestamp in payload, no replay protection).
- **Infrastructure**: Helmet, CORS, rate limiting (express-rate-limit in-memory + Redis-backed org limiter), mongo-sanitize, hpp, xss-clean, request IDs, AppError, /health, /status, /metrics. Socket.IO server initialized but **no JWT auth middleware**; rooms derived from client `join:organization` events (tenant can spoof).

Worker (~80%):

- `main.py`: FastAPI, `/health`, `/benchmark`, `/orchestration/analyze`, `/detection/detect`.
- `orchestration/gemini_client.py`: Gemini client, 3 retries w/ backoff, JSON extraction, low-confidence/severity auto-flag for review. **No request timeout, no circuit breaker, no fallback-to-heuristic at client level**, model name from env (`gemini-2.0-flash-exp`).
- `orchestration/routes.py`: `/orchestration/analyze` — graceful fallback if no API key (returns success:false); otherwise delegates to Gemini. Uncaught exceptions raise 500.
- `detection/engine.py`: NFKC normalize, zero-width stripping, URL count, caps/repeat detection, category patterns. No homoglyph/leetspeak folding, no Hindi/Hinglish lexicons.
- `policy/evaluator.py`: deterministic policy eval, default thresholds, severity bands.
- `shared/config.py`: pydantic-settings `BaseSettings` but all fields have defaults (no required-field enforcement, no min-length secret checks).
- `shared/models.py`: Pydantic models for detection/AI/moderation results.
- `evaluation/benchmark.py`: ~30-line stub, 4 labeled cases, accuracy only.
- `tests/`: test_detection.py (10 tests), test_policy_evaluator.py (3 tests) — all pass.

Frontend (~80%):

- Pages: Login/Register, Dashboard, Cases list, Case detail, Analytics, Policies, Appeals list, Audit logs, Content submit, Settings, 404, Layout.
- `App.tsx`: routes `/`, `/cases`, `/cases/new`, `/cases/:id`, `/analytics`, `/policies`, `/appeals`, `/audit`, `/settings`. **No `/appeals/:id` route** — "Details" link 404s.
- `queries.ts`: typed React Query hooks for cases, analytics, auth. **No `useAppeal(id)` or `useResolveAppeal()` hooks.**
- `services/api.ts`: axios wrapper, `appealsApi.get`/`resolve` exist but unused by UI.
- `stores/authStore.ts`: Zustand + persist middleware — tokens in **localStorage** (access + refresh), not httpOnly cookies.
- `components/CanDo.tsx`: role/permission guard (cosmetic only).
- `components/NotificationDropdown.tsx`: polls REST every 30s, no Socket.IO.
- **Socket.IO client never initialized** — no `lib/socket.ts`, no provider/hook, no reconnect w/ refreshed token.
- Settings page: API Keys "Create" button has **no handler**; Organization tab hardcoded "Acme Corporation"/"acme-corp"; Notifications tab UI-only; Security tab buttons are decorative (2FA, password, sessions all stubs).

SDK (`@sentinel/sdk`):

- `client.ts`: `Sentinel` class with `moderate()`, `getJobStatus()`, `waitForJob()`, `verifyWebhook()`. Timeout + AbortController. **No retry logic, no Idempotency-Key header support.**
- `types.ts`: `ModerateRequest`, `ModerationResult`, `AsyncJobStatus`, `WebhookPayload`.
- `webhook.ts`: `verifyWebhookSignature()` with `timingSafeEqual`.
- `index.ts`: re-exports.
- No tests, no README quickstart code example.

Infra:

- `docker-compose.yml`: 6 services (mongo, redis, qdrant, backend, worker, frontend). Dev bind mounts.
- `docker-compose.prod.yml`: production overrides, no exposed DB ports.
- `Dockerfile`s: multi-stage for all 3 services, non-root user in worker, `dumb-init` in backend.
- `.github/workflows/ci.yml`: lint/test/build for backend/frontend/worker, docker build. **No security scans, no E2E, no deploy.**
- `render.yaml`: Render blueprint.

## Discrepancies vs. section 4/5 document

| # | Document claim | Code reality | Severity |
|---|----------------|--------------|----------|
| 1 | `/appeals/:id` route missing | **Confirmed** — no route in App.tsx | Critical |
| 2 | "Create API Key" button no handler | **Confirmed** — no state/handler in SettingsPage | Critical |
| 3 | Socket.IO client never initialized | **Confirmed** — no client singleton, no provider | Critical |
| 4 | Image/URL auto-allowed risk 0 | **Confirmed** — `moderation.service.ts:178-189` | Critical |
| 5 | `.env` not set up / no config validation | **Partially** — `.env.example` exists but incomplete; config validates only JWT secrets + MONGO_URI, no fail-fast for all required vars; worker config has no required-field/min-length checks | Critical |
| 6 | Org hardcoded "Acme Corp" | **Confirmed** — SettingsPage.tsx:295,302 | High |
| 7 | No password change/reset/sessions | **Confirmed** — no such routes | High |
| 8 | No 2FA | **Confirmed** — no TOTP anywhere | High |
| 9 | Notification prefs UI-only | **Confirmed** — no backend preferences endpoints | Medium |
| 10 | Qdrant zero integration; `backend/ai/` empty | **Confirmed** — `backend/src/modules/ai/` is empty (0 files); no Qdrant client code anywhere in backend | Medium |
| 11 | `gemini-2.0-flash-exp` experimental; no timeout/circuit breaker/fallback | **Partially** — client has retries but no per-request timeout or circuit breaker; backend `analyzeWithAI` falls back to `null` (heuristic only) and does **not** route to review on LLM failure (not fail-safe) | High |
| 12 | `benchmark.py` stub | **Confirmed** — 4 cases, accuracy only | Medium |
| 13 | `sdk/` never inspected | **Now inspected** — client/types/webhook exist, no tests, no Idempotency-Key, no retry | High |
| 14 | Security hardening/CI/CD/deploy not verified | **Confirmed** — no IDOR/tenant-isolation tests, no gitleaks, no image scan, no deploy pipeline | High |

Additional discrepancies found:

- **Audit doc claims bcrypt cost 12; code uses SALT_ROUNDS=10** (`backend/src/modules/auth/auth.utils.ts:7`).
- **Audit doc claims rate limits Free:60/min Pro:300/min Ent:1,200/min; code uses FREE:60 PRO:600 ENTERPRISE:3000** (`backend/src/middleware/rateLimitByOrg.ts:8-12`).
- **Document claims `lastUsedAt` updated on API key use; code never updates it** — auth middleware reads `ApiKey.findOne` but never sets `lastUsedAt`.
- **Document claims appeal resolve updates case/content status, notification, webhook; code does none of those** — `appeals.service.ts:resolveAppeal` only saves appeal + emits socket.
- **`organizationContextMiddleware` trusts client-supplied `X-Organization-ID` header** — for JWT users this is overridden by `requireOrgMembership`, but the header is still accepted as a source.
- **No SSRF protection on webhook URL validation or outbound fetches.**
- **No idempotency key on `/moderate`.**
- **Refresh-token reuse detection not implemented** (rotation revokes old token but no family-level revocation on reuse).
- **Password policy min 8 chars (doc says 10), no common-password rejection.**
- **No `modules/ai/` code** — empty folder contradicts "AI worker" description; AI logic lives in `modules/moderation/` + Python worker.

## Gaps requiring immediate attention (Phase 0-1)

1. `.env.example` incomplete — missing SMTP, Sentry, Qdrant, worker-specific vars; no validation beyond 3 vars.
2. `backend/src/modules/ai/` is empty — document says "backend ai/ folder is empty"; confirmed.
3. No tenant-isolation / IDOR integration tests anywhere.
4. ESLint config missing — `npm run lint` fails.
5. Image/URL content auto-allowed (critical safety gap).

## Phase 0 remaining work

- Docker cannot be run here (no Docker daemon). Stack bootstrapped and verified via direct `npm test`/`tsc`/`pytest` instead.
- Improve `.env.example` with every variable documented + fail-fast startup validation in backend (zod) and worker (pydantic-settings with required fields + min-length secret checks).
