# AGENTS.md — zeroohms

## What this is

Frontend-only repo for zeroohms.com.ar (PC/laptop repair shop). The `zeroohms-backend/` directory exists but is empty — all logic lives in `zeroohms-frontend/`.

## Stack

- React 19 + Vite 8, plain JSX (no TypeScript)
- ESLint only — no type checker, no test framework
- Custom Node.js production server (`server.mjs`) serves built files + YouTube API proxy + backend proxy

## Commands (in `zeroohms-frontend/`)

```bash
npm run dev        # Vite dev server (port 5173)
npm run build      # Build to dist/
npm run server     # Production server on port 5174
npm run lint       # ESLint
npm run preview    # Vite preview (port 4173)
```

**Critical order**: `npm run server` serves from `dist/` — you must `npm run build` first or it returns 404.

## Dev proxy gotcha

Vite proxies `/api/videos` and `/api/health` → `http://localhost:5174` (the production server). The YouTube carousel calls `/api/videos`. If `npm run server` isn't running alongside `npm run dev`, those requests fail silently with an error state.

`/api/*` (other endpoints) → `http://localhost:3001` (backend, not running by default).

## Environment

Copy `.env.example` to `.env`. Required: `YOUTUBE_API_KEY`. Optional: `YOUTUBE_CHANNEL_ID` (default: `UCCd0-uHBqfsmlxcQN7OcMkw`), `BACKEND_URL` (default: `http://localhost:3001`), `PORT` (default: `5174`).

`server.mjs` loads `.env` manually with a regex parser — no dotenv library. It only reads env vars that aren't already set in the environment.

## Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `HomePage.jsx` | Landing page with services, YouTube carousel, contact |
| `/login` | `admin/Login.jsx` | Hardcoded demo creds in `adminData.js` |
| `/tracking` | `TrackingPage.jsx` | Public tracking page |
| `/admin` | `admin/Dashboard.jsx` | Ticket dashboard (mockup) |
| `/admin/tickets` | `TicketsList.jsx` | Tickets list |
| `/admin/tickets/nuevo` | `TicketCreate.jsx` | Create ticket |
| `/admin/tickets/:id` | `TicketDetail.jsx` | Ticket detail |
| `/admin/clientes` | `ClientesList.jsx` | Clients list |
| `/admin/clientes/nuevo` | `ClienteCreate.jsx` | Create client |
| `/admin/clientes/:dni` | `ClienteDetail.jsx` | Client detail |
| `/admin/tareas` | `TareasList.jsx` | Tasks list |
| `/admin/presupuestos` | `PresupuestosList.jsx` | Quotes list |
| `/admin/checklists` | `ChecklistsList.jsx` | Checklists list |
| `/admin/checklists/nueva` | `ChecklistCreate.jsx` | Create checklist |
| `/admin/checklists/:id` | `ChecklistEdit.jsx` | Edit checklist |
| `/admin/checklists/:id/ejecutar` | `ChecklistRun.jsx` | Run checklist |
| `/admin/usuarios` | `UsuariosList.jsx` | Users list |
| `/admin/ajustes` | `Ajustes.jsx` | Settings |

All `/admin/*` routes require login (ProtectedRoute).

## Code conventions

- Spanish language in UI text, comments, and env variable comments
- CSS files co-located with components (e.g., `Dashboard.css` next to `Dashboard.jsx`)
- Icon libraries: `pixelarticons/react` and `react-icons/fa`
- No state management library — local `useState` only
- `adminData.js` contains hardcoded mock data (tickets, stats, activity)
- API layer in `src/api/` (auth.js, client.js) — not yet wired to backend

## Deployment

Docker: multi-stage build in `Dockerfile`. Builds with `npm ci && npm run build`, then runs `node server.mjs` on port 5174.

## Things that don't exist

- No tests (unit, integration, or e2e)
- No TypeScript
- No CI/CD workflows
- No backend (empty directory)
- No state management (Redux, Zustand, etc.)

## Pitfalls

- `npm run server` without prior `npm run build` → 404 for all routes
- Dev server without production server → YouTube carousel fails silently
- Backend proxy points to port 3001 which has no running server by default
- `.env` loading in `server.mjs` only fills unset env vars — existing env vars take precedence