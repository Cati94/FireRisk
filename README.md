# FireRisk

FireRisk is a modular foundation for wildfire/rural-fire situational awareness and decision-support work. This repository reflects the final delivered state of the Codex handoff plan (`codex_manifest.json`), covering Phases 0 through 7: a local Node app, resilient provider abstractions, mock data, internal API endpoints, a heuristic propagation simulator, advisory decision support, a pluggable AI model adapter, post-fire/prevention modules, and hardening (tests, degraded-mode handling, structured logging).

All functionality currently runs against mock/heuristic data. No live provider credentials, calibrated fire-behavior models, or persistence layer are included in this delivery — see [Known Limitations](#known-limitations).

## Delivery

- **Tag:** `v0.1.0`
- **Delivery commit message:** `chore: entrega final da Fase 0-7 (foundation, providers, simulação, decisão, IA, pós-incêndio, prevenção)`. Run `git rev-parse v0.1.0` for the exact commit hash — it is not hardcoded here to avoid staleness whenever this file itself changes.
- **`package.json` version:** `0.1.0`
- **Verified with:** Node.js `v22.22.2`; `npm test` and `npm run build` both passing (8/8 tests, foundation check OK) at delivery time.

## Stack

- Runtime: Node.js 18+ using native ESM and built-in `fetch`.
- Package manager: npm.
- Frontend: static HTML/CSS/JavaScript served by the local Node server.
- Map: MapLibre GL loaded from CDN with a visible fallback if map assets or styles fail.

## Dependencies

- Runtime dependencies: **none**. `package-lock.json` has no `dependencies`/`devDependencies` entries — the app runs entirely on Node's built-ins (native ESM, `fetch`, `node:test`, `node:http`).
- `npm install` is still required once to generate `node_modules` (empty) and validate the lockfile; no packages are downloaded.
- Frontend: plain HTML/CSS/JS in `public/`, no bundler or build step.
- MapLibre GL is loaded from a CDN at runtime (see [Map Behavior](#map-behavior)); it is not vendored into the repo.

## Local Setup

Windows (PowerShell):

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

macOS/Linux:

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

If port `5173` is busy, set `PORT` in `.env`:

```
PORT=5174
```

## Scripts

- `npm run install:check` — checks that Node is available (`node --version`).
- `npm run dev` — starts the local server (`node src/server.mjs`).
- `npm start` — starts the same local server as `dev`.
- `npm test` — runs the Node test suite (`node --test`) against `test/foundation.test.mjs`.
- `npm run build` — runs the foundation sanity check (`src/check.mjs`) and then the test suite; this is the command used to validate this delivery.

## Environment

Use `.env.example` as the source of truth for local variables. Do not put real keys in source files, prompts, docs, or commits.

Important variables:

- `FIRERISK_ENABLE_MOCKS=true` keeps the app in mock mode.
- `FIRERISK_FORCE_DEGRADED=true` forces global degraded mode for validation.
- `FIRERISK_PROVIDER_TIMEOUT_MS=8000` controls external-provider timeout handling.
- `MAPTILER_STYLE_URL` can point to a MapLibre-compatible style.
- `FIRMS_MAP_KEY` is required before live NASA FIRMS integration can be enabled.
- `ICNF_OCCURRENCES_URL` points to the planned ICNF occurrences source.

## Internal API

The local server exposes:

- `GET /api/fires`
- `GET /api/hotspots`
- `GET /api/aircraft`
- `GET /api/weather`
- `GET /api/providers`
- `GET /api/health`
- `GET /api/config`

Every provider response follows the same shape:

```json
{
  "providerId": "icnf",
  "fetchedAt": "2026-07-03T00:00:00.000Z",
  "data": [],
  "status": {
    "id": "icnf",
    "name": "ICNF occurrences",
    "health": "healthy",
    "enabled": true
  },
  "warnings": []
}
```

Provider failures return empty data plus status/warnings instead of crashing the app.

`GET /api/health` returns global system health, degraded mode state, provider statuses, AI status, mock mode, and snapshot counts.

## Provider Layer

Providers live in `src/providers` and implement the common methods described by `contracts/provider-contract.ts`:

- `fetchRaw()`
- `normalize()`
- `getStatus()`
- `getLastUpdated()`
- `healthCheck()`

Current providers:

- `ICNFProvider` for fire occurrences, mock-backed by default.
- `FIRMSProvider` for hotspots, mock-backed by default.
- `AircraftMockProvider` for aircraft positions.
- `WeatherMockProvider` for weather observations.
- `WeatherUndergroundProvider` for PWS current observations.
- `XWeatherProvider` for current conditions, hourly forecast, daily forecast, lightning, and alerts.
- `MockProvider` for generic mock sources.

The shared fetch helper handles timeout, unexpected HTML, invalid JSON, empty responses, unavailable sources, missing credentials, HTTP errors, and rate limits.

## Weather

`GET /api/weather` returns normalized weather data for simulation and decision-support modules:

- `observations`: current station conditions.
- `forecasts`: hourly/daily forecast records when available.
- `lightning`: lightning strikes when available.
- `alerts`: weather alerts when available.
- `nearestObservation`: nearest station match when `latitude` and `longitude` query parameters are supplied.
- `providerStatuses`: individual Weather Underground, Xweather, or mock provider states.

Example:

```powershell
Invoke-RestMethod "http://localhost:5173/api/weather?latitude=40.112&longitude=-8.246"
```

In mock mode the app shows plausible weather, lightning, and alert data without credentials. Live Weather Underground and Xweather calls remain server-side; API keys and client secrets are never sent to the frontend.

## Simulation

`GET /api/simulations/run?horizonMinutes=60` runs the simplified propagation simulator and stores an in-memory snapshot. Supported horizons are `30`, `60`, `180`, `360`, and `720` minutes.

The simulation returns:

- `predictedPerimeterGeoJson`
- `uncertaintyGeoJson`
- `directionGeoJson`
- `temporalFrontsGeoJson`
- spread direction and rate
- estimated intensity
- confidence
- assumptions, missing data, and warnings

`GET /api/simulations` lists the latest in-memory snapshots.

The initial model is intentionally heuristic and transparent. Wind drives spread direction and rate, gusts increase uncertainty, high temperature and low humidity raise expected intensity, and missing fuel/slope data lowers confidence. The UI always shows confidence and validation warnings; it does not issue operational orders.

## Decision Support

`GET /api/decisions/run?horizonMinutes=60` generates advisory decision-support recommendations from the current incident, hotspots, weather, aircraft, and simulation context.

Each recommendation includes:

- `title`
- `category`
- `priority`
- `confidence`
- `description`
- `rationale`
- `assumptions`
- `missingData`
- `suggestedValidation`
- `createdAt`
- optional `relatedGeoJson`

`GET /api/decisions` lists recent in-memory decision snapshots.

Decision support uses advisory language only. It can suggest evaluation, validation, review, or monitoring priorities, but it does not issue operational commands such as dispatch, evacuation, or attack instructions. Missing data is surfaced and reduces confidence.

## AI Model Adapter

`FIRERISK_AI_MODE` selects the AI adapter:

- `mock`: local deterministic mock analysis, no external service required.
- `local`: POSTs normalized FireRisk context to `FIRERISK_AI_LOCAL_ENDPOINT`.
- `remote`: POSTs normalized FireRisk context to `FIRERISK_AI_REMOTE_ENDPOINT` with `FIRERISK_AI_API_KEY` as a bearer token when present.

Endpoints:

- `GET /api/ai/analyze?horizonMinutes=60`
- `GET /api/ai`

AI output follows the contract in `contracts/ai-model-contract.ts`: behavior analysis, qualitative forecast, risk classification, findings, recommendations, uncertainty, explanation, and missing data.

AI failure is non-fatal. If local or remote analysis fails, the AI status becomes degraded and `/api/decisions/run` still returns heuristic `DecisionSupportEngine` recommendations with `aiFallbackActive=true`.

## Post-Fire And Prevention

`GET /api/postfire/run?horizonMinutes=60` creates a mock post-fire assessment. It uses the latest simulation perimeter as a stand-in burned perimeter when no imported perimeter exists.

The post-fire output includes:

- `assessment`
- burned perimeter GeoJSON
- probable erosion zones GeoJSON
- stabilization priorities
- recovery tasks
- confidence and missing data

`GET /api/prevention/run` creates a mock prevention analysis from incidents, hotspots, weather/lightning, and known missing datasets.

The prevention output includes:

- critical areas GeoJSON
- fuel-management, surveillance, and camera/sensor priorities
- data status
- confidence and missing data
- a report summary placeholder for future PDF/CSV/GeoJSON export

`GET /api/postfire` and `GET /api/prevention` list recent in-memory snapshots.

## Tests And Hardening

Minimum checks:

```powershell
npm test
npm run build
```

`test/foundation.test.mjs` covers 8 cases across the mock fixtures and the core engines, all passing as of this delivery:

- provider mock fixture sanity (`test/fixtures/mock-context.mjs`)
- `ICNFProvider` normalization of location-based mock occurrences
- `FIRMSProvider` preservation of decimal confidence and coordinates
- provider `fetchJson` reporting invalid JSON without throwing raw syntax errors
- `FireBehaviorEngine` lowering confidence when fuel/terrain data is missing
- `PropagationSimulator` producing a valid perimeter, uncertainty, direction, and fronts
- `DecisionSupportEngine` producing advisory recommendations with missing-data flags
- `MockAIModelAdapter` returning assistive uncertainty and recommendations

There is no coverage yet for `src/server.mjs` HTTP routing, `src/postfire`, `src/prevention`, `WeatherUndergroundProvider`, or `XWeatherProvider` beyond manual/mock-mode exercise — see [Known Limitations](#known-limitations).

Additional validation endpoints:

- `GET /api/health` for global system health.
- `GET /api/exports/geojson` for generated GeoJSON exports and validation results.
- `GET /api/replay/mock` for a mock incident replay structure prepared for future persisted history.

Structured logs are emitted as JSON lines by the local server. Use `FIRERISK_LOG_LEVEL=silent` to suppress them during manual testing.

## Known Limitations

- All analysis is mock-first and heuristic until real provider credentials and validation datasets are supplied; `FIRERISK_ENABLE_MOCKS=true` is the default.
- Fire spread, post-fire severity, erosion, runoff, prevention priorities, and AI output are not calibrated scientific predictions — they are transparent heuristics meant to be reviewed by a human.
- No operational orders are generated; outputs are analytical support with confidence, assumptions, warnings, and missing data.
- Snapshots (simulation, decision, post-fire, prevention) are held in memory only (`*-store.mjs` modules) and reset when the Node process restarts. There is no database or file persistence layer.
- `WeatherUndergroundProvider` and `XWeatherProvider` are implemented against their documented APIs but have not been validated against live credentials in this delivery; they fall back to mock/degraded behavior without keys.
- `GET /api/exports/geojson` returns JSON payloads; file download/PDF/CSV export is prepared (see `docs/DATA_SOURCES.md`) but not implemented.
- `GET /api/replay/mock` uses generated mock frames, not observed historical incident progression.
- MapLibre is loaded from a CDN, so offline browser sessions show the map fallback while the internal APIs continue to work.
- Automated test coverage is limited to the core providers/engines (see [Tests And Hardening](#tests-and-hardening)); `src/server.mjs` routing and the post-fire/prevention engines are only exercised manually.
- Contracts in `contracts/*.ts` are TypeScript type definitions used as documentation/reference; the runtime code is plain JavaScript (`.mjs`) and is not type-checked against them by a build step.

## Map Behavior

The first screen is the operational map with provider, weather, simulation, decision, post-fire, and prevention status. The app loads mock fire, hotspot, aircraft, weather station, lightning, predicted perimeter, uncertainty, direction, temporal-front, burned-perimeter, erosion-zone, and prevention-priority layers. If MapLibre, a style URL, or a tile source fails, the page shows a map fallback message while the API and provider panel continue to work.

## Original Handoff Package

The Codex handoff assets that shipped in this delivery:

- `codex_manifest.json` — phase list, rules, and recommended execution order.
- `docs/ARCHITECTURE.md`, `docs/DATA_SOURCES.md`, `docs/ACCEPTANCE_CRITERIA.md`, `docs/SAFETY_AND_DECISION_POLICY.md`, `docs/IMPLEMENTATION_NOTES.md`.
- `contracts/provider-contract.ts`, `contracts/ai-model-contract.ts`, `contracts/firerisk-types.ts`.
- `templates/CODEX_HANDOFF.md`, `templates/.env.example`.

Note: `codex_manifest.json` points to a `prompts/00_MASTER_PROMPT.md` ... `prompts/07_REVIEW_AND_HARDENING.md` series as the recommended per-phase execution prompts; that `prompts/` directory is **not included** in this repository. If those prompts are needed for future work, they should be sourced separately and added under `prompts/`.
