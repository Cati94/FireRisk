import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig, loadEnv } from './config.mjs';
import { createProviders, readProvider, readWeatherBundle } from './providers/index.mjs';
import { PropagationSimulator } from './simulation/propagation-simulator.mjs';
import { SimulationSnapshotStore } from './simulation/snapshot-store.mjs';
import { DecisionSupportEngine } from './decision/decision-support-engine.mjs';
import { DecisionStore } from './decision/decision-store.mjs';
import { createAIModelAdapter } from './ai/ai-model-factory.mjs';
import { AIAnalysisStore } from './ai/ai-analysis-store.mjs';
import { PostFireAssessmentEngine } from './postfire/post-fire-assessment-engine.mjs';
import { PostFireStore } from './postfire/postfire-store.mjs';
import { PreventionEngine } from './prevention/prevention-engine.mjs';
import { PreventionStore } from './prevention/prevention-store.mjs';
import { createLogger } from './logger.mjs';
import { summarizeSystemHealth, validateGeoJsonExports } from './system-health.mjs';

loadEnv();

const config = getConfig();
const providers = createProviders(config);
const simulator = new PropagationSimulator();
const simulationStore = new SimulationSnapshotStore();
const decisionEngine = new DecisionSupportEngine();
const decisionStore = new DecisionStore();
const aiModel = createAIModelAdapter(config);
const aiAnalysisStore = new AIAnalysisStore();
const postFireEngine = new PostFireAssessmentEngine();
const postFireStore = new PostFireStore();
const preventionEngine = new PreventionEngine();
const preventionStore = new PreventionStore();
const logger = createLogger({ level: config.logLevel });
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(rootDir, 'public');

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  logger.info('request.received', { method: request.method, path: url.pathname });

  try {
    if (url.pathname === '/api/fires') {
      return json(response, await readProvider(providers.fires, { timeoutMs: config.providerTimeoutMs }));
    }
    if (url.pathname === '/api/hotspots') {
      return json(response, await readProvider(providers.hotspots, { timeoutMs: config.providerTimeoutMs }));
    }
    if (url.pathname === '/api/aircraft') {
      return json(response, await readProvider(providers.aircraft, { timeoutMs: config.providerTimeoutMs }));
    }
    if (url.pathname === '/api/weather') {
      const latitudeParam = url.searchParams.get('latitude');
      const longitudeParam = url.searchParams.get('longitude');
      const latitude = Number(latitudeParam);
      const longitude = Number(longitudeParam);
      const incidentLocation = latitudeParam !== null
        && longitudeParam !== null
        && Number.isFinite(latitude)
        && Number.isFinite(longitude)
        ? { latitude, longitude }
        : undefined;

      return json(response, await readWeatherBundle(providers, config, {
        timeoutMs: config.providerTimeoutMs,
        incidentLocation
      }));
    }
    if (url.pathname === '/api/providers') {
      return json(response, {
        fetchedAt: new Date().toISOString(),
        providers: [
          ...Object.values(providers).map((provider) => provider.getStatus()),
          aiModel.getStatus()
        ]
      });
    }
    if (url.pathname === '/api/health') {
      return json(response, summarizeSystemHealth({
        providers: Object.values(providers),
        aiStatus: aiModel.getStatus(),
        config,
        snapshots: snapshotCounts()
      }));
    }
    if (url.pathname === '/api/simulations' && request.method === 'GET') {
      return json(response, {
        fetchedAt: new Date().toISOString(),
        snapshots: simulationStore.list()
      });
    }
    if (url.pathname === '/api/simulations/run' && (request.method === 'GET' || request.method === 'POST')) {
      const body = request.method === 'POST' ? await readJsonBody(request) : {};
      const horizonMinutes = Number(body.horizonMinutes || url.searchParams.get('horizonMinutes') || 60);
      const incidentId = body.incidentId || url.searchParams.get('incidentId');
      const firesResult = await readProvider(providers.fires, { timeoutMs: config.providerTimeoutMs });
      const incident = firesResult.data.find((item) => item.id === incidentId) || firesResult.data[0];
      const weatherResult = await readWeatherBundle(providers, config, {
        timeoutMs: config.providerTimeoutMs,
        incidentLocation: incident?.location
      });
      const weatherObservation = weatherResult.nearestObservation?.observation || weatherResult.observations[0];
      const snapshot = simulator.run({ incident, weatherObservation, horizonMinutes });
      return json(response, simulationStore.add({
        ...snapshot,
        sourceStatuses: {
          fires: firesResult.status,
          weather: weatherResult.status
        }
      }));
    }
    if (url.pathname === '/api/decisions' && request.method === 'GET') {
      return json(response, {
        fetchedAt: new Date().toISOString(),
        snapshots: decisionStore.list()
      });
    }
    if (url.pathname === '/api/decisions/run' && (request.method === 'GET' || request.method === 'POST')) {
      const body = request.method === 'POST' ? await readJsonBody(request) : {};
      const horizonMinutes = Number(body.horizonMinutes || url.searchParams.get('horizonMinutes') || 60);
      const incidentId = body.incidentId || url.searchParams.get('incidentId');
      const context = await buildDecisionContext({ incidentId, horizonMinutes });
      const recommendations = decisionEngine.generate(context);
      const aiResult = await runAIAnalysis(context);
      const aiRecommendations = aiResult.output?.recommendations || [];
      return json(response, decisionStore.add({
        id: `decision-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        incidentId: context.incident?.id || 'unknown',
        horizonMinutes: context.simulation?.horizonMinutes,
        recommendations: [...recommendations, ...aiRecommendations],
        heuristicRecommendations: recommendations,
        aiAnalysis: aiResult.output,
        aiStatus: aiResult.status,
        aiFallbackActive: aiResult.fallbackActive,
        inputs: {
          incident: context.incident,
          simulationId: context.simulation?.id,
          weatherProviderHealth: context.weatherBundle?.status?.health,
          hotspotCount: context.hotspots.length,
          aircraftCount: context.aircraft.length
        },
        advisoryNotice: 'Analytical support only. These recommendations are not operational orders.'
      }));
    }
    if (url.pathname === '/api/ai' && request.method === 'GET') {
      return json(response, {
        fetchedAt: new Date().toISOString(),
        snapshots: aiAnalysisStore.list(),
        status: aiModel.getStatus()
      });
    }
    if (url.pathname === '/api/ai/analyze' && (request.method === 'GET' || request.method === 'POST')) {
      const body = request.method === 'POST' ? await readJsonBody(request) : {};
      const horizonMinutes = Number(body.horizonMinutes || url.searchParams.get('horizonMinutes') || 60);
      const incidentId = body.incidentId || url.searchParams.get('incidentId');
      const context = await buildDecisionContext({ incidentId, horizonMinutes });
      return json(response, await runAIAnalysis(context));
    }
    if (url.pathname === '/api/postfire' && request.method === 'GET') {
      return json(response, {
        fetchedAt: new Date().toISOString(),
        snapshots: postFireStore.list()
      });
    }
    if (url.pathname === '/api/postfire/run' && (request.method === 'GET' || request.method === 'POST')) {
      const body = request.method === 'POST' ? await readJsonBody(request) : {};
      const horizonMinutes = Number(body.horizonMinutes || url.searchParams.get('horizonMinutes') || 60);
      const incidentId = body.incidentId || url.searchParams.get('incidentId');
      const context = await buildDecisionContext({ incidentId, horizonMinutes });
      const snapshot = {
        id: `postfire-snapshot-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        ...postFireEngine.assess({
          incident: context.incident,
          simulation: context.simulation
        })
      };
      return json(response, postFireStore.add(snapshot));
    }
    if (url.pathname === '/api/prevention' && request.method === 'GET') {
      return json(response, {
        fetchedAt: new Date().toISOString(),
        snapshots: preventionStore.list()
      });
    }
    if (url.pathname === '/api/prevention/run' && (request.method === 'GET' || request.method === 'POST')) {
      const [firesResult, hotspotsResult] = await Promise.all([
        readProvider(providers.fires, { timeoutMs: config.providerTimeoutMs }),
        readProvider(providers.hotspots, { timeoutMs: config.providerTimeoutMs })
      ]);
      const weatherBundle = await readWeatherBundle(providers, config, { timeoutMs: config.providerTimeoutMs });
      const snapshot = preventionEngine.analyze({
        incidents: firesResult.data,
        hotspots: hotspotsResult.data,
        weatherBundle
      });
      return json(response, preventionStore.add(snapshot));
    }
    if (url.pathname === '/api/exports/geojson' && request.method === 'GET') {
      const context = await buildDecisionContext({ horizonMinutes: 60 });
      const postFire = postFireStore.list()[0] || postFireEngine.assess({
        incident: context.incident,
        simulation: context.simulation
      });
      const prevention = preventionStore.list()[0] || preventionEngine.analyze({
        incidents: [context.incident].filter(Boolean),
        hotspots: context.hotspots,
        weatherBundle: context.weatherBundle
      });
      const exports = {
        predictedPerimeter: context.simulation.predictedPerimeterGeoJson,
        uncertainty: context.simulation.uncertaintyGeoJson,
        direction: context.simulation.directionGeoJson,
        temporalFronts: context.simulation.temporalFrontsGeoJson,
        burnedPerimeter: postFire.assessment.perimeterGeoJson,
        erosionZones: postFire.erosionZonesGeoJson,
        preventionCriticalAreas: prevention.criticalAreasGeoJson
      };

      return json(response, {
        fetchedAt: new Date().toISOString(),
        exports,
        validation: validateGeoJsonExports(exports)
      });
    }
    if (url.pathname === '/api/replay/mock' && request.method === 'GET') {
      const context = await buildDecisionContext({ horizonMinutes: 60 });
      return json(response, {
        id: `replay-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        incidentId: context.incident?.id || 'mock-fire-01',
        frames: [
          { minute: 0, label: 'Initial mock incident', incident: context.incident },
          { minute: 30, label: 'First simulated front', geoJson: context.simulation.temporalFrontsGeoJson.features[0] },
          { minute: 60, label: 'Current simulation envelope', geoJson: context.simulation.predictedPerimeterGeoJson }
        ],
        limitations: [
          'Replay is mock-only and prepared for future persisted incident history',
          'Frames are derived from current simulation outputs, not observed historical progression'
        ]
      });
    }
    if (url.pathname === '/api/config') {
      return json(response, {
        mapTilerStyleUrl: config.mapTilerStyleUrl,
        hasMapTilerKey: Boolean(config.mapTilerKey),
        mockMode: config.enableMocks
      });
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    logger.error('request.failed', {
      method: request.method,
      path: url.pathname,
      error: error.message || 'Unexpected server error'
    });
    return json(response, { error: error.message || 'Unexpected server error' }, 500);
  }
});

server.listen(config.port, () => {
  logger.info('server.started', { url: `http://localhost:${config.port}` });
});

function json(response, body, status = 200) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(body, null, 2));
}

function serveStatic(pathname, response) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(publicDir, safePath));
  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    return response.end('Forbidden');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    return response.end('Not found');
  }

  response.writeHead(200, {
    'content-type': contentType(filePath),
    'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    pragma: 'no-cache',
    expires: '0'
  });
  fs.createReadStream(filePath).pipe(response);
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function buildDecisionContext({ incidentId, horizonMinutes }) {
  const [firesResult, hotspotsResult, aircraftResult] = await Promise.all([
    readProvider(providers.fires, { timeoutMs: config.providerTimeoutMs }),
    readProvider(providers.hotspots, { timeoutMs: config.providerTimeoutMs }),
    readProvider(providers.aircraft, { timeoutMs: config.providerTimeoutMs })
  ]);
  const incident = firesResult.data.find((item) => item.id === incidentId) || firesResult.data[0];
  const weatherBundle = await readWeatherBundle(providers, config, {
    timeoutMs: config.providerTimeoutMs,
    incidentLocation: incident?.location
  });
  const weatherObservation = weatherBundle.nearestObservation?.observation || weatherBundle.observations[0];
  const latestSimulation = simulationStore.latest();
  const simulation = latestSimulation?.incidentId === incident?.id && latestSimulation?.horizonMinutes === horizonMinutes
    ? latestSimulation
    : simulationStore.add(simulator.run({ incident, weatherObservation, horizonMinutes }));

  return {
    incident,
    hotspots: hotspotsResult.data,
    aircraft: aircraftResult.data,
    weatherBundle,
    weatherObservation,
    simulation
  };
}

async function runAIAnalysis(context) {
  const input = buildAIModelInput(context);

  try {
    const output = await aiModel.analyze(input);
    aiAnalysisStore.add(output);
    return {
      output,
      status: aiModel.getStatus(),
      fallbackActive: false
    };
  } catch (error) {
    const status = aiModel.handleFailure(error);
    return {
      output: null,
      status,
      fallbackActive: true,
      warning: 'AI analysis failed; heuristic DecisionSupportEngine output remains available.'
    };
  }
}

function buildAIModelInput(context) {
  return {
    incident: context.incident,
    occurrences: context.incident ? [context.incident] : [],
    hotspots: context.hotspots,
    weatherObservations: context.weatherBundle?.observations || [],
    weatherForecasts: context.weatherBundle?.forecasts || [],
    lightning: context.weatherBundle?.lightning || [],
    aircraft: context.aircraft,
    propagationPredictions: context.simulation ? [context.simulation] : [],
    suppressionActions: [],
    humanObservations: [],
    historicalContext: null,
    generatedAt: new Date().toISOString()
  };
}

function snapshotCounts() {
  return {
    simulations: simulationStore.list().length,
    decisions: decisionStore.list().length,
    aiAnalyses: aiAnalysisStore.list().length,
    postFire: postFireStore.list().length,
    prevention: preventionStore.list().length
  };
}
