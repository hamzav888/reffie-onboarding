# Reffie CS Onboarding Platform

A bespoke project management tool for Reffie's customer success team. Track every account in onboarding, see exactly which steps each customer needs based on their tech stack, and advance through stages with a single click.

---

## What it does

- **Dashboard** — sortable, filterable account list with ARR totals, stage badges, and per-stage progress bars
- **Account detail** — 8-stage progress stepper, editable tech stack form, and a fully dynamic checklist that regenerates whenever the tech stack changes
- **Rules engine** — checklist steps are derived deterministically from each account's tech stack (PMS, tour platform, Zillow tier, Facebook, shared email, etc.)
- **Stage auto-advance** — completing all steps in the current stage automatically promotes the account and shows a toast
- **Notes** — per-step notes that persist across sessions
- **Add account** — modal form creates a new account at Pre-kick off with a blank tech stack ready to configure
- **Persistence** — all data lives in `localStorage` (Phase 1, no backend)

---

## Tech stack

| Layer | Library |
|---|---|
| UI framework | [React 18](https://react.dev) |
| Build tool | [Vite 8](https://vitejs.dev) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com) |
| State management | [Zustand 5](https://zustand-demo.pmnd.rs) — in-memory, API-backed |
| Routing | [React Router 7](https://reactrouter.com) |
| Font | Inter (Google Fonts) |

---

## Running locally

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (Google Cloud Console → APIs & Services → Credentials) |
| `VITE_API_BASE_URL` | FastAPI backend URL. Use `http://localhost:8000` in development, your Railway URL in production. |

Start the FastAPI backend first (see backend repo), then:

```bash
npm run dev
```

The dev server starts at `http://localhost:5173`.

---

## Building for production

```bash
npm run build
```

Output goes to `dist/`. Preview the production build locally with:

```bash
npm run preview
```

---

## Deploying to Vercel

### Option 1 — Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. Vercel auto-detects Vite and sets the output directory to `dist`.

### Option 2 — GitHub import

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository
3. Vercel will detect the Vite framework automatically — no settings to change
4. Click **Deploy**

### Why `vercel.json` is required

React Router uses client-side routing. Without the rewrite rule, refreshing any URL other than `/` (e.g. `/accounts/acc-1`) returns a 404 from Vercel's CDN. The included `vercel.json` routes all requests to `index.html` so React Router can handle them:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Project structure

```
src/
  components/
    account/       # StageStepper, TechStackForm, Checklist, StageBlock, StepItem, InfoCard
    dashboard/     # StatCards, FilterRow, AccountsTable
    layout/        # TopBar, Toast
    ui/            # Badge, ProgressBar, Toggle, StepCheckbox
  lib/
    constants.js   # STAGES, option lists, table columns
    stepsEngine.js # generateSteps(), syncChecklist(), auto-advance logic
    api.js         # HTTP client, snake_case↔camelCase mapping, typed helpers
    utils.js       # fmtArr, stageBadgeVariant, generateId, comparators
  modals/
    AddAccountModal.jsx
  pages/
    Dashboard.jsx
    AccountDetail.jsx
  store/
    useAccountStore.js   # Zustand store — all state + actions
  styles/
    globals.css          # Tailwind directives + Reffie component layer
```
