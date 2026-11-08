# AutoLog Maintenance V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert AutoLog into a light, manual-maintenance history app for personal combustion cars, with safe manual Drive sync and commit-based published versioning.

**Architecture:** Keep the app as static HTML/CSS/JS. Move data normalization, historical compatibility and odometer selection into `data-model.js`, which is exercised with Node's built-in test runner. `app.js` consumes the module for state and rendering. GitHub Pages stamps the build SHA into a generated `version.js`.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js built-in test runner, Google Identity Services and Drive API, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-08-autolog-maintenance-v2-design.md`

## Global Constraints

- Do not add a framework, build dependency, backend, automatic sync, fuel tracking, planning/alerts, or documents.
- Keep `autolog_backup.json`, credentials and recovery codes ignored.
- Preserve and load existing `{ cars, records }` backups.
- Manual Drive sync uses `drive.file` scope only.
- UI copy is Portuguese (Portugal); theme is light and mobile-first.

## Review Focus

- Old backups without `fuel`/`plate` still import and render.
- A newest record with blank km does not become the car's `0 km` reading.
- Malformed imported JSON does not replace current in-memory data.
- Drive load does not run without explicit user action/confirmation.
- Published pages load a generated build SHA while local pages remain usable without it.

---

### Task 1: Testable compatible data model

**Files:**
- Create: `data-model.js`
- Create: `tests/data-model.test.js`
- Modify: `app.js`

**Interfaces:**
- Produces `AutoLogModel.normalizeDB(raw)`, `AutoLogModel.lastKnownKm(records, carId)`, and `AutoLogModel.validDB(raw)`.
- `app.js` consumes those functions for load/import and vehicle summaries.

- [ ] Write failing Node tests for V2 vehicle defaults, valid old backups and last known km ignoring blank readings.
- [ ] Run `node --test tests/data-model.test.js`; expect missing module/function failures.
- [ ] Implement the three exported pure functions in `data-model.js`.
- [ ] Run `node --test tests/data-model.test.js`; expect all tests passing.
- [ ] Commit `feat: add compatible autolog data model`.

### Task 2: Light maintenance-history UI

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Test: `tests/data-model.test.js`

**Interfaces:**
- Consumes `AutoLogModel` from Task 1.
- Produces a three-section UI: Histórico, Carros, Cópia.

- [ ] Write a failing test that normalized cars have blank `fuel` and `plate` defaults.
- [ ] Run `node --test tests/data-model.test.js`; expect the new assertion to fail.
- [ ] Implement V2 car form, car cards/detail, filters and responsive light styling; keep km optional on interventions.
- [ ] Run `node --test tests/data-model.test.js` and `node --check app.js`; expect success.
- [ ] Commit `feat: redesign maintenance history for two cars`.

### Task 3: Explicit manual Drive sync

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `README.md`

**Interfaces:**
- Consumes normalized DB from Task 1.
- Produces explicit `Ligar ao Drive` and `Sincronizar` controls plus local dirty/sync state.

- [ ] Write a failing test for `normalizeDB` preserving `updatedAt` and adding it when absent.
- [ ] Run `node --test tests/data-model.test.js`; expect failure.
- [ ] Replace implicit-flow/token persistence with GIS token-client authorization and explicit Drive load/upload actions.
- [ ] Run `node --test tests/data-model.test.js` and `node --check app.js`; expect success.
- [ ] Commit `feat: align manual Drive sync with FCOM`.

### Task 4: Commit-stamped public build

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `index.html`
- Modify: `README.md`

**Interfaces:**
- Workflow generates `version.js`; HTML loads it before `app.js`.

- [ ] Write a failing shell assertion that `index.html` references `version.js` and the workflow contains `GITHUB_SHA::7`.
- [ ] Run the assertion; expect failure because files are absent/references missing.
- [ ] Add the workflow and version label integration; document local and published behaviour.
- [ ] Run the assertion, `node --check app.js`, and the Node test suite; expect success.
- [ ] Commit `build: publish commit version with GitHub Pages`.

## Self-review

All goals map to Tasks 1–4. The Drive flow deliberately remains manual and no task introduces out-of-scope fuel, planning or documents. Tests pin historical compatibility, blank-km handling and timestamp versioning; final review checks the Drive interaction and deploy artefact manually.
