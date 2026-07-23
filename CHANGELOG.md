# Changelog

All notable changes to the MIRA project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-23

### Added
- **Real-Time LLM Streaming (SSE)**: Native streaming proxy for Groq, Gemini, and Anthropic APIs achieving ~300ms Time-to-First-Token in `/api/companion/chat`.
- **Accessibility & Sensory Comfort (`prefers-reduced-motion`)**: Reactive hook `useReducedMotion.ts` integrated into `WorldAmbientVisuals.tsx` to automatically pause keyframe animations and continuous particles for users with vestibular sensitivities.
- **RAG Semantic Memory (`pgvector`)**: Supabase Postgres migration `20260727000000_companion_vector_memories.sql` with HNSW vector index and `match_companion_memories` RPC search for contextual memory retrieval in `MemoryEngine.ts`.
- **Voice Assistant STT (`useSpeechRecognition`)**: Native Web Speech API voice input hook and 🎙️ dictation button in `CompanionChatModal.tsx` for hands-free child interaction.
- **Therapeutic AI Micro-Stories**: Engine `StoryGenerator.ts` and interactive reader `StoryReaderModal.tsx` to generate personalized 3-chapter bedtime stories based on weekly routine achievements and value milestones.
- **PWA Service Worker (`public/sw.js`)**: Network-first with cache-fallback strategy for PWA offline shell capability.
- **PDF Emotional Evolution Report**: Client-side PDF generation engine using `jspdf` for printing child emotional check-in trends and value growth.
- **GitHub Actions CI (`ci.yml`)**: Continuous integration workflow validating lint, TypeScript typecheck, and Vitest test suite on every PR and main commit.
- **Security Policies (`SECURITY.md`)**: Comprehensive COPPA / GDPR child privacy policy, PII obfuscation specification, and vulnerability disclosure SLA.

### Refactored
- **Home Page Modularization**: Extracted state orchestration, Supabase realtime channels (`spark_ledger`, `child_badges`), and side-effects from `src/app/home/page.tsx` into clean custom hook `src/hooks/useHomeState.ts`.
- **Distributed Rate Limiting**: Upgraded `RateLimiter.ts` to support Upstash Redis REST pipelines in Serverless (Vercel) environments with zero-config in-memory fallback for local development.

### Fixed
- Fixed memory leakage in `useReducedMotion` and `useSpeechRecognition` hooks.
- Eliminated all ESLint warnings and errors across the codebase (0 errors, 0 warnings).
- Resolved security definer search path vulnerabilities in Supabase migrations (`SET search_path = public, extensions, pg_temp`).

### Security
- COPPA & GDPR compliant PII sanitization middleware (`PiiSanitizer.ts`).
- Enforced Row Level Security (RLS) across all Supabase tables (`companion_memories`, `child_badges`, `companion_embeddings`).
