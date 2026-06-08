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
| Creatinine Clearance (CrCl) | ✅ Available | Cockcroft–Gault estimate with actual / ideal / adjusted body weight; µmol/L or mg/dL. |
| Weight Management Eligibility | ✅ Available | Tirzepatide (Mounjaro) eligibility against the South East London pathway; date-phased, borough-aware. |
| Atrial Fibrillation Risk | ✅ Available | CHA₂DS₂-VASc (stroke) + HAS-BLED (bleeding) scores with NICE NG196 thresholds. |
| Anticholinergic Burden (ACB) | ✅ Available | Total a patient's anticholinergic cognitive burden from the ACB scale; flags ≥3. |
| Opioid Dose Converter | ✅ Available | Approximate oral morphine equivalent (OME) + switching guide with safety caveats. |

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
scripts/build-dmd.test.mjs   parser unit tests (synthetic dm+d fixture)
.github/workflows/update-dmd.yml weekly dm+d refresh from TRUD (auto-deploys via Cloudflare)
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

## Deployment (Cloudflare Pages)

Hosted on **Cloudflare Pages** (free, served from the domain root). The app is a static SPA with
client-side Supabase auth, so the host only serves files.

**One-off setup:** in Cloudflare → Pages → *Connect to Git*, pick this repo and set:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (from your Supabase project) |

Node version is pinned by [`.nvmrc`](.nvmrc) (20). The base path defaults to `/`; no `BASE_PATH`
override is needed for Cloudflare. Security headers are set in [`public/_headers`](public/_headers).

After that, **every push to `main` auto-deploys**. The weekly
[Update dm+d data](.github/workflows/update-dmd.yml) workflow commits a refreshed `dmd.json`, and
that push triggers a Cloudflare rebuild automatically.

> Want stronger "internal only"? Put **Cloudflare Access** in front of the Pages project for
> edge-level login on top of the in-app Supabase auth — no code change.

Other hosts work too — it's plain static files. For a sub-path host (e.g. GitHub Pages) build with
`BASE_PATH=/ClinicalPharmTools/ npm run build`. A `Dockerfile` (build → nginx) is the path for
self-hosting on an internal server behind your VPN.

## Authentication

The whole app sits behind a login (email + password) using **Supabase Auth**. Access is gated in
three layers:
1. **Domain** — only **@nhs.net** / **@abtrace.co** can register (client check + server trigger).
2. **Email confirmation** — the user must click a link sent to their address before they can sign in.
3. **Admin approval** — a new account stays on a "pending approval" screen until an admin approves
   it. Admins approve from an in-app **Admin → Users** page (or the Supabase table). Sign-up
   captures the user's **practice + PCN** from a single dropdown grouped by PCN, sourced from
   **NHS ODS** (Bromley sub-ICB) and refreshable with `npm run build:practices`
   ([scripts/build-bromley-practices.mjs](scripts/build-bromley-practices.mjs) →
   [src/auth/bromleyPractices.json](src/auth/bromleyPractices.json)). See
   [`supabase/approvals.sql`](supabase/approvals.sql) and [`supabase/admin.sql`](supabase/admin.sql).

There is no backend to run — Supabase handles the user store, password hashing, email confirmation
and sessions.

> Note: this introduces runtime calls to Supabase and shares staff emails/passwords with it (a data
> processor). No patient data is involved and the calculators still run entirely client-side. The
> static files remain publicly fetchable from the CDN; the gate controls normal app access.

**Setup (one-off):**

1. Create a Supabase project — choose an **EU/London region** (staff-email residency).
2. **Auth → Providers → Email:** enable it with **Confirm email** on.
3. **Auth → URL Configuration:** set the Site URL + redirect URLs to your deployed URL.
4. **SQL editor:** run, in order, [`supabase/allowed-domains.sql`](supabase/allowed-domains.sql)
   (domain enforcement), [`supabase/approvals.sql`](supabase/approvals.sql) (approval gate), and
   [`supabase/admin.sql`](supabase/admin.sql) (admin role + practice column + policies).
   `admin.sql` bootstraps the first admin — edit the email at the bottom to your own first. After
   that, approve everyone else from the in-app **Admin → Users** page.
5. **Project Settings → API:** copy the **Project URL** and **anon public key** into env vars:

   ```bash
   cp .env.example .env   # then fill in the two values for local dev
   ```

   Set the same `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in your host's build environment
   (e.g. Cloudflare Pages). Both are public by design.

To work on the app locally without auth, set `VITE_AUTH_DEV_BYPASS=true` in `.env` (DEV only;
ignored in production builds). Allowed domains live in
[src/auth/allowedDomains.ts](src/auth/allowedDomains.ts) — keep them in sync with the SQL.

## Medication data (NHS dm+d)

The medication-name autocomplete and pack-size hints are powered by the NHS **dm+d**
(Dictionary of Medicines and Devices), ingested **at build time** — never at runtime — so the
app stays fully client-side and offline, with no embedded API key (PRD §7–§8).

- `src/tools/repeat-sync/data/dmd.json` is committed as a small **sample** so the app builds
  and runs without any credentials.
- The **Update dm+d data** GitHub Action ([update-dmd.yml](.github/workflows/update-dmd.yml))
  downloads the latest dm+d release from **NHS TRUD** (item 24), converts it to the slim JSON,
  commits the change back to the repo, and triggers a deploy. It runs weekly and on demand
  (Actions → *Update dm+d data* → *Run workflow*). It needs a `TRUD_API_KEY` repository secret
  (a free TRUD account subscribed to dm+d); without it the run no-ops and commits nothing.
- The deploy workflow just bundles whatever `dmd.json` is committed — it does not call TRUD.
- To generate the data locally:

  ```bash
  TRUD_API_KEY=your_key npm run build:dmd
  ```

The parser reads only the **virtual** products — VMP (generic names) and VMPP (generic pack
sizes); the actual/branded products (AMP/AMPP) are ignored. It also keeps only VMPs that are
**prescribable in primary care** (`PRES_STATCD` 0001/0009), which both slims the bundle and avoids
suggesting non-prescribable items. Its logic is unit-tested in
[scripts/build-dmd.test.mjs](scripts/build-dmd.test.mjs).

> dm+d is largely Open Government Licence v3.0, but its identifiers are SNOMED CT codes — confirm
> redistribution terms before publishing a full derived extract on a public site. The bundle holds
> only product names and pack sizes (no daily-dose data, which dm+d does not contain).
