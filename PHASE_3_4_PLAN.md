# Phase 3 & 4 Implementation Plan

**Scope:** AI Orchestration (Gemini), Policy Engine, Cases, Moderator Dashboard, Realtime  
**Prerequisites:** Phase 0 ✅, Phase 1 ✅, Phase 2 ✅

---

## Phase 3 Deliverables

### 1. AI Orchestration (Gemini)
- [x] Gemini client wrapper (configurable model)
- [x] Context builder (retrieves messages, history, policy)
- [x] Structured output schema
- [x] Prompt engineering (system + policy + context + content)
- [x] Fallback handling

### 2. Policy Engine
- [x] Policy model (versioned, immutable)
- [x] Policy categories with thresholds
- [x] Action rules (first offense, repeat offense)
- [x] Policy CRUD API

### 3. Cases Module
- [x] Case model (content → risk → case)
- [x] Case creation from high-risk content
- [x] Case status management
- [x] Case API endpoints

## Phase 4 Deliverables

### 1. Moderator Dashboard
- [x] Case queue (sorted by priority/severity)
- [x] Case filters (status, category, assignee)
- [x] Case detail view
- [x] Moderator actions (approve, reject, escalate)

### 2. Realtime (Socket.IO)
- [x] Server-side Socket.IO setup
- [x] Case events (created, assigned, resolved)
- [x] Client-side Socket.IO integration

### 3. Case Investigation
- [x] Full context display
- [x] AI reasoning display
- [x] Decision recording

---

Starting implementation...
