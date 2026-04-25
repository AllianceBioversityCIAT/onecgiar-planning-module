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
MELIA import dedup key uses `toc_id::center_id::aow_id` (not `melia_name`) so that TOC title renames update the existing row instead of creating duplicates. Legacy rows with empty `toc_id` fall back to the old name-based key. When multiple existing DB rows share the same key (residue from the old name-based bug), the canonical row is picked by: highest `melia_budget` → longest non-empty `melia_assumption` → most recent `updated_at` → lowest `id`. Cleanup SQL at `back-end/fix-melia-dedup-toc-id.sql` runs in two passes: Tx 1 hard-deletes non-keepers in "empty" duplicate groups (every row has zero budget AND empty/whitespace-only assumption — nothing worth preserving); Tx 2 soft-flags non-keepers in money-bearing groups via `toc_is_deleted = 1` (reversible, audit trail preserved, surfaced by the UI's red "Deleted" badge). A group is classified as a whole — if any row has data, the entire group goes through Tx 2. The cron's `syncTocDeletedFlags` is duplicate-aware (see caveat below) so non-keepers stay flagged on every tick — the cleanup SQL and the cron MUST agree on canonical-row ordering. The legacy `POST /porb/migrate-melia-dedup` endpoint stays in place for now; the SQL file is the preferred path.

### syncTocDeletedFlags Duplicate-Awareness
`syncTocDeletedFlags` in `porb.service.ts` accepts optional `groupKeyOf(row)` and `pickCanonical(rows)` callbacks. For entities with natural duplicates, callers pass these to ensure only the canonical row in each live group is restored to `toc_is_deleted = 0`; non-canonical duplicates stay flagged. MELIA passes `meliaKeyOf` (key `toc_id::center_id::porb_aow_id`) and a canonical picker matching `meliaRowIsBetter` (highest `melia_budget` → longest non-empty `melia_assumption` → most recent `updated_at` → lowest `id` — same ordering as `fix-melia-dedup-toc-id.sql`). HLO/Partner/Bilateral/Synergy/Outcome use defaults (no natural duplicates). This makes the system self-healing: even if duplicates re-appear, the cron auto-flags the extras every minute.

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
`header.component.html` shows a `<span class="test-env-badge">Testing Environment</span>` conditionally via `*ngIf="isTestEnv"`. `isTestEnv` is `!environment.production`, so the badge only appears in non-production builds. No manual removal needed for production deploys.

### W3/Bilateral Is Center-Level
W3/Bilateral is NOT a per-AOW section — it lives at the center level as a pseudo-AOW button in Level 2 nav. `isW3View` flag controls the view state. When active, no consolidation sidebar or Level 3 section nav is shown. `porb_bilateral.porb_aow_id` is NULL for all rows. Summary consolidated shows a full-width W3/Bilateral per-center table below Anaplan (centers with zero budget are hidden, center names left-aligned). Summary detailed has a W3/Bilateral button in AOW nav showing consolidated read-only table (duplicates merged by `toc_id`, budgets summed, assumptions grouped by center). The W3/Bilateral button is disabled (dimmed + tooltip) when no W3 data exists for the current center — `preloadW3CenterCount()` fetches the count on center selection. `getBilaterals()` in the backend auto-deduplicates rows by `(toc_id, center_id)` at read time and cleans up DB duplicates in the background. Migration: `POST /porb/migrate-bilateral-to-center` or `back-end/migrate-bilateral-to-center.sql`.

### PORB Section Order
`baseExtraNavigationItems` order: Pool funding HLO → Partners → MELIA Study → Anaplan → Countries of Implementation → Location of Benefit. W3/Bilateral is separate (center-level nav, not in this array). Summary detailed view adds two additional read-only sections: Synergy Programs → Outcomes (appended after the base items).

### Synergy Programs & Outcomes (Read-Only TOC Sections)
`porb_synergy` and `porb_outcome` entities store read-only data from TOC. Both are per-AOW (no `center_id`, no budget/assumption columns). Auto-harvested by the TOC cron job in `importTocToPorbTables()`. Synergy source: `dd?.data?.synergy_programs` filtered by `result.category == 'OUTPUT'`; dedup by `toc_id`. Outcome source: `filteredData` filtered by `category == 'OUTCOME'` or `'EOI'`; indicators stored as JSON in `outcome_indicators`. Both appear only in Summary Detailed view (not Consolidated). Included in submission snapshots (`porb_data` per-AOW level), version views, and Excel export (separate sheets). `clearAllPorbData` uses `WHERE program_id = X` (not `aowWhere`) since `porb_aow_id` can be NULL.

### Countries Percentage Section
New budget section showing countries extracted from HLO `hlo_geo` field per center+AOW. Users input a percentage per country; budget is computed on the fly as `percentage × pooledTotal / 100` (not stored in DB). Entity `porb_country_percentage` stores: program_id, porb_aow_id, center_id, country_name, percentage, is_manual. Total percentage per center+AOW is capped at 100% (frontend + backend validation). Consolidated views recalculate percentage as `country_budget / total_pooled_funding × 100`. Summary detailed view aggregates by country across centers. Section disabled when no countries in HLO data, EXCEPT for AOW00 (Cross-Cutting) which is always enabled. For AOW00, users can manually add countries via CLARISA search dialog (`GET /porb/country-percentage/search-clarisa?q=...`, `POST /porb/country-percentage`, `DELETE /porb/country-percentage/:id`). Manual countries have `is_manual: true` and can be deleted; HLO-derived countries cannot.

### Location of Benefit Section
New budget section (after Countries of Implementation in nav order) showing locations extracted from outcome-level `outcome_geo` field per center+AOW. Unlike Countries Percentage (countries only from HLOs), this supports **country, region, and Global** location types from **outcomes**. Entity `porb_location_benefit` stores: program_id, porb_aow_id, center_id, location_name, location_type ('country'|'region'|'global'), percentage, is_manual. `porb_outcome.outcome_geo` column (mediumtext, nullable) stores the parsed geo string from TOC import (`'Global'`, `'Region: X, Y'`, `'Country: X, Y'`). Same percentage logic as Countries (0-100%, total capped at 100%, budget computed as `percentage × pooledTotal / 100`). Consolidated endpoint: `GET /porb/location-benefit-consolidated`. Manual add dialog exists but is currently hidden (commented out in template). Included in: submission snapshots (`location_benefits` per center), version view, Excel export ("Location of Benefit" sheet), `clearAllPorbData`, socket events (`section: 'location-benefit'`).

### HLO Geographic Location (Countries Only)
`hlo_geo` column stores only country names (comma-separated). Global and regional location types are ignored during TOC import. Column renamed to "Country(ies) of implementation" in all views. Admin endpoint `POST /porb/cleanup-hlo-geo` clears non-country values and strips "Country: " prefix from existing data.

### TOC-Deleted Row Deletion
Rows with `toc_is_deleted: true` show a red delete button (inline in the budget cell) across all 4 budget sections (Pool HLO, Partners, MELIA, W3). Backend endpoints: `DELETE /porb/hlo/:id`, `DELETE /porb/melia/:id`, `DELETE /porb/bilateral/:id` — each guards on `toc_is_deleted === true`. Partner delete (`DELETE /porb/partner/:id`) handles both `is_unknown` and `toc_is_deleted` partners (also cleans up `porb_contracted_partners`). Deleted cells get amber highlight (`deleted-cell` class) on non-merged `<td>` elements only — the rowspan/merged column stays clean. Confirmation dialog before permanent deletion.

### TOC Change Badges
Three badges on non-merged cells in all 4 budget sections (Pool HLO, Partners, MELIA, W3): red **Deleted** badge for `toc_is_deleted` rows (permanent), blue **TOC** badge for recently updated rows (24h), green **NEW** badge for recently added rows (24h). `toc_updated_at` is set only on rows with actual field changes during auto-harvest; `toc_created_at` is set only on newly inserted rows. Neither timestamp is set during bulk import (`bulkImportAndMigrate` passes `setTocTimestamps=false`). `isTocUpdated()` excludes rows that are also `isTocAdded()` to avoid showing both badges. Blue left border (`tr.toc-updated`) applies to both updated and added rows. Pool section badges are on the Description cell (next to merged HLO name); other sections on the first (non-merged) name cell.

### Timestamps on PORB Entities
All 9 `porb_*` entities have `@CreateDateColumn() created_at` and `@UpdateDateColumn() updated_at`. TypeORM synchronize auto-added columns. Existing rows got current timestamp on migration; only rows created/updated after deployment have meaningful values.

### TOC Auto-Harvest Cron Job
A `@Cron(EVERY_MINUTE)` job in `porb.service.ts` calls `TOC_API/toc/last-updates` (returns `{id, title, last_update}[]`). Compares each program's `last_update` counter against `initiative.toc_last_update` column. If TOC counter > ours, runs `importTocToPorbTables()` and updates the stored counter. The `tocCronRunning` flag prevents overlapping runs. Matching logic: tries `action_area_id` first, then falls back to name match. `importTocToPorbTables()` must receive `official_code` (not `action_area_id`) because `getTocs()` looks up by `official_code`.

### App Version Detection
`version.json` at project root is the single source of truth for app version. Backend (`events.gateway.ts`) reads it on startup (falls back to `APP_BUILD_VERSION` env var for Jenkins). On socket connect, emits `appVersion` event. Frontend (`version-check.service.ts`) stores the first version received; if a subsequent emission differs (e.g., after backend restart with new version), shows a reload banner in the header. Works in local, dev, staging, and production. Bump `version.json` before pushing to trigger reload for users with open tabs.

### Real-Time PORB Budget Sync
When any user saves/adds/deletes a budget entry, the backend emits a `porbBudgetChanged` Socket.io event with `{ program_id, center_id, aow_id, section, type, emitter_socket_id }`. `emitPorbBudgetChanged()` in `porb.service.ts` is called at the end of every mutation method (all 6 budget sections + partner add/resolve/delete + HLO/MELIA/bilateral delete). The `emitter_socket_id` comes from the `x-socket-id` HTTP header, injected by `SocketIdInterceptor` on the frontend. On the receiving end, `handleRemoteBudgetChange()` in `porb.component.ts` skips self-emitted events (matching socket ID) and program-mismatched events, then refreshes only the relevant view: summary consolidated/detail, center consolidated, or budget-entry rows + consolidation sidebar. For `update` events, `softReloadCurrentSection()` re-fetches data into existing arrays without DOM destruction. For `add`/`delete`, a full `loadBudgetRows()` runs since row count changes. Design: last-write-wins (no conflict resolution), signal-based (socket carries metadata, frontend re-fetches from REST), no server-side rooms (client-side `program_id` filtering). CORS in `main.ts` must include `x-socket-id` in `allowedHeaders`.

### PORB Submission Snapshot & Version View
On submit, `submitPorb()` saves a full JSON snapshot of all PORB data into `porb_data` (longtext) on the `Submission` entity. Organized by AOW → Center → Section (hlos, partners, melias, anaplan, cross_cutting, country_percentages) + top-level bilaterals. No pre-computed consolidation — computed on-the-fly. `GET /porb/version/:submission_id` returns the parsed snapshot with auth (approved = any user, pending/rejected = team + admin). `PorbVersionViewComponent` at `/porb/:program_id/version/:submission_id` renders the snapshot read-only using existing section components with `canEdit=false`. Budget values display as plain text (not disabled inputs) via the `budget-and-assumption` component's read-only mode. Assumption icons show "View assumption" and open a read-only modal with just a "Close" button. Version view includes Summary tab (Budget Overview + Budget for Financial Reporting + W3/Bilateral Consolidated tables), center-level Consolidated/Budget Entry toggle, and smart navigation that hides centers/AOWs/sections with zero budget. Navigation state (AOW, section, view mode) is preserved when switching between centers. `GET /porb/version/:id/zip` exports ZIP from the version. `snapshot_version: 1` field for future schema evolution.

### PORB Export Status Prefix
All PORB export filenames include the submission status prefix: `Draft_PORB_SP01.zip`, `Approved_PORB_SP01.xlsx`, etc. Applies to: `generatePorbExcel`, `generatePorbZip`, `generateVersionZip`, `exportBulkZip`, and Anaplan exports. Status comes from `getLatestSubmission(programId)` for live exports, or `submission.status` for version exports.

### Admin Export Page (Revamped)
`/admin/export` now exports PORB data instead of old submission data. Uses `GET /porb/export-list?phase_id=X&status=Y` (Approved/Pending/Draft) and `POST /porb/export-bulk` with `{ program_ids }`. Draft = initiatives with PORB AOWs but no active submission in the phase. All exports go through `buildPorbWorkbook()` — adding a sheet there covers all export paths.

### Admin Track PORBs Page (Revamped)
`/admin/track-porbs` shows all programs for the current active phase (no filters). Pie chart displays counts for Approved/Pending/Draft statuses. Table shows all programs with colored status badges. Uses `getExportList` endpoint. Export button generates bulk ZIP.

### Budget Summary Page (PORB Data)
`/budget-summary` (TotalInitSummaryComponent) reads budget data from `porb_data` JSON snapshots. Tabbed UI with three tabs: **By Center** (Program × Center matrix), **By AoW × Center** (per-program AOW breakdown with Alliance split into Bioversity + CIAT + Sub-Total Alliance), and **Anaplan** (mirrors Sheet 1 of the Anaplan Summary export without code columns — P&A Name, SP, Area of Work, YEAR, VERSION, ACCOUNT, ENTITY, AMOUNT with rowspan grouping on the first five columns; lazy-loaded via `GET /initiatives/budgetSummary/anaplan`). All programs are always rendered — cells zero-fill when no data (By AoW × Center also uses `fmtZero` so empty cells show `0`). Both leading columns (code + name) are sticky-left when scrolling horizontally; the footer Total row is sticky-bottom. In the By AoW × Center tab, the program header row and the Sub-Total row use a `.sticky-label` wrapper — the inner `<span class="sticky-label__text">` is `position:sticky; left:10px` so the label text stays pinned to the viewport left while the full-width colspan cell scrolls underneath. Backend in `back-end/src/initiatives/budget-summary.service.ts` exposes `GET /initiatives/budgetSummary/matrix` (JSON for the page) and `GET /initiatives/budgetSummary/excel` (2-sheet workbook matching the finance-team reference: "Prog-Accel by Center" + "AoW by Center"). Alliance lookup resolves Bioversity by org code `49` (acronym `Bioversity (Alliance)`) and CIAT by code `46` (acronym `CIAT (Alliance)`). SO column resolves by acronym `SO` (CGIAR System Organization, code `221`); Unknown = code `999999`.

**Pooled budget formula (CRITICAL)**: Each center × AOW cell = `hlo_budget + cross_cutting.budget` only. Partners, MELIA, and Anaplan are NOT added — they are breakdowns/views of the same pooled money (per PORB validation rules 12-13: Rule 12 ties Partners to Anaplan "Collaborators non-CGIAR", Rule 13 ties Total Anaplan to HLO + Cross-Cutting). Summing them would double-count. Bilaterals are excluded (separate project funding, reported in their own table). Same formula applied in the legacy `initiatives.service.ts#getInitPartnersBudget` path (used by `/initiatives/budgetSummary` and `/initiatives/getInitPartnersBudget`) for consistency.

**Center filter caveat**: the matrix endpoint trims the returned `centers` array to match `partnerFilter`, but force-includes SO and Unknown columns regardless. The frontend works around this in two ways: (1) the Center dropdown binds to `allCenters` (cached from the first unfiltered load) so selecting a center doesn't collapse the dropdown options; (2) `computeDerivedData()` intersects the form's `partners` selection with the returned `centers` so SO, Unknown, Bioversity, CIAT, and Sub-Total Alliance columns only appear when actually selected (or no filter is applied). `useAllianceSplit` requires both Bioversity and CIAT to be in the filtered set.

### Admin Export — Budget Summary Bulk Button
`/admin/export` has a second button **Export Budget Summary** (alongside Export Excel ZIP) that downloads the 2-sheet Budget Summary workbook for the currently listed programs. Respects the page's Phase + Status filters. Endpoint: `POST /initiatives/budgetSummary/excel-bulk` with body `{ program_ids, status, phase_id }`. For `status ∈ {Approved, Pending}`, reads the latest submission of that status (with `porb_data`). For `status = Draft`, aggregates **live** PORB data via `PorbService.buildPorbSnapshot(programId)` (made public; `BudgetSummaryService` injects `PorbService` via `forwardRef`). Filename is prefixed with status: `Approved_Budget-Summary.xlsx`, etc. Circular-dep note: `PorbModule` now wraps `SubmissionModule`, `InitiativesModule`, and `EventsModule` imports with `forwardRef()`; `SubmissionModule` wraps `InitiativesModule` with `forwardRef()` — all three are required to break the cycle introduced by PorbService ↔ BudgetSummaryService.

### PORB Danger Zone Admin Page
Admin page at `/admin/porb-danger-zone` with 6 sections: (1) **TOC Sync Status** — live table comparing our `toc_last_update` vs TOC API counter, polls every 30s, badges for status; (2) **Manual TOC Import** — checkbox program selector to force-import; (3) **Clear PORB Data** — `DELETE /porb/clear-all-data?program_id=X` deletes all 9 PORB tables (child-first FK order) in a transaction and resets `toc_last_update` to 0 so the cron re-harvests; (4) **Reset All to Draft** — `POST /porb/reset-all-to-draft` clears `latest_submission_id` on each initiative (does NOT change submission statuses — existing Approved/Pending/Rejected statuses are preserved); (5) **Clear Emails** — `DELETE /porb/clear-emails` deletes all email records; (6) **Clear History** — `DELETE /porb/clear-history` clears `latest_history_id` on initiatives then deletes all history records. Backend endpoint `GET /porb/toc-last-updates` returns both TOC data and our stored counters.

### PORB Guest Access Restriction
Guest users (logged in but no role on the initiative and not admin) are redirected to the homepage when accessing `/program/:id/:code/porb`. Checked in `porb.component.ts` `ngOnInit()` via `permissionService.getUserInitiativeRole()`. Version view (`/porb/:id/version/:submission_id`) is not restricted — the backend controls access (approved versions visible to all, pending/rejected to team + admin only).

### PORB Submission Status Locking
`GET /porb/submission/:program_id` returns `{ id, status }` of the latest submission (Pending/Approved are active; Draft/Rejected/null return `{ id: null, status: 'Draft' }`). All 15 PORB mutation endpoints (budget saves, partner add/resolve/delete, HLO/MELIA/bilateral delete, center status/validate) call `assertNotLocked(programId)` which throws `ForbiddenException` when status is Pending or Approved. Frontend: `isSubmissionLocked` getter controls the amber `.submission-locked-banner` and feeds into `canEditMap` (all centers set to `false` when locked), cascading down to disable all `BudgetAndAssumptionComponent` inputs. `isNonLeadUser` getter determines banner message variant (contributors see "contact Program Lead", everyone sees "contact PCU" for Approved). Mark Complete button visibility uses `canToggleCenterCompletion` (role-based, ignoring completion status) so users can always toggle back.

### Mark Complete Center Locking
`PATCH /porb/center/status` persists completion status to `center_status` table (composite PK: initiative_id, organization_code, phase_id). Uses `centerStatusRepo.update()` (not `.save()`) due to TypeORM boolean bug on composite PKs. Completed centers (`status=false/0` in DB) become read-only: `buildCanEditMap()` sets `canEditMap[code]=false` for completed centers, disabling all budget inputs. Contributors can still click "Mark Incomplete" to re-enable editing (button uses `canToggleCenterCompletion` which checks base role permission, not completion status). Backend emits `porbBudgetChanged` socket event with `section: 'center-status'` so other connected users see the status change in real-time. Frontend handles this by reloading `initiative.center_status` and rebuilding `canEditMap`. History table records "Mark as complete"/"Mark as incomplete" with user ID.

## CI/CD
- GitHub Actions triggers Jenkins on push to `development` branch
- Jenkins builds Docker images and deploys with health checks
- Slack notifications on build status
