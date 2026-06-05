# PRD — Repeat Medication Synchronisation Tool

**Working name:** ClinicalPharmTools
**Repo:** `ClinicalPharmTools`
**Part of:** ClinicalPharmTools — a suite of clinical pharmacy web tools; this is the **first** tool.
**Owner:** Clinical Pharmacy Team
**Status:** Draft v1 (for build)
**Target platform:** Static web app hosted on GitHub Pages
**Audience for this doc:** Claude Code / implementing engineer

---

## 1. Summary

A browser-based calculator that helps clinical pharmacy staff in a UK GP practice align ("synchronise") a patient's repeat medications so they all run out on the same date. The user enters each medication's current stock, daily usage and standard cycle length; the tool calculates a one-off bridging quantity per medication that brings everything onto a common run-out date, and the steady-state quantity to prescribe each cycle thereafter.

**Platform context.** This tool ships inside `ClinicalPharmTools`, which is intended to grow into a small suite of clinical pharmacy calculators (a creatinine clearance / CrCl calculator is a likely next addition). The build should therefore stand up the suite's shared shell — a home page listing tools, common layout, and a shared clinical disclaimer — even though only this one tool exists in v1. Each tool is self-contained so future tools can be added without touching existing ones.

This is a **clinical decision-support / calculation aid**, not a prescribing system. It performs no prescribing, holds no patient record, and connects to no clinical system.

---

## 2. Background & rationale

Patients on multiple repeat medications often have items that run out at different times, causing repeated pharmacy trips, part-supplies, missed doses, wastage and avoidable workload for reception, dispensing and pharmacy teams. "Medication synchronisation" aligns the run-out dates so a patient can order and collect everything in one cycle.

In UK primary care, repeat prescribing commonly defaults to a **28-day cycle**, though 56-day and other cycles are used. The arithmetic for synchronisation is simple but fiddly to do by hand across several items, and error-prone. A small focused tool removes that friction.

---

## 3. Goals and non-goals

**Goals (v1)**
- Let a user enter several medications and compute the bridging quantity to synchronise them.
- Show, per medication, current days of supply and the resulting synchronised run-out date.
- Produce a clean, copyable summary to transcribe into the clinical system or hand to a prescriber.
- Be entirely client-side, fast, and safe to host on a public GitHub Pages site.

**Non-goals (v1)**
- No integration with EMIS, SystmOne, EPS or any clinical system.
- No storage or transmission of patient-identifiable data.
- No handling of variable-dose regimens (e.g. warfarin, alternating doses) or PRN ("as required") items — these are flagged and excluded from calculation.
- No authentication, multi-user accounts, or backend.

---

## 4. Target users

Clinical pharmacists, pharmacy technicians and prescribing support staff within a single GP practice. Assume reasonable clinical literacy but no technical setup beyond opening a URL.

---

## 5. User stories

- As a pharmacy technician, I want to enter a patient's repeat items and see one bridging quantity per item so I can synchronise their next order.
- As a clinical pharmacist, I want to see each item's current days of supply so I can spot which items are most out of step.
- As a user, I want to choose the synchronisation cycle (default 28 days) and optionally sync to a specific calendar date.
- As a user, I want a tidy summary I can copy out, because I'll re-enter the quantities into the clinical record myself.
- As a user, I want a clear warning if an item can't be calculated (zero dose, variable dose), so I don't get a misleading result.

---

## 6. Functional requirements

### 6.1 Medication input (data model)

The user adds one or more rows. Each medication row:

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | text | yes | Free text, e.g. "Amlodipine 5mg tablets". No PID. |
| `currentQuantity` | number ≥ 0 | yes | Units currently held by the patient. |
| `dailyDose` | number > 0 | yes | Units taken per day (decimals allowed, e.g. 0.5). |
| `cycleLength` | integer > 0 (days) | yes | Standard ongoing prescription length. Defaults to global cycle. |
| `packSize` | integer > 0 | no | If provided, enables rounding bridging/ongoing quantities to whole packs. |
| `excludeFromSync` | boolean | no | For PRN/variable items the user wants listed but not calculated. |

Global controls:
- `defaultCycleLength` — integer days, default **28**. Applies to new rows.
- Synchronisation mode (radio):
  - **Catch up to longest supply** (default) — minimal bridging / least waste.
  - **Round up to a whole cycle** — sync horizon rounded up to the next multiple of the cycle.
  - **Sync to a specific date** — user picks a calendar date.
- Rounding rule for quantities: round **up** to whole units (default), or round up to whole packs if `packSize` set.

### 6.2 Synchronisation algorithm

Definitions (per medication *i*):
- `daysRemaining_i = currentQuantity_i / dailyDose_i`

**Step 1 — Determine the synchronisation horizon `H` (days from today):**
- *Catch up to longest supply:* `H = ceil(max(daysRemaining_i))` over all included meds.
- *Round up to a whole cycle:* `H = ceil(max(daysRemaining_i) / cycle) * cycle`.
- *Sync to a specific date:* `H = number of days from today to the chosen date`.

**Step 2 — Bridging quantity (one-off, this cycle), per medication:**
```
bridgingQty_i = (H * dailyDose_i) - currentQuantity_i
```
- Round **up** per the rounding rule (whole units, or whole packs).
- If `bridgingQty_i < 0`: the item already has supply beyond `H`. Do **not** output a negative quantity. Flag the item ("already supplied beyond sync date — choose a later sync date") and set bridging to 0.

**Step 3 — Ongoing steady-state quantity, per medication:**
```
ongoingQty_i = cycleLength_i * dailyDose_i   (rounded up per rule)
```
After the bridging supply, prescribing `ongoingQty_i` each cycle keeps every item aligned (all run out at `H`, then `H + cycle`, etc.).

**Step 4 — Synchronised run-out date:**
```
syncRunOutDate = today + H days
```

> Note: rounding bridging quantities up means real run-out may fall a few days beyond `H`, giving the patient a small buffer. This is acceptable and intentionally safer than rounding down.

### 6.3 Worked example (must match in tests)

Cycle = 28 days, mode = catch up to longest supply, all doses 1/day:

| Med | Current qty | Daily | Days remaining |
|---|---|---|---|
| Amlodipine 5mg | 20 | 1 | 20 |
| Atorvastatin 40mg | 35 | 1 | 35 |
| Ramipril 5mg | 14 | 1 | 14 |

- `H = ceil(max(20, 35, 14)) = 35`
- Bridging: Amlodipine `35−20 = 15`; Atorvastatin `35−35 = 0`; Ramipril `35−14 = 21`
- Ongoing each cycle: `28 × 1 = 28` for each
- Synchronised run-out: today + 35 days; next order at the synced cycle thereafter.

### 6.4 Outputs

For each medication: name, current days of supply, **bridging quantity now**, **ongoing quantity per cycle**, and any flags.
Summary block: synchronisation mode, cycle length, horizon `H`, synchronised run-out date, and the next common order/review date.
A **Copy summary** action producing plain text suitable for pasting into a clinical record or message, and a **Print** view.

### 6.5 Validation & edge cases

- `dailyDose ≤ 0` or blank → row error, excluded from calculation.
- `currentQuantity` blank → treat as error (don't assume 0 silently).
- No valid rows → disable calculation with a clear prompt.
- Sync date in the past, or earlier than the longest current supply → warn and require a later date.
- Decimal doses (0.5/day) supported; never present fractional tablets in output — round up.
- `excludeFromSync` items are listed in output but show "not calculated (variable/PRN)".

---

## 7. Information governance & clinical safety

These are hard requirements, not nice-to-haves, because the app is publicly hosted.

- **No patient-identifiable data.** The medication `name` field is free text; UI copy must instruct users not to enter patient names, NHS numbers, DOB or other identifiers. Consider a non-blocking inline reminder.
- **Fully client-side.** All calculation runs in the browser. No inputs are transmitted anywhere. No analytics, telemetry, error reporting, or third-party scripts that could capture input values.
- **No persistence by default.** v1 holds data in memory for the session only. (See future enhancements for an opt-in, local-only, no-PID save.)
- **Clinical disclaimer**, persistently visible: this tool is a calculation aid only; all quantities must be clinically reviewed and the final prescribing decision rests with the prescriber. It does not account for clinical factors, interactions, titration, or dose changes.
- Display a version number and "last updated" so users know which build they're on.

---

## 8. Non-functional requirements

- **Performance:** instant recalculation on input change; no perceptible lag for typical inputs (≤ ~30 meds).
- **Accessibility:** WCAG 2.1 AA — keyboard operable, labelled inputs, sufficient contrast, screen-reader-friendly results.
- **Responsive:** usable on desktop and tablet; practice users may be on either.
- **Browsers:** current Chrome, Edge, Firefox, Safari.
- **Offline-tolerant:** once loaded, works without a connection (no runtime network calls).

---

## 9. UI/UX guidelines

- Clean, clinical, uncluttered. A table/list of medication rows with an "add row" control, global controls in a clearly separated panel, and a results panel that updates live.
- Results should make the *bridging quantity* the visually dominant number per row, with ongoing quantity secondary.
- Clear visual treatment for flagged/excluded items.
- Minimal colour; reserve colour for warnings and the key output figures.

---

## 10. Technical approach

`ClinicalPharmTools` is a single static site (one Vite app) with a home page that lists the tools, each tool as its own route and self-contained folder. Adding a future tool (e.g. CrCl) means adding a folder under `src/tools/` and a card on the home page — no rework of existing tools.

- **Stack:** React + TypeScript + Vite, styled with Tailwind. Client-side routing via React Router using **HashRouter** (avoids GitHub Pages deep-link 404s without needing a 404.html fallback).
- **Shared shell:** a common header (suite name), a footer carrying the clinical disclaimer and no-PID reminder, and shared UI components, so every tool looks and behaves consistently.
- **Calculation:** each tool keeps its logic in pure, UI-decoupled functions with unit tests. For this tool that is `syncEngine.ts`; the worked example in §6.3 is a required test case.
- **Hosting:** GitHub Pages, served from the project path `/ClinicalPharmTools/`. Set Vite `base: '/ClinicalPharmTools/'`. Build artefacts published via a GitHub Actions workflow on push to `main`.
- **No backend, no environment secrets, no external runtime dependencies** that make network calls.

Suggested layout:
```
ClinicalPharmTools/
├─ README.md
├─ docs/
│  └─ repeat-sync.md          (this PRD; one doc per tool)
├─ src/
│  ├─ App.tsx                 (router + shared layout)
│  ├─ pages/Home.tsx          (lists available tools)
│  ├─ components/             (shared: Layout, Disclaimer, inputs…)
│  └─ tools/
│     └─ repeat-sync/
│        ├─ RepeatSync.tsx
│        ├─ syncEngine.ts      (pure calculation logic)
│        └─ syncEngine.test.ts
└─ .github/workflows/deploy.yml
```

---

## 11. Acceptance criteria

- Adding ≥ 2 medications and entering valid data produces correct bridging and ongoing quantities matching the §6.3 example.
- Switching synchronisation mode recalculates correctly (catch-up vs whole-cycle vs target-date).
- Invalid/zero dose rows are flagged and excluded without breaking the result.
- A target sync date earlier than the longest current supply is rejected with a clear message.
- Output never shows negative or fractional quantities.
- Copy summary and print produce a complete, legible summary.
- Clinical disclaimer and no-PID guidance are visible.
- No network requests occur after initial page load (verifiable in dev tools).
- Deploys cleanly to GitHub Pages with correct asset paths.

---

## 12. Future enhancements & roadmap

`ClinicalPharmTools` is a growing suite; planned/possible additions include:

- **Creatinine clearance (CrCl) calculator** (Cockcroft–Gault), the likely next tool — reusing the same shared shell and IG model.
- Further dosing/clinical calculators added under `src/tools/` as the team needs them.
- A shared component and input-validation library so new tools reuse the same building blocks.

For this tool specifically (out of scope for v1):
- Opt-in local-only save/recall of a synchronisation scenario (no PID), e.g. via `localStorage`.
- Whole-pack / original-pack dispensing optimisation as a first-class mode.
- Bulk entry / paste of a medication list.
- Handling of variable-dose schedules.

---

## 13. Open questions

1. Default cycle confirmed as 28 days? Any items the team routinely runs on a different cycle?
2. Is whole-pack rounding needed for v1, or is whole-unit rounding sufficient?
3. Project path `/ClinicalPharmTools/` is assumed. Do you anticipate moving to a custom domain later (which would change the Vite `base`)?
4. Does the team want the summary formatted for any particular clinical-system field convention?
