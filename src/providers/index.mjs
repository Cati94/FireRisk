import { AircraftMockProvider } from './aircraft-mock-provider.mjs';
import { FIRMSProvider } from './firms-provider.mjs';
import { ICNFProvider } from './icnf-provider.mjs';
import { WeatherMockProvider } from './weather-mock-provider.mjs';
import { WeatherUndergroundProvider } from './weather-underground-provider.mjs';
import { XWeatherProvider } from './xweather-provider.mjs';
import { nearestObservation } from './weather-utils.mjs';

const mockFires = [
  {
    id: 'mock-fire-01',
    name: 'Ocorrencia mock Lousa',
    location: { latitude: 40.112, longitude: -8.246 },
    municipality: 'Lousa',
    district: 'Coimbra',
    status: 'active',
    startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'MOCK'
  }
];

const mockHotspots = [
  {
    id: 'mock-hotspot-01',
    location: { latitude: 40.13, longitude: -8.22 },
    detectedAt: new Date().toISOString(),
    source: 'NASA_FIRMS',
    satellite: 'VIIRS_SNPP_NRT',
    confidence: 0.73,
    brightness: 332.5,
    frp: 8.2
  }
];

export function createProviders(config) {
  return {
    fires: new ICNFProvider({
      url: config.enableMocks ? '' : config.icnfOccurrencesUrl,
      mockData: mockFires
    }),
    hotspots: new FIRMSProvider({
      baseUrl: config.firmsBaseUrl,
      mapKey: config.enableMocks ? '' : config.firmsMapKey,
      mockData: mockHotspots
    }),
    aircraft: new AircraftMockProvider(),
    weatherMock: new WeatherMockProvider(),
    weatherUnderground: new WeatherUndergroundProvider({
      apiKey: config.weatherUndergroundApiKey,
      stationIds: config.weatherUndergroundStationIds,
      baseUrl: config.weatherUndergroundBaseUrl
    }),
    xweather: new XWeatherProvider({
      clientId: config.xweatherClientId,
      clientSecret: config.xweatherClientSecret,
      baseUrl: config.xweatherBaseUrl
    })
  };
}

export async function readProvider(provider, options) {
  try {
    const raw = await provider.fetchRaw(options);
    const data = provider.normalize(raw);
    provider.setStatus({
      health: 'healthy',
      lastUpdated: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      message: `Loaded ${Array.isArray(data) ? data.length : 1} records`
    });

    return {
      providerId: provider.id,
      fetchedAt: new Date().toISOString(),
      data,
      status: provider.getStatus(),
      warnings: [],
      raw
    };
  } catch (error) {
    const status = provider.handleFailure(error);
    return {
      providerId: provider.id,
      fetchedAt: new Date().toISOString(),
      data: [],
      status,
      warnings: [status.message || 'Provider failed']
    };
  }
}

export async function readWeatherBundle(providers, config, options) {
  const weatherProviders = config.enableMocks
    ? [providers.weatherMock]
    : [providers.weatherUnderground, providers.xweather, providers.weatherMock];

  const results = await Promise.all(weatherProviders.map((provider) => readProvider(provider, options)));
  const normalized = results.map((result) => result.data);
  const observations = normalized.flatMap((data) => Array.isArray(data) ? data : data.observations || []);
  const forecasts = normalized.flatMap((data) => data.forecasts || []);
  const lightning = normalized.flatMap((data) => data.lightning || []);
  const alerts = normalized.flatMap((data) => data.alerts || []);
  const windFields = normalized.flatMap((data) => data.windFields || []);
  const nearest = nearestObservation(observations, options?.incidentLocation);

  return {
    providerId: 'weather',
    fetchedAt: new Date().toISOString(),
    data: observations,
    observations,
    forecasts,
    lightning,
    alerts,
    windFields,
    nearestObservation: nearest,
    status: summarizeStatuses(results.map((result) => result.status)),
    providerStatuses: results.map((result) => result.status),
    warnings: results.flatMap((result) => result.warnings)
  };
}

function summarizeStatuses(statuses) {
  const health = statuses.some((status) => status.health === 'healthy')
    ? 'healthy'
    : statuses.some((status) => status.health === 'degraded')
      ? 'degraded'
      : 'offline';

  return {
    id: 'weather',
    name: 'Weather',
    health,
    enabled: statuses.some((status) => status.enabled),
    lastUpdated: new Date().toISOString(),
    message: `${statuses.filter((status) => status.health === 'healthy').length}/${statuses.length} weather providers healthy`
  };
}
