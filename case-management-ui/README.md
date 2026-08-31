# case-management-ui

A React + Vite frontend for the [Camunda 7 case management workflow](../camunda-springboot-app) —
open a case, trigger any of five review tasks on demand in any order, complete them, and
close the case. Built entirely against the existing generic REST API of the Spring Boot
backend; no backend changes were needed.

## Stack

- React 19 + Vite 8, plain JavaScript (no TypeScript, no UI framework)
- Hand-written CSS (design tokens in `src/index.css`, layout/components in `src/App.css`)
- No state-management or data-fetching library — plain `useState`/`useEffect` and a small
  `localStorage`-backed hook for the case list

## Running it

You need the [`camunda-springboot-app`](../camunda-springboot-app) backend running first,
on its default port `8080` (`mvn spring-boot:run`).

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`). The Vite dev server proxies
every `/api/**` request to `http://localhost:8080` (see `vite.config.js`), so the browser
never makes a cross-origin request and the backend needs no CORS configuration. If your
backend runs somewhere else, change the `target` in `vite.config.js`.

```bash
npm run build      # production build to dist/
npm run preview    # serve that build locally to sanity-check it
```

Note: `npm run preview` (and any other static hosting of the `dist/` build) does **not**
get the dev-server proxy — you'd need to either serve it behind a reverse proxy that
forwards `/api` to the backend, or enable CORS on the backend and point `BASE` in
`src/api/client.js` at an absolute backend URL instead.

## What it does

- **Open a case** — starts a new `caseManagementProcess` instance. Its default "SAM" task
  appears immediately; SAM's task is never touched by anything else and stays open for
  the whole life of the case as the constant point of control.
- **Trigger a task on demand** — five stamp-styled buttons (Business Confirmation, Legal
  Review, Business Approval, Finance Approval, Procurement), deliberately unordered:
  click any of them, in any order, as many times as the case needs. Each calls
  `POST /trigger-activity` on the backend.
- **Complete / assign / unassign tasks** — from the open-tasks ledger table.
- **Close the case** — cancels SAM plus anything else still open in one call
  (`POST /cancel-activity`), with a confirmation step since it's final. The resulting
  status is `INTERNALLY_TERMINATED` (Camunda's correct label for a cancellation-driven
  close, as opposed to `COMPLETED` for reaching an end event through normal flow) — the
  UI just displays either as "Closed".
- The task list polls every 5 seconds while a case is open, so progress from another
  browser tab/user shows up without a manual refresh.

**The docket (case list) is tracked client-side in `localStorage`**, not fetched from the
backend — the backend's REST API is a generic Camunda layer with no
"list all process instances" endpoint, so this UI just remembers what it has opened
itself. Cases opened elsewhere (e.g. via curl, as in the backend README's walkthrough)
won't appear in the docket unless you know their process instance id — there's no field
to add one by id yet.

## Project structure

```
src/
  api/client.js           fetch wrapper for every backend call this UI uses
  hooks/useCases.js        localStorage-backed docket state
  components/
    Docket.jsx              case list sidebar
    CaseFile.jsx             main case detail view (status, stamp grid, task ledger)
    StampGrid.jsx            the 5 on-demand task trigger buttons
    TaskLedger.jsx           open-tasks table with complete/assign/unassign
    StatusPill.jsx           small status badge
    Notice.jsx               transient success/error banner
  App.jsx / App.css         layout + all component styling
  index.css                 design tokens (color/type/spacing) + base reset
```
