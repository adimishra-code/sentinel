# Phase 2 Implementation Plan — Ingestion, Detection, Risk Scoring

**Scope:** Content ingestion, preprocessing, fast detection, risk scoring  
**Prerequisites:** Phase 0 ✅, Phase 1 ✅  
**Target:** Content moderation pipeline from submission to risk assessment

---

## Deliverables

### 1. Content Module
- [x] Content model (MongoDB)
- [x] Content ingestion API endpoint
- [x] Preprocessing pipeline (normalization, language detection, metadata extraction)
- [x] Content validation and sanitization

### 2. Detection Engine (Fast Layer)
- [x] Deterministic rules engine
- [x] Pattern matching (profanity, URLs, repeated chars, etc.)
- [x] Heuristic detectors
- [x] Fast classifier integration point (Phase 2+)

### 3. Risk Scoring Engine
- [x] Risk calculation from detection signals
- [x] Confidence scoring
- [x] Category-based severity aggregation
- [x] Escalation threshold logic

### 4. Worker Integration
- [x] Detection job queue (Redis/BullMQ)
- [x] Worker service endpoints
- [x] Async processing pipeline

### 5. API Endpoints
```
POST /api/v1/moderate        — Submit content for moderation
GET  /api/v1/content/:id     — Get content details
GET  /api/v1/content         — List content (paginated, filtered)
```

---

## Architecture

```
POST /moderate
  ↓
Validate & Preprocess
  ↓
Fast Detection Layer (sync)
  ├─ Pattern matching
  ├─ Deterministic rules
  └─ Heuristics
  ↓
Calculate Risk Score
  ↓
Decision:
  - Low risk → Auto-allow
  - High risk/uncertain → Escalate to Case (Phase 3)
  ↓
Return response
```

---

## Implementation Order

1. Content model & preprocessing
2. Detection rules engine
3. Risk scoring logic
4. Moderate endpoint
5. Worker queue integration

Starting implementation now...
