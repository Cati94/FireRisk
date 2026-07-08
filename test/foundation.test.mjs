import test from 'node:test';
import assert from 'node:assert/strict';
import { ICNFProvider } from '../src/providers/icnf-provider.mjs';
import { FIRMSProvider } from '../src/providers/firms-provider.mjs';
import { fetchJson } from '../src/providers/http.mjs';
import { FireBehaviorEngine } from '../src/simulation/fire-behavior-engine.mjs';
import { PropagationSimulator } from '../src/simulation/propagation-simulator.mjs';
import { DecisionSupportEngine } from '../src/decision/decision-support-engine.mjs';
import { MockAIModelAdapter } from '../src/ai/mock-ai-model-adapter.mjs';
import { validateGeoJson } from '../src/geojson/validate.mjs';
import { mockAircraft, mockHotspot, mockIncident, mockWeatherObservation } from './fixtures/mock-context.mjs';

test('ICNFProvider normalizes location-based mock occurrences', () => {
  const provider = new ICNFProvider({ mockData: [mockIncident] });
  const [normalized] = provider.normalize([mockIncident]);
  assert.equal(normalized.location.latitude, 40.112);
  assert.equal(normalized.location.longitude, -8.246);
  assert.equal(normalized.source, 'ICNF');
});

test('FIRMSProvider preserves decimal confidence and coordinates', () => {
  const provider = new FIRMSProvider({ mockData: [mockHotspot] });
  const [normalized] = provider.normalize([mockHotspot]);
  assert.equal(normalized.confidence, 0.73);
  assert.equal(normalized.location.latitude, 40.13);
});

test('provider fetchJson reports invalid JSON without throwing raw syntax errors', async () => {
  await assert.rejects(
    () => fetchJson({ providerId: 'test', url: 'data:text/plain,not-json', timeoutMs: 1000 }),
    (error) => error.code === 'INVALID_JSON' && error.providerId === 'test'
  );
});

test('FireBehaviorEngine lowers confidence when fuel and terrain are missing', () => {
  const result = new FireBehaviorEngine().estimate({
    incident: mockIncident,
    weatherObservation: mockWeatherObservation
  });
  assert.equal(result.dominantSpreadDirectionDeg, 80);
  assert.ok(result.estimatedRateOfSpreadMPerMin > 0);
  assert.ok(result.confidence < 0.85);
  assert.ok(result.missingData.includes('fuelModel'));
});

test('PropagationSimulator returns valid perimeter, uncertainty, direction, and fronts', () => {
  const simulation = new PropagationSimulator().run({
    incident: mockIncident,
    weatherObservation: mockWeatherObservation,
    horizonMinutes: 180
  });
  assert.equal(simulation.horizonMinutes, 180);
  assert.equal(validateGeoJson(simulation.predictedPerimeterGeoJson).valid, true);
  assert.equal(validateGeoJson(simulation.uncertaintyGeoJson).valid, true);
  assert.equal(validateGeoJson(simulation.directionGeoJson).valid, true);
  assert.equal(validateGeoJson(simulation.temporalFrontsGeoJson).valid, true);
});

test('DecisionSupportEngine produces advisory recommendations with missing data', () => {
  const simulation = new PropagationSimulator().run({
    incident: mockIncident,
    weatherObservation: mockWeatherObservation,
    horizonMinutes: 60
  });
  const recommendations = new DecisionSupportEngine().generate({
    incident: mockIncident,
    hotspots: [mockHotspot],
    aircraft: [mockAircraft],
    weatherObservation: mockWeatherObservation,
    weatherBundle: { lightning: [] },
    simulation
  });
  assert.ok(recommendations.length >= 1);
  assert.ok(recommendations.every((item) => Number.isFinite(item.confidence)));
  assert.ok(recommendations.every((item) => Array.isArray(item.missingData)));
  const text = recommendations.map((item) => `${item.description} ${item.rationale}`).join(' ');
  assert.doesNotMatch(text, /Enviar|Evacuar|Atacar|Garantido/);
});

test('MockAIModelAdapter returns assistive uncertainty and recommendations', async () => {
  const simulation = new PropagationSimulator().run({
    incident: mockIncident,
    weatherObservation: mockWeatherObservation,
    horizonMinutes: 60
  });
  const output = await new MockAIModelAdapter().analyze({
    incident: mockIncident,
    hotspots: [mockHotspot],
    weatherObservations: [mockWeatherObservation],
    weatherForecasts: [],
    lightning: [],
    aircraft: [mockAircraft],
    propagationPredictions: [simulation],
    suppressionActions: [],
    humanObservations: [],
    historicalContext: null,
    generatedAt: '2026-07-03T12:00:00.000Z'
  });
  assert.equal(output.mode, 'mock');
  assert.ok(output.uncertainty.length > 0);
  assert.ok(output.recommendations.length > 0);
  assert.doesNotMatch(output.recommendations[0].description, /Enviar|Evacuar|Atacar|Garantido/);
});
