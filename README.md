# ClinicalPharmTools

A small suite of **client-side** clinical pharmacy calculators for a UK GP practice.
Everything runs in the browser — no patient data is stored or transmitted, no backend,
no analytics.

> **Clinical disclaimer:** these are calculation aids only. All output must be clinically
> reviewed; the final prescribing decision rests with the prescriber.

## Tools

| Tool | Status | Description |
|---|---|---|
| Repeat Medication Synchronisation | ✅ Available | Align repeat items onto a common run-out date; compute bridging + ongoing quantities. |
| Creatinine Clearance (CrCl) | 🚧 Planned | Cockcroft–Gault estimate. |

## Tech stack

- **React + TypeScript + Vite**, styled with **Tailwind CSS**.
- Routing via **React Router (`HashRouter`)** — avoids GitHub Pages deep-link 404s.
- Each tool is self-contained under `src/tools/<tool>/`, with pure, unit-tested calculation
  logic decoupled from the UI (e.g. `repeat-sync/syncEngine.ts`).

## Project layout

```
src/
├─ App.tsx                  router + shared layout
├─ pages/                   Home (tool list), NotFound
├─ components/              shared shell: Layout, Header, Footer, Disclaimer
└─ tools/
   ├─ registry.tsx          single source of truth for tools (home cards + routes)
   └─ repeat-sync/
      ├─ RepeatSync.tsx      tool UI
      ├─ syncEngine.ts       pure calculation logic
      ├─ syncEngine.test.ts  unit tests (incl. the PRD §6.3 worked example)
      ├─ summary.ts          plain-text summary builder
      ├─ dmdData.ts          loader for the bundled dm+d subset
      └─ data/dmd.json       bundled dm+d medication subset (sample by default)
scripts/build-dmd.mjs        build-time dm+d ingestion from NHS TRUD
.github/workflows/deploy.yml GitHub Pages CI
PRD.md                       product requirements
```

### Adding a new tool

1. Create `src/tools/<slug>/` with a component and (ideally) a pure, tested engine.
2. Add one entry to [`src/tools/registry.tsx`](src/tools/registry.tsx).

The home page and the router both read the registry — nothing else needs editing.

## Development

```bash
npm install      # install dependencies
npm run dev      # start the dev server
npm test         # run unit tests
npm run build    # typecheck + production build
npm run preview  # preview the production build
```

## Deployment

Pushes to `main` trigger [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which tests, builds and publishes to GitHub Pages at `/ClinicalPharmTools/`.

The base path is configurable. If the suite later moves to a custom domain or another host
served from the root, build with `BASE_PATH=/ npm run build` — no code change needed.

## Medication data (NHS dm+d)

The medication-name autocomplete and pack-size hints are powered by the NHS **dm+d**
(Dictionary of Medicines and Devices), ingested **at build time** — never at runtime — so the
app stays fully client-side and offline, with no embedded API key (PRD §7–§8).

- `src/tools/repeat-sync/data/dmd.json` is committed as a small **sample** so the app builds
  and runs without any credentials.
- `npm run build:dmd` fetches the latest dm+d release from **NHS TRUD** (item 24) and overwrites
  that file with the full extract. It requires a free TRUD account subscribed to dm+d and a key:

  ```bash
  TRUD_API_KEY=your_key npm run build:dmd
  ```

- In CI, add the key as the `TRUD_API_KEY` repository secret; the deploy workflow refreshes the
  data before building. Without the secret it no-ops and ships the sample.

> dm+d is largely Open Government Licence v3.0, but its identifiers are SNOMED CT codes — confirm
> redistribution terms before publishing a full derived extract on a public site. The bundle holds
> only product names and pack sizes (no daily-dose data, which dm+d does not contain).
