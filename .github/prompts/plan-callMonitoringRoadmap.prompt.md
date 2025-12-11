Plan: Modernize Call Monitoring UX

TL;DR — Improve operator efficiency and safety by adding secure auth, better transcript + listen UX, takeover controls, tiled live-monitor view, tags/feedback, and recording backup/proxying. Implementation will add a few DB tables, minor API changes, a listen-proxy, and frontend UX components for tiled monitoring, whisper pills, and feedback.

1) Goals
- Make Live Calls Panel modern, efficient, and safe for human operators monitoring multiple AI-assisted sales calls.
- Reduce operator cognitive load: clearer transcripts, merged AI/user fragments, inline controls to listen/take-over/whisper, and tiled view for multi-monitoring.
- Improve data reliability and privacy: record backup, proxy listen streams, auth and tenant isolation, and audit trails.

2) High-level Steps (5 primary themes)
- Security & Access: add Auth, tenant mapping, protect HTTP & WS, audit logs, and scaffold listen-proxy.
- Transcript & Listen UX: show transcripts in Listen modal, incremental updates, merged fragments, speaker labels, copy/export.
- Takeover & Control: allow Take Over from modal with server locks and audit; reflect control state in UI.
- Recording & Backup: fetch and store final recordings, serve via authenticated endpoints, and display stored URLs in UI.
- Monitoring UX & Features: tiled live-monitor view, whisper pills, call tags, call duration, feedback capture, focus mode.

3) Specific Feature Gaps & Implementation Tasks

A. Call duration
- Add `duration_seconds` (persisted or computed) and include in API + websocket `call-upsert`.
- Compute on end-of-call or at response time.
- Frontend: add duration column and realtime timer for in-progress calls.

B. Call tags (from end-of-call-report)
- Parse tags from `end-of-call` artifact and store as normalized `CallTag` table or `tags` JSON field on `Call`.
- Expose tag filter and display in UI; include tags in `call-upsert` websocket message.

C. Listen modal auto-populate transcript
- When Listen opens, fetch current `live_transcript` and subscribe to `transcript-update` events for that call.
- Show speaker labels and toggle timestamps.
- Allow copy/export and search.

D. Take Over while listening
- Add Take Over button in Listen modal that calls `POST /api/{client}/calls/{call}/force-transfer` or a specific `takeover` endpoint.
- Server: mark call `locked_by` / `in_control_by` with timestamps and broadcast `control-change` events over WS.
- Prevent conflicting actions and log audit trail.

E. Monitor multiple calls (tiled view)
- Add a tiled layout mode (grid of small tiles) showing key controls (listen, take-over, whisper pills, live transcript snippet).
- Implement audio management per tile: mute/unmute, volume, and ensure user gesture for audio autoplay.
- Persist pinned tiles (localStorage or per-user DB table).

F. Whisper pills (quick messages)
- Add UI pills with common whisper messages; clicking sends a small control payload to upstream via `control_url` or server-side relay.
- Store pills as `CallAnnotation` rows and broadcast `annotation-upsert` to dashboards.

G. Live calls focused view
- Add filter/view that shows only live/in-progress calls with larger tiles and fewer distractions.
- Keyboard shortcuts for quick actions.

H. Feedback (rating + free text)
- Add `CallFeedback` table and endpoints `POST /calls/{call}/feedback` and `GET /calls/{call}/feedback`.
- UI: 5-star rating and optional comment box shown on call record or after call ends.

I. Basic Auth / multi-tenancy
- Add `User`, `ApiKey`/`Token`, and `UserClient` tables; require auth for HTTP and WS.
- Enforce tenant scoping for all endpoints and websocket broadcasts.
- Harden CORS.

J. Recording backup & proxying
- On `end-of-call-report`, enqueue a background fetch job to download `recordingUrl` and store in object storage (or server filesystem for PoC).
- Create `CallRecording` table: `original_url`, `stored_url`, `fetched_at`, metadata.
- Serve stored recordings via authenticated endpoint and update UI to show stored URL.

K. Masking listenURL (proxy)
- Implement a server-side proxy endpoint that authenticates clients and opens an upstream connection to the provider listen stream and forwards binary frames to the dashboard WS or to a server-signed short-lived URL.
- Replace raw provider `listenUrl` in websocket `call-upsert` with proxied `listenProxyUrl` or proxy token.
- Add access logs and TTL tokens for proxied streams.

4) DB/API changes (summary)
- New/modified tables: `Call.duration_seconds`, `Call.tags` or `CallTag` table, `CallAnnotation`, `CallFeedback`, `CallRecording`, `User`, `ApiKey`/`Token`, `UserClient`, `DashboardPreference` (optional).
- Websocket message changes: ensure `transcript-update` includes `callId`, appended chunk, and full transcript; `call-upsert` add `durationSeconds`, `tags`, `listenProxyUrl` (or `listenProxyToken`), and `recordingStoredUrl`.
- Endpoints to add: `POST /calls/{call}/annotations`, `POST /calls/{call}/feedback`, `POST /calls/{call}/takeover` (or reuse `force-transfer`), auth endpoints and token management, recording fetch worker trigger endpoint (or background task on webhook).

5) Prioritized Roadmap (milestones)

Milestone 1 — Secure baseline & proxy scaffold (Effort: Medium)
- Add API token auth and protect WS and HTTP.
- Add `User`/`ApiKey`/`UserClient` DB models and tenant checks.
- Harden CORS and restrict debug endpoints.
- Scaffold a simple listen-proxy endpoint that can be iterated on.

Milestone 2 — Transcript & Listen UX improvements (Effort: Small–Medium)
- Show transcripts in Listen modal (initial + incremental updates via WS).
- Merge fragments & show role prefixes (already implemented server-side logic exists).
- Add copy/export and timestamp toggles.
- Extract tags from `end-of-call-report` and display them in UI.

Milestone 3 — Takeover & control (Effort: Medium)
- Add takeover flow within modal and server-side `locked_by` logic, broadcast control state.
- Add operator-level permissions and audit logs.

Milestone 4 — Recordings backup & secure playback (Effort: Large)
- Background fetch and store recordings; add `CallRecording` table and serve via authenticated endpoint.
- Replace exposing provider recording URLs with stored URLs.

Milestone 5 — Tiled monitoring, whisper pills, feedback (Effort: Large)
- Add tiled grid mode for multi-call monitoring with per-tile audio control.
- Add whisper pill UI + backend `CallAnnotation` and `CallFeedback` capture.
- Persist user dashboard preferences and add reporting/analytics for tags/feedback.

6) Security & privacy notes
- Never expose raw provider URLs to browsers; proxy or sign short-lived tokens.
- Authenticate all WS and HTTP APIs; scope access to tenant/client.
- Encrypt recordings at rest; apply retention policies and deletion workflows.
- Audit all `force-transfer`/control actions and keep operator identity.
- Sanitize transcript text display and escape HTML.
- Confirm legal consent/recording laws for monitored calls and store consent status if required.

7) UX suggestions
- Per-call compact pills for quick actions (pin, annotate, escalate).
- Keyboard shortcuts for listening, switching tiles, and takeover.
- Timeline scrub with transcript-linked markers (longer-term feature).
- Admin audit feed for transfer/annotation/whisper events.

Next options I can take for you
- Convert this plan into JIRA-style tickets (one file per milestone). 
- Generate DB migration SQL and API contract snippets for Milestone 1 or 2.
- Scaffold minimal server-side proxy example and auth middleware PoC.

Which one should I do next?


8) Additional requested tasks
- Login functionality & agent forwarding number
	- Add authentication (simple session or token-based) and a per-user profile where agents can set their forward/transfer number.
	- API: add `POST /auth/login`, `POST /auth/logout`, `GET /me` and a profile endpoint `PUT /me/profile` to store `forwarding_number`.
	- DB: add `User` table with fields for `username`, `password_hash`, `role`, `client_id` and `forwarding_number`.

- Beautify the UI with shadcn
	- Integrate `shadcn/ui` primitives or comparable design system components into the frontend.
	- Revamp the dashboard styles: call list, tiles, modal, and controls using consistent tokens (spacing, colors, typography).
	- Work: create a small style guide, update existing components to use shared primitives, and add dark/light theme toggle.

- Migrate from sqlite to PostgreSQL
	- Replace `sqlite` engine with PostgreSQL (update `DATABASE_URL`) and add migration tooling (e.g., Alembic or SQLModel-compatible migrations).
	- DB changes: update connection setup, prepare migration scripts for new tables (`User`, `CallFeedback`, `CallRecording`, etc.).
	- Update CI and local dev environment to run a Postgres instance (docker-compose or testcontainers) and update docs.

- Create proper Dev (local), Test & Prod Deployment environments
	- Add environment-specific configuration files and examples (`.env.dev`, `.env.test`, `.env.prod`) and a runtime config loader.
	- Create Dockerfile(s), `docker-compose` for local dev (postgres, redis, worker), and deployment manifests for Test/Prod (Helm/Kustomize or simple cloud templates).
	- Add CI pipelines for lint/test/build/deploy stages; automate DB migrations during deploy and add feature flags or toggles for risky features.

These items have been appended to the roadmap and added to the project TODO list for prioritization.

9) CI/CD practices — GitHub branches, PRs, and Actions (step-by-step)

- Branch strategy
	- `main` = production, `develop` = integration/staging, `feature/*`, `fix/*`, `hotfix/*`, `release/*`.
	- Protect `develop` and `main` with required status checks and PR reviews.

- Local developer workflow (quick start)
	1. Create feature branch: `git checkout -b feature/your-feature`.
 2. Run local checks: `pip install -r backend/requirements.txt && pytest` and `npm install && npm run build` in `frontend/`.
 3. Commit small changes, push: `git push origin feature/your-feature`.
 4. Open PR → target `develop` (or `main` for hotfixes).

- Pull request rules
	- Require at least one reviewer, passing CI checks, and clear PR description with screenshots/steps.
	- Use PR templates with checklist: tests, lint, migrations, changelog.

- GitHub Actions CI (minimal)
	- `ci.yml` (run on PRs): install Python & Node, run lint, run backend tests (`pytest`), run frontend build/tests, publish status checks.
	- Fail PR if any step fails; show logs in the Actions tab.

- Deployment workflows (recommended)
	- `deploy-dev.yml`: on push to `develop`, build image, push to registry, deploy to dev (docker-compose or cluster).
	- `deploy-prod.yml`: on merge to `main` or tag, require manual approval, run migrations, deploy to prod.

- DB migrations & releases
	- Store migration scripts with code (Alembic or other). Run migrations as a step in deploy workflows before starting new app version.
	- Tag releases: `git tag -a vX.Y -m "release"` and use immutable image tags for production deploys.

- Secrets, environments & approvals
	- Use GitHub Environments for `dev`, `test`, `prod` and store secrets per environment.
	- Require at least one approver for `prod` environment deployments.

- Quick checklist to implement now
	- Add `.github/workflows/ci.yml` to run lint + tests on PRs.
	- Protect `develop` and `main` branches and require CI checks.
	- Add `dev` environment and a `deploy-dev.yml` that deploys `develop` to your dev host.
	- Add GitHub Secrets for container registry and DB credentials.

This CI/CD guide can be expanded into concrete workflow files and a CI pipeline scaffold when you're ready to implement it.

10) XL initiatives — long-term platform moves (XL)

- Self-hosted LiveKit replacement for VAPI
	- Goal: Remove runtime dependency on VAPI by adopting a self-hosted LiveKit (or managed LiveKit) infrastructure for audio streaming, recording, and monitoring.
	- Why: full control over stream access, lower vendor lock-in, easier masking/proxying of listen streams, and better integration for tiled multi-listen and multi-tenant scaling.
	- High-level tasks:
		1. Prototype LiveKit server and a minimal session flow (join/publish/subscribe) for inbound calls.
		2. Implement a SIP/telephony bridge or connector to receive PSTN inbound calls into LiveKit (or use a gateway service).
		3. Replace `listenUrl`/`controlUrl` surfaces with LiveKit room/session identifiers and server-side access tokens.
		4. Migrate recording capture to LiveKit recording or server-side recording pipeline and store blobs in object storage.
		5. Update frontend Listen modal to use LiveKit client APIs; implement per-tile audio management and token refresh flows.
		6. Plan migration strategy: dual-run with VAPI during cutover, feature flags, and rollback plans.
	- Considerations: telephony bridging complexity, compliance for recording, operational costs, scaling SFU/turn servers, and per-tenant isolation.

- LangGraph-based backend orchestration for LLM call workflows
	- Goal: Introduce a LangGraph (or similar) orchestration layer to manage LLM-driven call flows, context passing, step sequencing, and observability for complex AI assistant behaviors.
	- Why: decouple LLM orchestration from webhook plumbing, enable easier experimentation with prompts, branching logic, and multi-step actions (e.g., qualification flows, fallback to human, API enrichments).
	- High-level tasks:
		1. Design LangGraph flows for common call scenarios (gathering info, confirmation, transfer triggers) and define input/output contracts.
		2. Implement a backend LangGraph service endpoint that receives call events and returns actions (synth responses, expected next steps, control commands).
		3. Integrate LangGraph with existing webhook handler: route relevant messages to LangGraph, and apply returned actions to call control and recording.
		4. Add observability: store LangGraph decisions, prompts, and outputs in an audit table for debugging and compliance.
		5. Test multi-turn flows and implement fallback/error handling and rate limits for LLM calls.
	- Considerations: cost of LLM calls, latency budget for live interactions, secure prompt handling (avoid PII leakage), and versioning flows for A/B testing.

These two XL initiatives are strategic and large-scope; treat them as multi-sprint epics with dedicated prototyping and runbook requirements.
