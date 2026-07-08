import { FireBehaviorEngine } from './fire-behavior-engine.mjs';

const VALID_HORIZONS = new Set([30, 60, 180, 360, 720]);

export class PropagationSimulator {
  constructor({ engine = new FireBehaviorEngine() } = {}) {
    this.engine = engine;
  }

  run({ incident, weatherObservation, horizonMinutes }) {
    const horizon = VALID_HORIZONS.has(Number(horizonMinutes)) ? Number(horizonMinutes) : 60;
    const behavior = this.engine.estimate({ incident, weatherObservation });
    const origin = incident?.location || { latitude: 40.112, longitude: -8.246 };
    const baseRadiusMeters = incident?.perimeterGeoJson ? 80 : 150;
    const forwardMeters = baseRadiusMeters + behavior.estimatedRateOfSpreadMPerMin * horizon;
    const flankMeters = Math.max(baseRadiusMeters, forwardMeters * 0.42);
    const uncertaintyForwardMeters = forwardMeters * behavior.uncertaintyMultiplier;
    const uncertaintyFlankMeters = flankMeters * behavior.uncertaintyMultiplier;

    const predictedPerimeterGeoJson = ellipsePolygon({
      center: origin,
      bearingDeg: behavior.dominantSpreadDirectionDeg,
      forwardMeters,
      backwardMeters: Math.max(baseRadiusMeters, forwardMeters * 0.24),
      flankMeters
    });
    const uncertaintyGeoJson = ellipsePolygon({
      center: origin,
      bearingDeg: behavior.dominantSpreadDirectionDeg,
      forwardMeters: uncertaintyForwardMeters,
      backwardMeters: Math.max(baseRadiusMeters * 1.5, uncertaintyForwardMeters * 0.3),
      flankMeters: uncertaintyFlankMeters
    });
    const temporalFrontsGeoJson = temporalFronts({
      center: origin,
      bearingDeg: behavior.dominantSpreadDirectionDeg,
      rateMPerMin: behavior.estimatedRateOfSpreadMPerMin,
      horizonMinutes: horizon
    });
    const directionGeoJson = directionLine({
      center: origin,
      bearingDeg: behavior.dominantSpreadDirectionDeg,
      distanceMeters: forwardMeters
    });

    return {
      id: `sim-${Date.now()}`,
      incidentId: incident?.id || 'mock-fire-01',
      generatedAt: new Date().toISOString(),
      horizonMinutes: horizon,
      predictedPerimeterGeoJson,
      uncertaintyGeoJson,
      dominantSpreadDirection: behavior.dominantSpreadDirectionDeg,
      dominantSpreadDirectionDeg: behavior.dominantSpreadDirectionDeg,
      estimatedRateOfSpread: behavior.estimatedRateOfSpreadMPerMin,
      estimatedRateOfSpreadMPerMin: behavior.estimatedRateOfSpreadMPerMin,
      estimatedIntensity: behavior.estimatedIntensity,
      confidence: behavior.confidence,
      assumptions: behavior.assumptions,
      missingData: behavior.missingData,
      warnings: behavior.warnings,
      temporalFrontsGeoJson,
      directionGeoJson,
      inputs: {
        incident,
        weatherObservation,
        drivers: behavior.drivers
      }
    };
  }
}

function ellipsePolygon({ center, bearingDeg, forwardMeters, backwardMeters, flankMeters }) {
  const coordinates = [];
  const bearingRad = toRadians(bearingDeg);

  for (let step = 0; step <= 72; step += 1) {
    const angle = (step / 72) * Math.PI * 2;
    const forwardComponent = Math.cos(angle) >= 0
      ? Math.cos(angle) * forwardMeters
      : Math.cos(angle) * backwardMeters;
    const flankComponent = Math.sin(angle) * flankMeters;
    const eastMeters = forwardComponent * Math.sin(bearingRad) + flankComponent * Math.cos(bearingRad);
    const northMeters = forwardComponent * Math.cos(bearingRad) - flankComponent * Math.sin(bearingRad);
    const point = moveByMeters(center, eastMeters, northMeters);
    coordinates.push([point.longitude, point.latitude]);
  }

  return {
    type: 'Feature',
    properties: { kind: 'predicted-perimeter' },
    geometry: { type: 'Polygon', coordinates: [coordinates] }
  };
}

function temporalFronts({ center, bearingDeg, rateMPerMin, horizonMinutes }) {
  const marks = [0.25, 0.5, 0.75, 1];
  return {
    type: 'FeatureCollection',
    features: marks.map((fraction) => {
      const minutes = Math.round(horizonMinutes * fraction);
      const point = destination(center, bearingDeg, rateMPerMin * minutes);
      return {
        type: 'Feature',
        properties: { minutes },
        geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] }
      };
    })
  };
}

function directionLine({ center, bearingDeg, distanceMeters }) {
  const end = destination(center, bearingDeg, distanceMeters);
  return {
    type: 'Feature',
    properties: { kind: 'dominant-direction', bearingDeg },
    geometry: {
      type: 'LineString',
      coordinates: [
        [center.longitude, center.latitude],
        [end.longitude, end.latitude]
      ]
    }
  };
}

function destination(center, bearingDeg, distanceMeters) {
  const bearingRad = toRadians(bearingDeg);
  return moveByMeters(
    center,
    Math.sin(bearingRad) * distanceMeters,
    Math.cos(bearingRad) * distanceMeters
  );
}

function moveByMeters(center, eastMeters, northMeters) {
  const latitude = Number(center.latitude);
  const longitude = Number(center.longitude);
  const metersPerDegreeLatitude = 111320;
  const metersPerDegreeLongitude = Math.max(1, 111320 * Math.cos(toRadians(latitude)));

  return {
    latitude: latitude + northMeters / metersPerDegreeLatitude,
    longitude: longitude + eastMeters / metersPerDegreeLongitude
  };
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
