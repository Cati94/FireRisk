import { BaseProvider } from './base-provider.mjs';
import { fetchJson } from './http.mjs';
import { ProviderError } from './provider-error.mjs';
import { confidenceForFreshness, freshnessFor } from './weather-utils.mjs';

export class WeatherUndergroundProvider extends BaseProvider {
  constructor({ apiKey, stationIds, baseUrl }) {
    super({
      id: 'weather-underground',
      name: 'Weather Underground PWS',
      enabled: Boolean(apiKey && stationIds?.length)
    });
    this.apiKey = apiKey;
    this.stationIds = stationIds || [];
    this.baseUrl = baseUrl || 'https://api.weather.com';
  }

  async fetchRaw(options = {}) {
    if (!this.apiKey) {
      throw new ProviderError({
        providerId: this.id,
        code: 'MISSING_CREDENTIALS',
        message: 'WEATHER_UNDERGROUND_API_KEY is not configured'
      });
    }

    if (!this.stationIds.length) {
      throw new ProviderError({
        providerId: this.id,
        code: 'MISSING_CREDENTIALS',
        message: 'WEATHER_UNDERGROUND_STATION_IDS is not configured'
      });
    }

    const observations = await Promise.all(
      this.stationIds.map((stationId) => {
        const url = new URL('/v2/pws/observations/current', this.baseUrl);
        url.searchParams.set('stationId', stationId);
        url.searchParams.set('format', 'json');
        url.searchParams.set('units', 'm');
        url.searchParams.set('apiKey', this.apiKey);

        return fetchJson({
          providerId: this.id,
          url: url.toString(),
          timeoutMs: options.timeoutMs,
          signal: options.signal
        });
      })
    );

    return observations;
  }

  normalize(raw) {
    const rows = raw.flatMap((response) => response?.observations || []);

    return rows.map((item, index) => {
      const metric = item.metric || {};
      const observedAt = item.obsTimeUtc
        ? new Date(item.obsTimeUtc).toISOString()
        : new Date().toISOString();
      const freshness = freshnessFor(observedAt);

      return {
        id: `wu-${item.stationID || index}`,
        stationId: item.stationID,
        stationName: item.neighborhood || item.stationID,
        location: {
          latitude: Number(item.lat),
          longitude: Number(item.lon)
        },
        observedAt,
        freshness,
        temperatureC: numberOrUndefined(metric.temp),
        relativeHumidityPct: numberOrUndefined(item.humidity),
        windDirectionDeg: numberOrUndefined(item.winddir),
        windSpeedKph: numberOrUndefined(metric.windSpeed),
        windGustKph: numberOrUndefined(metric.windGust),
        pressureHpa: numberOrUndefined(metric.pressure),
        precipitationMm: numberOrUndefined(metric.precipTotal),
        source: 'WEATHER_UNDERGROUND',
        confidence: confidenceForFreshness(freshness),
        raw: item
      };
    });
  }
}

function numberOrUndefined(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
