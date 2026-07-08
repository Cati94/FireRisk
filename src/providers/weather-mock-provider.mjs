import { MockProvider } from './mock-provider.mjs';

export class WeatherMockProvider extends MockProvider {
  constructor() {
    super({
      id: 'weather-mock',
      name: 'Weather mock',
      data: [
        {
          id: 'weather-lousa',
          stationId: 'MOCK-LOUSA',
          stationName: 'Lousa mock station',
          location: { latitude: 40.1167, longitude: -8.25 },
          observedAt: new Date().toISOString(),
          freshness: 'fresh',
          temperatureC: 31,
          relativeHumidityPct: 28,
          windDirectionDeg: 70,
          windSpeedKph: 18,
          windGustKph: 32,
          pressureHpa: 1012,
          precipitationMm: 0,
          source: 'MOCK'
        },
        {
          id: 'weather-serta',
          stationId: 'MOCK-SERTA',
          stationName: 'Serta mock station',
          location: { latitude: 39.808, longitude: -8.098 },
          observedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
          freshness: 'stale',
          temperatureC: 34,
          relativeHumidityPct: 22,
          windDirectionDeg: 95,
          windSpeedKph: 24,
          windGustKph: 41,
          pressureHpa: 1009,
          precipitationMm: 0,
          source: 'MOCK',
          confidence: 0.6
        }
      ]
    });
  }

  normalize(raw) {
    return {
      observations: raw,
      forecasts: [
        {
          id: 'mock-hourly-01',
          location: { latitude: 40.1167, longitude: -8.25 },
          issuedAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          temperatureC: 33,
          relativeHumidityPct: 25,
          windDirectionDeg: 80,
          windSpeedKph: 22,
          windGustKph: 38,
          precipitationProbabilityPct: 5,
          precipitationMm: 0,
          source: 'MOCK',
          confidence: 0.7
        }
      ],
      lightning: [
        {
          id: 'mock-lightning-01',
          location: { latitude: 40.22, longitude: -8.03 },
          detectedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          polarity: -1,
          amplitudeKa: 18,
          source: 'MOCK',
          confidence: 0.7
        }
      ],
      alerts: [
        {
          id: 'mock-alert-01',
          title: 'High fire-weather risk',
          type: 'fire-weather',
          severity: 'moderate',
          issuedAt: new Date().toISOString(),
          source: 'MOCK'
        }
      ],
      windFields: []
    };
  }
}
