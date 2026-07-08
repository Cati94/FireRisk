import fs from 'node:fs';
import path from 'node:path';

export function loadEnv(filePath = path.resolve(process.cwd(), '.env')) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function getConfig() {
  const timeoutMs = Number(process.env.FIRERISK_PROVIDER_TIMEOUT_MS || 8000);

  return {
    port: Number(process.env.PORT || 5173),
    enableMocks: process.env.FIRERISK_ENABLE_MOCKS !== 'false',
    forceDegraded: process.env.FIRERISK_FORCE_DEGRADED === 'true',
    providerTimeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 8000,
    mapTilerKey: process.env.MAPTILER_KEY || '',
    mapTilerStyleUrl: process.env.MAPTILER_STYLE_URL || '',
    icnfOccurrencesUrl: process.env.ICNF_OCCURRENCES_URL || '',
    firmsMapKey: process.env.FIRMS_MAP_KEY || '',
    firmsBaseUrl: process.env.FIRMS_BASE_URL || 'https://firms.modaps.eosdis.nasa.gov/api',
    weatherUndergroundApiKey: process.env.WEATHER_UNDERGROUND_API_KEY || '',
    weatherUndergroundStationIds: (process.env.WEATHER_UNDERGROUND_STATION_IDS || '')
      .split(',')
      .map((stationId) => stationId.trim())
      .filter(Boolean),
    weatherUndergroundBaseUrl: process.env.WEATHER_UNDERGROUND_BASE_URL || 'https://api.weather.com',
    xweatherClientId: process.env.XWEATHER_CLIENT_ID || '',
    xweatherClientSecret: process.env.XWEATHER_CLIENT_SECRET || '',
    xweatherBaseUrl: process.env.XWEATHER_BASE_URL || 'https://data.api.xweather.com',
    aiMode: process.env.FIRERISK_AI_MODE || 'mock',
    aiLocalEndpoint: process.env.FIRERISK_AI_LOCAL_ENDPOINT || '',
    aiRemoteEndpoint: process.env.FIRERISK_AI_REMOTE_ENDPOINT || '',
    aiApiKey: process.env.FIRERISK_AI_API_KEY || '',
    logLevel: process.env.FIRERISK_LOG_LEVEL || 'info'
  };
}
