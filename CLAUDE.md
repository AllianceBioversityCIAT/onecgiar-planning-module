# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack CGIAR planning management application:
- **Frontend**: Angular 19 (TypeScript 5.7, SCSS) in `front-end/` — esbuild `application` builder
- **Backend**: NestJS 10 (TypeScript) in `back-end/`
- **Node**: 20 LTS (in Docker)
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

### Summary View Modes
The summary tab has a top-level Consolidated/Detailed toggle. Consolidated shows Budget Overview + Budget for Financial Reporting + W3 tables (full width, stacked). Detailed shows AOW nav + section nav + per-AOW budget breakdown. W3/Bilateral has its own button in the detailed AOW nav. `summaryViewMode` controls the toggle. Zero-budget AOW rows are hidden from the consolidated table. Summary sections with no budget data are disabled (dimmed, tooltip). Center-level sections are disabled when no rows exist (uses `rowCounts` from consolidation endpoint); Anaplan is always enabled. Selected section is preserved when switching AOWs. Summary detail data is cached in `computeSummaryDetailCache()` to avoid getter re-creation on change detection (prevents DOM thrashing).

### Center View Modes
Center view has a Consolidated/Budget Entry toggle (`centerViewMode`). **Consolidated** shows read-only summary tables filtered to the selected center: Budget Overview (AOW breakdown), Budget for Financial Reporting (Anaplan accounts × AOWs), and W3/Bilateral projects. **Budget Entry** shows the existing AOW nav → section nav → editable budget tables. The view mode persists when switching between centers (consolidated data reloads automatically). Backend endpoints `getSummaryConsolidation` and `getAnaplanConsolidated` accept optional `center_id` query param for center-filtered data.

### Summary Assumption Icon
`SummaryAssumptionIconComponent` opens a click-to-view dialog with assumption text. Always visible — dimmed when no assumption, clickable when present. Accepts single `[assumption]` string or `[assumptions]` array of `{center, assumption}` entries for multi-center items. `SummaryAssumptionDialogComponent` renders the dialog. Backend enriches HLO, MELIA, and bilateral rows with `center_name` in `getSummaryAowDetail()`.

### Validation Error Dialog
`ValidationErrorsDialogComponent` is used by both "Mark Complete" and "Submit" buttons. Shows centers with errors (submit only) and AOWs with errors, with a hint to follow error icons. Button is always visible; errors shown in modal on click. Cross Cutting and Anaplan sections are always enabled on center level.

### Consolidation Validation Highlights
Anaplan validation returns `partnerMismatch` and `pooledMismatch` flags. Consolidation sidebar highlights mismatched cells (`.validation-mismatch` class in `porb.component.scss`) with red background and tooltip explaining the error. Column order in consolidation sidebar: indicators → Cross-Cutting → Total Pooled Funding → Anaplan → Partners → MELIA. The Anaplan and Total Pooled cells highlight on `pooledMismatch`; the Partners cell highlights on `partnerMismatch`.

### MELIA Dedup
MELIA import dedup key uses `melia_name::center_id::aow_id` (not `toc_id`) to prevent duplicates when TOC API returns different UUIDs for the same study. Migration endpoint: `POST /porb/migrate-melia-dedup`.

### Budget Section Subtotals
All 6 center-level budget sections (Pool HLO, Partners, MELIA, Anaplan, Cross Cutting, W3) show a subtotal row at the bottom of their tables. Computed from `filteredRows` in each section component. Global `.subtotal-row` styles in `styles.scss`.

### Budget for Financial Reporting Endpoint (formerly Anaplan Consolidated)
`GET /porb/anaplan-consolidated?program_id=X&center_id=Y` aggregates `porb_anaplan` rows grouped by account × AOW. Returns `{ aows, accounts, grandTotal, grandTotalByAow }`. When `center_id` is provided, filters to that center only. Displayed as "Budget for Financial Reporting" in both summary and center consolidated views. Export Anaplan button lives on this table (not in center header).

### Budget Input Comma Formatting
`BudgetAndAssumptionComponent` formats budget values with comma separators (e.g., "597,987") when the input is not focused. On focus, shows raw number for editing. Uses `Intl.NumberFormat('en-US')` via a `displayValue` getter. The `focused` boolean tracks focus state.

### Anaplan Migration & AOW00
The Anaplan migration in `migrateOneProgram()` falls back to AOW00 for `AnaplanValues` whose `wp_id` doesn't match any WorkPackage. This is needed because AOW00 (Cross-Cutting) has no WorkPackage entity. Without the fallback, AOW00 Anaplan budgets are silently skipped.

### Excel Sheet Protection & Hidden IDs
All PORB Excel sheets call `protectAndHideIds()` to hide ID columns and apply sheet protection. Assumption columns (text wrap, ~30 char width) are added beside each budget column in all 5 section sheets.

### Testing Environment Badge
`header.component.html` includes a `<span class="test-env-badge">Testing Environment</span>` in the header's right section. This is a static orange badge meant for test/staging deployments. Remove or conditionalize it (e.g., via `environment.ts`) before deploying to production.

### W3/Bilateral Is Center-Level
W3/Bilateral is NOT a per-AOW section — it lives at the center level as a pseudo-AOW button in Level 2 nav. `isW3View` flag controls the view state. When active, no consolidation sidebar or Level 3 section nav is shown. `porb_bilateral.porb_aow_id` is NULL for all rows. Summary consolidated shows a full-width W3/Bilateral per-center table below Anaplan (centers with zero budget are hidden, center names left-aligned). Summary detailed has a W3/Bilateral button in AOW nav showing consolidated read-only table (duplicates merged by `toc_id`, budgets summed, assumptions grouped by center). The W3/Bilateral button is disabled (dimmed + tooltip) when no W3 data exists for the current center — `preloadW3CenterCount()` fetches the count on center selection. `getBilaterals()` in the backend auto-deduplicates rows by `(toc_id, center_id)` at read time and cleans up DB duplicates in the background. Migration: `POST /porb/migrate-bilateral-to-center` or `back-end/migrate-bilateral-to-center.sql`.

### PORB Section Order
`baseExtraNavigationItems` order: Pool funding HLO → Partners → MELIA Study → Anaplan → Countries Percentage. W3/Bilateral is separate (center-level nav, not in this array).

### Countries Percentage Section
New budget section showing countries extracted from HLO `hlo_geo` field per center+AOW. Users input a percentage per country; budget is computed on the fly as `percentage × pooledTotal / 100` (not stored in DB). Entity `porb_country_percentage` stores: program_id, porb_aow_id, center_id, country_name, percentage. Total percentage per center+AOW is capped at 100% (frontend + backend validation). Consolidated views recalculate percentage as `country_budget / total_pooled_funding × 100`. Summary detailed view aggregates by country across centers. Section disabled when no countries in HLO data.

### HLO Geographic Location (Countries Only)
`hlo_geo` column stores only country names (comma-separated). Global and regional location types are ignored during TOC import. Column renamed to "Country(ies) of implementation" in all views. Admin endpoint `POST /porb/cleanup-hlo-geo` clears non-country values and strips "Country: " prefix from existing data.

## CI/CD
- GitHub Actions triggers Jenkins on push to `development` branch
- Jenkins builds Docker images and deploys with health checks
- Slack notifications on build status
