# Sentinel

**Multi-tenant AI Trust & Safety Operations Platform**

Infrastructure for organizations to detect harmful content, understand context, enforce configurable policy, and run human-in-the-loop moderation with full auditability.

---

## Problem Statement

Online communities, marketplaces, forums, and platforms face an impossible moderation challenge: content volume exceeds human capacity, automated tools lack context, and regulatory pressure demands accountability. Sentinel provides the infrastructure layer — not a toy classifier, not a chatbot wrapper — that lets organizations build trust and safety operations that are **explainable, auditable, and policy-driven**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SENTINEL ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌────────────────┐   │
│  │  Client  │───▶│  API GW  │───▶│  Ingestion   │───▶│  Fast Detect   │   │
│  │  (SDK)   │    │  (v1)    │    │  Pipeline    │    │  (Rules/ML)    │   │
│  └──────────┘    └──────────┘    └──────────────┘    └───────┬────────┘   │
│                                                               │            │
│                                              ┌────────────────┴────────┐   │
│                                              ▼                         ▼   │
│                                    ┌─────────────────┐       ┌────────────┐│
│                                    │  Clear Allow/   │       │  Ambiguous ││
│                                    │  Block Decision │       │  / High    ││
│                                    └─────────────────┘       │  Context   ││
│                                                                └─────┬──────┘│
│                                                                      │       │
│                                              ┌──────────────────────┘       │
│                                              ▼                              │
│                                    ┌─────────────────────┐                  │
│                                    │  Reasoning Model   │                  │
│                                    │  (Configurable)   │                  │
│                                    │  Structured Output  │                  │
│                                    └──────────┬──────────┘                  │
│                                               │                             │
│                                               ▼                             │
│                                    ┌─────────────────────┐                  │
│                                    │  Policy Engine      │                  │
│                                    │  (Deterministic)    │                  │
│                                    └──────────┬──────────┘                  │
│                                               │                             │
│                    ┌──────────────────────────┼──────────────────────────┐  │
│                    ▼                          ▼                          ▼  │
│            ┌─────────────┐            ┌─────────────┐            ┌─────────┐│
│            │  AUTO-ALLOW │            │  AUTO-ACTION│            │  HUMAN  ││
│            │  (low risk) │            │  (med risk) │            │  REVIEW ││
│            └─────────────┘            └─────────────┘            └────┬────┘│
│                                                                        │    │
│                                                            ┌───────────┘    │
│                                                            ▼                │
│                                                   ┌─────────────────┐       │
│                                                   │  Moderator UI   │       │
│                                                   │  (Realtime)     │       │
│                                                   └────────┬────────┘       │
│                                                            │                │
└────────────────────────────────────────────────────────────┼────────────────┘
                                                             │
                                    ┌────────────────────────┼────────────────────────┐
                                    ▼                        ▼                        ▼
                           ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
                           │  Audit Logs     │      │  Analytics      │      │  Integrations   │
                           │  (Immutable)    │      │  (Drill-downs)  │      │  (Webhooks)     │
                           └─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Core Modules (Modular Monolith)

| Module | Responsibility |
|--------|----------------|
| **Auth** | JWT authentication, refresh tokens, session management |
| **Organizations** | Multi-tenancy, membership, API keys |
| **Content** | Ingestion, preprocessing, storage, provenance |
| **Detection** | Fast classifiers, rules, heuristics, URL checks |
| **AI Orchestration** | Reasoning model context building, structured outputs, validation |
| **Policies** | Category definitions, thresholds, actions, immutable versions |
| **Cases** | Case lifecycle, evidence, decisions, assignments |
| **Appeals** | User appeals, reviewer workflow, resolution |
| **Analytics** | Dashboards, trends, drill-downs, moderator metrics |
| **Integrations** | Webhooks, API keys, signed events, replay protection |
| **Notifications** | In-app, email, Slack, Discord |
| **Audit** | Immutable append-only logging of every decision |
| **Evaluation** | Benchmarks, regression tracking, calibration |

---

## Safety Principles (Non-Negotiable)

1. **AI is never authoritative** — The policy/risk engine is deterministic. Severe or uncertain outcomes always route to a human.
2. **No hidden chain-of-thought** — Only structured, evidence-based rationale fields are stored or shown.
3. **Reconstructable decisions** — Every decision must be reproducible against the exact policy version active when it was made.
4. **Multi-tenant isolation at query level** — Not just at the API boundary; every DB query includes the org filter.
5. **Historical behavior informs risk, not guilt** — Sensitive attributes are never inferred unnecessarily.
6. **Retrieval is evidence, not authority** — Qdrant similar-case lookup provides context, never makes decisions.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js 20+, Express, TypeScript |
| **Database** | MongoDB 7+ (Mongoose ODM) |
| **Cache/Queue** | Redis 7+ (ioredis) |
| **Vector Store** | Qdrant 1.8+ |
| **AI Model** | Configurable Reasoning Model (pluggable provider) |
| **Worker** | Python 3.11+ (FastAPI) |
| **Frontend** | React 18, TypeScript, Vite |
| **State** | TanStack Query, Zustand |
| **Realtime** | Socket.IO |
| **Styling** | Tailwind CSS (design system tokens) |
| **Validation** | Zod |
| **Logging** | Winston |
| **Testing** | Vitest (unit/integration), Playwright (E2E) |
| **Infra** | Docker Compose (local), Cloudflare + Managed Services (prod) |

---

## Local Setup

### Prerequisites
- Docker Desktop (or Docker Engine + Compose)
- Node.js 20+ (for local development outside Docker)
- Python 3.11+ (for worker development)
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/adimishra-code/sentinel.git
cd sentinel

# Copy environment template
cp .env.example .env
# Edit .env with your values (JWT secrets, API keys, etc.)

# Start all services
docker compose up -d

# Verify health
curl http://localhost:3000/api/v1/health
# {"status":"ok","version":"v1","timestamp":"..."}

# Frontend available at http://localhost:5173
# Backend API at http://localhost:3000/api/v1
# Worker at http://localhost:8000
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | ≥32 char secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | ≥32 char secret for refresh tokens |
| `MONGO_ROOT_PASSWORD` | Yes | MongoDB root password |
| `MODEL_API_KEY` | Phase 3+ | Reasoning model API key |
| `QDRANT_API_KEY` | Optional | Qdrant API key if auth enabled |

See `.env.example` for complete list.

### Development Workflow

```bash
# Backend (with hot reload)
cd backend && npm run dev

# Frontend (with HMR)
cd frontend && npm run dev

# Worker (with auto-reload)
cd worker && uvicorn src.main:app --reload

# Run tests
npm run test          # backend
cd frontend && npm run test
cd worker && pytest
```

---

## Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **0** | Foundation: repo, Docker, security baseline, design system, API v1 skeleton | ✅ Complete |
| **1** | Auth, Organizations, RBAC, DB foundation | 🔄 In Progress |
| **2** | Ingestion, Detection Engine, Risk Scoring | ⏳ Planned |
| **3** | Reasoning Model Orchestration, Policy Engine, Cases | ⏳ Planned |
| **4** | Moderator Dashboard, Case Investigation, Realtime | ⏳ Planned |
| **5** | Audit, Analytics, Notifications, Integrations | ⏳ Planned |
| **6** | Appeals, Retrieval, Copilot, Evaluation Lab | ⏳ Planned |
| **7** | Multilingual (Hindi/Hinglish), Advanced Abuse, Hardening | ⏳ Planned |
| **8** | Deployment, Load Testing, Security Review, Docs, Demo | ⏳ Planned |

**MVP Target**: End of Phase 4 — full loop from content submission → risk score → case → realtime moderator review → decision → audit trail.

---

## API Documentation

API is versioned at `/api/v1`. OpenAPI/Swagger docs available at `/api/docs` when running.

Key endpoints:
- `POST /api/v1/moderate` — Submit content for moderation
- `GET /api/v1/cases` — List cases (with filters)
- `GET /api/v1/cases/:id` — Case investigation view
- `POST /api/v1/cases/:id/decision` — Record moderator decision
- `GET /api/v1/analytics` — Analytics dashboard data

---

## Project Structure

```
sentinel/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── config/          # Configuration
│   │   ├── middleware/      # Express middleware
│   │   ├── modules/         # Feature modules
│   │   ├── utils/           # Shared utilities
│   │   └── types/           # TypeScript types
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── worker/                  # Python AI service
│   ├── src/
│   │   ├── detection/       # Fast classifiers
│   │   ├── orchestration/   # Reasoning Model Orchestration
│   │   ├── policy/          # Policy evaluation
│   │   └── evaluation/      # Benchmarks
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # React + Vite + TS
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── hooks/           # Custom hooks
│   │   ├── stores/          # Zustand stores
│   │   ├── pages/           # Page components
│   │   └── services/        # API client layer
│   ├── nginx.conf           # Production Nginx config
│   ├── Dockerfile
│   └── vite.config.ts
├── infra/mongo/             # MongoDB init scripts
├── docker-compose.yml       # Local dev
├── docker-compose.prod.yml  # Production overrides
├── render.yaml              # Render deployment blueprint
├── .github/workflows/ci.yml # GitHub Actions CI
├── .env.example
└── README.md
```

---

## Deployment

### Option 1 — Docker (Local / Self-hosted)

```bash
# 1. Clone and configure
git clone https://github.com/yourname/sentinel.git
cd sentinel
cp .env.example .env
# Edit .env with your values — especially JWT_SECRET and GEMINI_API_KEY

# 2. Start all services
docker compose up -d

# 3. Check services are running
docker compose ps
curl http://localhost:3000/api/v1/health
curl http://localhost:8000/health
```

### Option 2 — Render.com

1. Push repository to GitHub
2. Create a new Blueprint on [render.com](https://render.com) pointing to your repo
3. Render will auto-detect `render.yaml` and provision all services
4. Set the following secrets in the Render dashboard:
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/)
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` — for email notifications (optional)
5. Update `CORS_ORIGIN` in the backend service with your frontend URL

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token signing secret |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `GEMINI_API_KEY` | ⚠️ | Gemini API key — AI analysis disabled without it |
| `CORS_ORIGIN` | ✅ | Allowed frontend origin(s) |
| `SMTP_HOST` | ➖ | SMTP server (optional — email notifications) |
| `SMTP_USER` | ➖ | SMTP username |
| `SMTP_PASS` | ➖ | SMTP password / app password |

---

## API Reference

All API endpoints are prefixed with `/api/v1/`.

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Moderation | `POST /moderate`, `GET /content`, `GET /content/:id` |
| Cases | `GET /cases`, `GET /cases/:id`, `POST /cases/:id/resolve`, `POST /cases/:id/assign` |
| Appeals | `POST /appeals`, `GET /appeals/:id`, `POST /appeals/:id/resolve` |
| Policies | `GET /policies`, `POST /policies`, `POST /policies/:id/activate` |
| Analytics | `GET /analytics/overview`, `GET /analytics/categories` |
| Notifications | `GET /notifications`, `POST /notifications/mark-read` |
| Audit | `GET /audit`, `GET /audit/:type/:id` |
| Integrations | `GET /integrations/webhooks`, `POST /integrations/webhooks` |

Worker endpoints (internal, port 8000):

| Endpoint | Description |
|---|---|
| `POST /orchestration/analyze` | Full AI content analysis |
| `POST /detection/detect` | Fast pattern-based detection |
| `GET /benchmark` | Run detection benchmark |

---

## Contributing

Issues and PRs welcome for bug fixes or documentation improvements.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Security

Security vulnerabilities should be reported privately to the maintainer.

---

## Acknowledgments

- Google Gemini for AI reasoning capabilities
- Qdrant for vector search
- The trust & safety community for defining the problem space
