# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack CGIAR planning management application:
- **Frontend**: Angular 15 (TypeScript, SCSS) in `front-end/`
- **Backend**: NestJS 10 (TypeScript) in `back-end/`
- **Database**: MySQL via TypeORM (synchronize: true — schema auto-syncs from entities)
- **Auth**: AWS Cognito + JWT
- **Real-time**: Socket.io WebSocket gateway

## Commands

### Backend (`back-end/`)
```bash
npm run start:dev    # Dev server with watch mode
npm run build        # Compile TypeScript to dist/
npm run start:prod   # Production (after build)
npm run test         # Unit tests (Jest)
npm run test:e2e     # End-to-end tests
npm run test:cov     # Coverage report
npm run lint         # Lint and format
```

### Frontend (`front-end/`)
```bash
npm start            # Dev server at localhost:4200 (SSL)
npm run build        # Production build
npm run build-dev    # Development build
npm run staging      # Staging build
npm run test         # Unit tests (Karma/Jasmine)
npm run watch        # Watch mode build
```

### Docker (full stack)
```bash
docker compose up -d --build --wait
```

## Architecture

### Backend Structure (`back-end/src/`)
NestJS module-based architecture. Each feature is a self-contained module with controller, service, DTOs, and entity references.

Key modules:
- `auth/` — AWS Cognito authentication, JWT strategies, Passport guards
- `initiatives/` — Core initiative management, WebSocket gateway for real-time notifications
- `submission/` — Submission workflow (the main planning data entry flow)
- `porb/` — Program Operations and Resource Budget (active development area after finish will replace `submission/`)
- `users/`, `organizations/`, `phases/`, `periods/` — Supporting domain modules
- `entities/` — All TypeORM entities (50+ tables)
- `email/` — SendGrid integration
- `anaplan/` — Anaplan budget integration

### Frontend Structure (`front-end/src/app/`)
Angular with lazy-loaded routes, reactive forms, and Material Design.

Key areas:
- `submission/` — Main planning submission UI (the core user flow)
- `porb/` — PORB module with sub-components: HLO, Partner, Bilateral, Melia, Anaplan, Cross-cutting sections
- `admin/` — Admin dashboard (lazy-loaded), manages users/phases/periods/organizations
- `services/` — HTTP services that map to backend API endpoints
- `guards/` — `auth.guard`, `admin.guard`, `under-maintenance.guard`
- `share/` — Shared modules: popover, rich text editor, chat, trust-html pipe
- `environments/` — Build-target-specific config (development, staging, production)

### API & Real-time
- REST API proxied from `/api` → `http://localhost:3000` in dev
- WebSocket via Socket.io at `/socket.io` path
- Backend exposes Swagger docs

### Environment Variables (Backend `.env`)
Required: MySQL connection (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`), `JWT_SECRET`, `JWT_EXPIRATION_TIME`, AWS Cognito credentials, `SENDGRID_API_KEY`, `PORT` (default 3000), optional `BASE_URL` for non-root deployment.

## Caveats

### Loading Interceptor PORB Route Check
`loading.interceptor.ts` uses `this.router.url.includes('/porb')` to skip the global loading spinner on PORB pages. If a new route is added that contains `/porb` as a substring (e.g., `/report-porb-legacy`), it will also bypass the spinner unintentionally. If that happens, switch to a more specific check (e.g., regex or exact segment match).

### Budget Input Save Pattern (No Table Reload)
`onBudgetUpdated()` in `porb.component.ts` does NOT reload table rows. It only refreshes the consolidation sidebar and validation. The backend already returns the updated entity, so local data stays correct without a full reload. This prevents DOM destruction (flicker, focus loss, broken Tab navigation).

### Cross-Cutting Uses Standard List
Cross-cutting items come from the `standerd_cross_cutting` table (7 fixed items), not user-created free-text. The `porb_cross` entity links via `standerd_cross_cutting_id` (the old `cross_cutting_id` is nullable/legacy). There is no "Add New" button — all 7 standard items are always shown. Migration SQL at `back-end/migrate-cross-to-standard.sql`.

### Budget Clear Confirmation Dialog
`BudgetAndAssumptionComponent.onBlur()` shows a `ClearBudgetConfirmDialogComponent` when a non-zero budget is cleared to empty/0 and an assumption exists. "Delete Both" clears both and saves; "Cancel" restores the previous value. If no assumption exists, the clear saves silently. Values of `0` are normalized to empty string (no `0` saved to DB). Inputs that were already empty/0 skip the server call entirely on blur.

### Budget Input Tab Navigation
The assumption icon button in `budget-and-assumption.component.html` has `tabindex="-1"` to keep it out of the Tab order. Without this, pressing Tab in a budget input with a value would focus the assumption button instead of the next budget input (because the button is only `[disabled]` when there's no budget value).

### Unknown Partners
Users can add "Unknown Partner" rows directly in the PORB Partners section (not from TOC). These have `is_unknown: true` on `porb_partner` entity. They can later be resolved to real CLARISA institutions via a search dialog (`PATCH /porb/partner/:id/resolve`), which updates the name and sets `is_unknown = false`. Only unknown partners can be deleted (`DELETE /porb/partner/:id`). The `GET /porb/partner/search-clarisa?q=...` endpoint searches the `Partner` (CLARISA) table. Adding emits `rowAdded` which triggers a full `loadBudgetRows()` reload.

## CI/CD
- GitHub Actions triggers Jenkins on push to `development` branch
- Jenkins builds Docker images and deploys with health checks
- Slack notifications on build status
