export const mockIncident = {
  id: 'mock-fire-01',
  name: 'Mock incident',
  location: { latitude: 40.112, longitude: -8.246 },
  status: 'active',
  updatedAt: '2026-07-03T12:00:00.000Z',
  source: 'MOCK'
};

export const mockWeatherObservation = {
  id: 'weather-lousa',
  stationId: 'MOCK-LOUSA',
  stationName: 'Lousa mock station',
  location: { latitude: 40.1167, longitude: -8.25 },
  observedAt: '2026-07-03T12:00:00.000Z',
  freshness: 'fresh',
  temperatureC: 34,
  relativeHumidityPct: 22,
  windDirectionDeg: 80,
  windSpeedKph: 24,
  windGustKph: 41,
  precipitationMm: 0,
  source: 'MOCK'
};

export const mockHotspot = {
  id: 'hotspot-01',
  location: { latitude: 40.13, longitude: -8.22 },
  detectedAt: '2026-07-03T12:00:00.000Z',
  source: 'NASA_FIRMS',
  confidence: 0.73
};

export const mockAircraft = {
  id: 'air-01',
  callsign: 'FIRE01',
  type: 'helicopter',
  location: { latitude: 40.109, longitude: -8.241 },
  updatedAt: '2026-07-03T12:00:00.000Z',
  source: 'MOCK'
};
