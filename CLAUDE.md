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

## CI/CD
- GitHub Actions triggers Jenkins on push to `development` branch
- Jenkins builds Docker images and deploys with health checks
- Slack notifications on build status
