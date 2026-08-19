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
│   │   ├── utils/           # Utilities
│   │   ├── types/           # TypeScript types
│   │   └── styles/          # Design system tokens
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── shared/                  # Shared types/schemas
│   ├── types/
│   ├── schemas/
│   └── constants/
├── infra/                   # Infrastructure configs
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Contributing

This is a solo build project for portfolio/demo purposes. Issues and PRs welcome for bug fixes or documentation improvements.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Security

Security vulnerabilities should be reported privately to the maintainer. See [SECURITY.md](SECURITY.md) for details.

---

## Acknowledgments

- Reasoning model provider for AI capabilities
- Qdrant for vector search
- The trust & safety community for defining the problem space
