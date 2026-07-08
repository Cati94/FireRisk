export class FireBehaviorEngine {
  estimate({ incident, weatherObservation, fuelModel, terrain }) {
    const assumptions = [
      'Simplified heuristic model for planning context only',
      'Wind direction is treated as the dominant spread direction',
      'No operational order is inferred from this simulation'
    ];
    const missingData = [];
    const warnings = ['Validate with field observations before using in operational planning'];

    if (!incident?.location) {
      missingData.push('incidentLocation');
    }
    if (!weatherObservation) {
      missingData.push('weatherObservation');
      assumptions.push('Weather defaults are used because no observation is available');
    }
    if (!fuelModel) {
      missingData.push('fuelModel');
      assumptions.push('Unknown fuel model reduces confidence');
    }
    if (!terrain) {
      missingData.push('terrainSlope');
      assumptions.push('Unknown slope/aspect reduces confidence');
    }

    const temperatureC = numberOrDefault(weatherObservation?.temperatureC, 30);
    const humidityPct = numberOrDefault(weatherObservation?.relativeHumidityPct, 35);
    const windSpeedKph = numberOrDefault(weatherObservation?.windSpeedKph, 12);
    const windGustKph = numberOrDefault(weatherObservation?.windGustKph, windSpeedKph);
    const dominantSpreadDirectionDeg = normalizeDegrees(numberOrDefault(weatherObservation?.windDirectionDeg, 90));

    const humidityFactor = humidityPct < 25 ? 1.45 : humidityPct < 40 ? 1.2 : 0.9;
    const temperatureFactor = temperatureC > 35 ? 1.25 : temperatureC > 30 ? 1.12 : 1;
    const windFactor = 1 + Math.min(windSpeedKph, 60) / 40;
    const fuelFactor = fuelModel?.continuity === 'high' ? 1.2 : fuelModel ? 1 : 0.85;
    const slopeFactor = Number.isFinite(terrain?.slopeDeg) ? 1 + Math.max(terrain.slopeDeg, 0) / 60 : 0.9;

    const estimatedRateOfSpreadMPerMin = round(4 * humidityFactor * temperatureFactor * windFactor * fuelFactor * slopeFactor, 2);
    const gustSpread = Math.max(0, windGustKph - windSpeedKph);
    const uncertaintyMultiplier = round(1.25 + Math.min(gustSpread, 35) / 35, 2);
    const confidence = round(Math.max(0.15, 0.85 - missingData.length * 0.14 - (weatherObservation?.freshness === 'stale' ? 0.12 : 0)), 2);

    return {
      dominantSpreadDirectionDeg,
      estimatedRateOfSpreadMPerMin,
      uncertaintyMultiplier,
      estimatedIntensity: estimateIntensity({ estimatedRateOfSpreadMPerMin, humidityPct, temperatureC, windSpeedKph }),
      confidence,
      assumptions,
      missingData,
      warnings,
      drivers: {
        temperatureC,
        humidityPct,
        windSpeedKph,
        windGustKph,
        humidityFactor,
        temperatureFactor,
        windFactor,
        fuelFactor,
        slopeFactor
      }
    };
  }
}

function estimateIntensity({ estimatedRateOfSpreadMPerMin, humidityPct, temperatureC, windSpeedKph }) {
  const score =
    estimatedRateOfSpreadMPerMin / 8 +
    (humidityPct < 25 ? 1 : 0) +
    (temperatureC > 35 ? 0.7 : 0) +
    (windSpeedKph > 25 ? 0.7 : 0);

  if (score >= 4) return 'extreme';
  if (score >= 2.8) return 'high';
  if (score >= 1.8) return 'moderate';
  return 'low';
}

function numberOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
