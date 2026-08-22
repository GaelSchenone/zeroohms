# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

zeroohms.com.ar — a PC/laptop repair shop management system. Two independent apps in one repo:

- `zeroohms-frontend/` — React 19 + Vite public site and admin dashboard (ticket/repair tracking).
- `zeroohms-backend/` — FastAPI + SQLAlchemy REST API backing the admin dashboard.

There is also a stale `AGENTS.md` at the repo root — it describes an earlier state where the backend was an empty directory and the frontend admin ran entirely on hardcoded mock data (`admin/adminData.js`). That is no longer true: the backend is a real FastAPI service, and auth/tickets are wired to it via `src/api/`. Don't trust `AGENTS.md` for backend or wiring claims; verify against the actual code.

## Commands

### Frontend (`zeroohms-frontend/`)

```bash
npm run dev        # Vite dev server (port 5173)
npm run build      # Build to dist/
npm run server     # Custom Node production server on port 5174 (serves dist/, YouTube proxy, backend proxy)
npm run lint       # ESLint (flat config, no type checker, no test framework)
npm run preview    # Vite preview (port 4173)
```

`npm run server` serves from `dist/` — run `npm run build` first or it 404s.

There is no test suite (unit, integration, or e2e) for either app.

### Backend (`zeroohms-backend/`)

```bash
python3 main.py                              # runs uvicorn on port 3001 with reload
# or: uvicorn main:app --reload --port 3001
python3 scripts/migrate_estados.py           # one-off idempotent data migrations (run from this dir)
python3 scripts/migrate_propietario.py
```

No linter, formatter, or test suite is configured for the backend.

## Architecture

### Request path in dev

Vite's dev server proxies (`vite.config.js`):
- `/api/videos`, `/api/health` → `http://localhost:5174` (the custom Node `server.mjs`, which also owns the YouTube carousel and caches results 5 min)
- everything else under `/api` → `http://localhost:3001` (FastAPI backend)

So a full local dev loop needs three processes: `npm run dev` (5173), `npm run server` (5174, needs `dist/` built), and the FastAPI backend (3001). In production, `server.mjs` itself proxies non-video/health `/api/*` requests to `BACKEND_URL` and serves the built SPA for everything else, with a path-traversal guard on static file serving.

### Backend: state-machine-as-audit-log pattern

Tickets, tasks (`Tarea`), and quotes (`Presupuesto`) don't have a `status` column. Instead each has a paired "catalog" table (`PosEstadoTK`, `PosEstadoTarea`, `PosEstadoPresupuesto`) listing possible states, and a history table (`EstadoTK`, `EstadoTarea`, `EstadoPresupuesto`) that's an append-only log of `(estado_id, entity_id, fechacambio)` rows — see `models/estados.py`. Current state is always derived by querying the latest row in the history table, e.g. `_get_estado_actual_tk()` in `routes/tickets.py`. When changing state, don't update a column — insert a new history row.

Ticket state transitions are constrained in `routes/tickets.py` (`cambiar_estado`): states 8 (`entregado`) and 9 (`cancelado`) are terminal (`ESTADOS_TERMINALES`), and moving backward in the flow is blocked except into `cancelado`. The canonical 9-state flow (`ticket_creado` → ... → `entregado`/`cancelado`) is documented in `scripts/migrate_estados.py`.

Every state change fires a fire-and-forget webhook (`services/webhook_service.py` → `send_webhook`) to `N8N_WEBHOOK_URL/{event}` via a FastAPI `BackgroundTasks` call, used for n8n automation (notifications, etc.). It swallows all errors and returns `False` silently if unconfigured — don't rely on it for anything the API itself depends on.

### Backend: auth

JWT-based, stateless. `services/auth_service.py` hashes with bcrypt directly (not passlib — a comment notes passlib 1.7.4 is incompatible with bcrypt >= 4.1) and signs/verifies JWTs with `python-jose`. `middleware/auth.py` provides `get_current_user` as a FastAPI dependency (`HTTPBearer`) used across nearly every route to require a valid token; it returns the `usuario` string from the token's `sub` claim, not a DB object.

### Backend: models and routers

SQLAlchemy models live in `models/`, one router per resource in `routes/` (all mounted under `/api/...` prefixes in `main.py`), and Pydantic request/response shapes in `schemas/`. Table/column names are Spanish and often keep legacy casing (e.g. `TKs.TKID`, `PosEstadosTKs.PosEstadoTKID`) mapped explicitly via SQLAlchemy `Column("ColumnName", ...)` — the Python attribute name and DB column name frequently differ, so check the `Column(...)` mapping rather than assuming the attribute name matches the column.

Config is centralized in `config/settings.py` (`pydantic-settings`, reads `.env`) and `config/database.py` (SQLAlchemy engine/session, `get_db()` dependency). Optional integrations gated behind empty-string defaults in `Settings`: n8n webhooks, MinIO (photo storage), Google Calendar, Resend (email) — none are required for the API to boot.

### Frontend: admin dashboard

Routes are defined in `App.jsx`; everything under `/admin/*` is wrapped in `ProtectedRoute` (`components/admin/ProtectedRoute.jsx`) + `AdminLayout`. Auth state is just a JWT in `localStorage` (`src/api/client.js`), attached as `Authorization: Bearer` on every request; a 401 (except from `/auth/login` itself) clears the token and hard-redirects to `/login`.

`src/api/client.js` is the single fetch wrapper — it JSON-encodes bodies, throws on non-2xx using `detail`/`error` from the response body, and centralizes the 401 handling above. New API calls should go through `api()` (see `src/api/auth.js` for the pattern) rather than calling `fetch` directly.

Shared ticket-flow UI lives in `components/tickets/`: `TicketTimeline` (renders the `EstadoTK` history log), `EstadoButtonRow` (state-transition buttons, should respect the same terminal/no-backward rules enforced server-side), and `TareaKanban` (drag-and-drop task board).

CSS is co-located per component (e.g. `Dashboard.css` next to `Dashboard.jsx`), not a shared stylesheet or CSS-in-JS. No state management library — local `useState`/prop drilling only. Icons come from `pixelarticons/react` and `react-icons/fa`.

### Language convention

UI text, code comments, and DB column/table names are Spanish throughout both apps (variable/function names too, in many backend modules — e.g. `usuario`, `tkid`, `descripcionproblema`). Match this convention for new code in this repo rather than switching to English.
