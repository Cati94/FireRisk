# FireRisk

FireRisk is a modular foundation for wildfire/rural-fire situational awareness and decision-support work. This repository now contains the Phase 0/1 base: a small local Node app, resilient provider abstractions, mock data, internal API endpoints, and the original Codex handoff prompts/contracts.

## Stack

- Runtime: Node.js 18+ using native ESM and built-in `fetch`.
- Package manager: npm.
- Frontend: static HTML/CSS/JavaScript served by the local Node server.
- Map: MapLibre GL loaded from CDN with a visible fallback if map assets or styles fail.
- Dependencies: none at runtime or install time.

  ## API Credentials

FireRisk is designed to work with multiple external data providers. All credentials must be stored only in the local `.env` file and never committed to source control.

### Weather Underground

Provides Personal Weather Station (PWS) observations.

1. Create a Weather Underground account.
2. Register a Personal Weather Station (or obtain access to an existing one).
3. Subscribe to the Weather Underground API (if required for your account).
4. Generate an API Key from your Weather Underground developer account.
5. Configure:

```.env.example
WEATHERUNDERGROUND_API_KEY=your_api_key
WEATHERUNDERGROUND_STATION_ID=your_station_id
```

---

### IPMA

The Instituto Português do Mar e da Atmosfera publishes several public datasets.

Most observation and forecast endpoints do **not** require authentication.

Useful services include:

- Weather observations
- Forecasts
- Warnings
- Radar
- Seismic information

If IPMA introduces authenticated services in the future, obtain credentials through the official IPMA developer or data portal.

Configuration example:

```.env.example
IPMA_BASE_URL=https://api.ipma.pt/open-data/
```

---

### NASA FIRMS / MODIS

FireRisk uses NASA FIRMS hotspot data (MODIS and VIIRS).

1. Create a NASA Earthdata account.
2. Log in to the FIRMS portal.
3. Generate a FIRMS Map Key.
4. Configure:

```.env.example
FIRMS_MAP_KEY=your_firms_map_key
```

The same key provides access to:

- MODIS hotspots
- VIIRS hotspots
- FIRMS Area API
- FIRMS Map API

---

### ICNF

The Instituto da Conservação da Natureza e das Florestas currently publishes several datasets through public services.

If public endpoints are available, authentication is not normally required.

If restricted services are needed:

1. Contact ICNF.
2. Request API or data access.
3. Configure the endpoint:

```.env.example
ICNF_OCCURRENCES_URL=https://...
```

---

### Xweather (formerly AerisWeather)

Provides professional weather services including:

- Current observations
- Hourly forecasts
- Daily forecasts
- Lightning
- Alerts

1. Create an Xweather developer account.
2. Create a new application.
3. Obtain:

- Client ID
- Client Secret

Configure:

```.env.example
XWEATHER_CLIENT_ID=your_client_id
XWEATHER_CLIENT_SECRET=your_client_secret
```

---

### Flightradar24

Flightradar24 does **not** provide a free public API.

Options:

- Apply for commercial API access.
- Obtain an Enterprise agreement.
- Use another ADS-B provider (recommended for development).

If access is granted:

```.env.example
FLIGHTRADAR24_API_KEY=your_api_key
```

For development, the mock provider should remain enabled.

---

## Example `.env`

```.env.example
# Weather Underground
WEATHERUNDERGROUND_API_KEY=
WEATHERUNDERGROUND_STATION_ID=

# NASA FIRMS
FIRMS_MAP_KEY=

# Xweather
XWEATHER_CLIENT_ID=
XWEATHER_CLIENT_SECRET=

# ICNF
ICNF_OCCURRENCES_URL=

# FlightRadar24
FLIGHTRADAR24_API_KEY=
```

## Local Setup On Windows

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

If port `5173` is busy, set `PORT` in `.env`:

```powershell
PORT=5174
```

## Scripts

- `npm run install:check` checks that Node is available.
- `npm run dev` starts the local server.
- `npm start` starts the same local server.
- `npm test` runs the minimum Node test suite.
- `npm run build` runs the foundation sanity check and tests.

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

## Hardening And Validation

Minimum checks:

```powershell
npm test
npm run build
```

Additional validation endpoints:

- `GET /api/health` for global system health.
- `GET /api/exports/geojson` for generated GeoJSON exports and validation results.
- `GET /api/replay/mock` for a mock incident replay structure prepared for future persisted history.

Structured logs are emitted as JSON lines by the local server. Use `FIRERISK_LOG_LEVEL=silent` to suppress them during manual testing.

## Known Limitations

- All analysis is mock-first and heuristic until real provider credentials and validation datasets are supplied.
- Fire spread, post-fire severity, erosion, runoff, prevention priorities, and AI output are not calibrated scientific predictions.
- No operational orders are generated; outputs are analytical support with confidence, assumptions, warnings, and missing data.
- Snapshots are in memory only and reset when the Node process restarts.
- GeoJSON export endpoints return JSON payloads now; file download/PDF/CSV export is prepared but not implemented.
- Replay uses generated mock frames, not observed historical incident progression.
- MapLibre is loaded from a CDN, so offline browser sessions show the map fallback while APIs continue to work.

## Map Behavior

The first screen is the operational map with provider, weather, simulation, decision, post-fire, and prevention status. The app loads mock fire, hotspot, aircraft, weather station, lightning, predicted perimeter, uncertainty, direction, temporal-front, burned-perimeter, erosion-zone, and prevention-priority layers. If MapLibre, a style URL, or a tile source fails, the page shows a map fallback message while the API and provider panel continue to work.

## Original Handoff Package

The original planning assets remain available:

- `prompts/00_MASTER_PROMPT.md`
- `prompts/01_PHASE_0_1_FOUNDATION.md`
- `prompts/02_PHASE_2_WEATHER.md`
- `prompts/03_PHASE_3_SIMULATION.md`
- `prompts/04_PHASE_4_DECISION_SUPPORT.md`
- `prompts/05_PHASE_5_AI_MODEL.md`
- `prompts/06_PHASE_6_POSTFIRE_PREVENTION.md`
- `prompts/07_REVIEW_AND_HARDENING.md`
- `docs/`
- `contracts/`
- `templates/`
