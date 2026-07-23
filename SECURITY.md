# Security Policy & Child Privacy (COPPA / GDPR Compliance)

MIRA is a neurodiversity-affirming growth platform designed specifically for children and their families. Safeguarding children's personal information and ensuring robust infrastructure security are our highest priorities.

---

## 1. Child Data Privacy & Compliance (COPPA / GDPR-K)

### PII Obfuscation & Minimization
- **Pre-LLM Sanitization**: All prompts sent to third-party LLM APIs (Groq, Google Gemini, Anthropic) pass through our `PiiSanitizer` middleware (`src/lib/security/PiiSanitizer.ts`). Real child names, family surnames, and sensitive personal markers are replaced with opaque tokens (`[CHILD_NAME]`, `[FAMILY_NAME]`) before leaving our server.
- **De-obfuscation**: Tokens are mapped back to actual names locally on our server when rendering responses back to the client interface.
- **Zero Third-Party Training**: Provider APIs are configured with zero data-retention for training models.

### Data Storage & Isolation
- **Row Level Security (RLS)**: Database tables in Supabase Postgres operate under strict RLS policies. A child's records (routines, emotional check-ins, microtasks, sparks) can only be accessed by authenticated members belonging to the same `family_id`.
- **Search Path Isolation**: All database functions (`SECURITY DEFINER`) enforce an explicit `search_path = public, extensions, pg_temp` to eliminate schema confusion and privilege escalation attacks.

---

## 2. API Security & Rate Limiting

- **Rate Limiting**: Endpoints (`/api/companion/chat`, check-ins) are protected by a hybrid sliding-window rate limiter (`src/lib/security/RateLimiter.ts`). In production Serverless environments (Vercel), requests are throttled via Upstash Redis REST pipelines. In local/static environments, an in-memory sliding-window fallback is enforced.
- **HTTPS & Content Security**: Production deployments require TLS 1.3 encryption for all data in transit.

---

## 3. Vulnerability Reporting

If you discover a potential security vulnerability within MIRA, please report it to our team immediately:

- **Email**: `security@mira-app.org`
- **Response SLA**: We acknowledge receipt of vulnerability reports within **24 hours** and aim to provide a resolution or patch within **7 business days**.

Please refrain from publicly disclosing vulnerabilities prior to coordinated resolution.

---

## 4. Supported Versions

| Version | Supported |
|---|---|
| 1.0.x | Yes |
| < 1.0 | No |
