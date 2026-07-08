import { BaseProvider } from './base-provider.mjs';
import { fetchJson } from './http.mjs';
import { ProviderError } from './provider-error.mjs';
import { confidenceForFreshness, freshnessFor } from './weather-utils.mjs';

export class XWeatherProvider extends BaseProvider {
  constructor({ clientId, clientSecret, baseUrl }) {
    super({
      id: 'xweather',
      name: 'Vaisala Xweather',
      enabled: Boolean(clientId && clientSecret)
    });
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = baseUrl || 'https://data.api.xweather.com';
  }

  async fetchRaw(options = {}) {
    if (!this.clientId || !this.clientSecret) {
      throw new ProviderError({
        providerId: this.id,
        code: 'MISSING_CREDENTIALS',
        message: 'XWEATHER_CLIENT_ID or XWEATHER_CLIENT_SECRET is not configured'
      });
    }

    const place = options.place || '39.5,-8.0';
    const endpoints = {
      current: `/conditions/${place}`,
      hourly: `/forecasts/hourly/${place}`,
      daily: `/forecasts/${place}`,
      lightning: `/lightning/within?p=${place}&radius=150km`,
      alerts: `/alerts/${place}`
    };

    const entries = await Promise.allSettled(
      Object.entries(endpoints).map(async ([key, endpoint]) => {
        const url = new URL(endpoint, this.baseUrl);
        url.searchParams.set('client_id', this.clientId);
        url.searchParams.set('client_secret', this.clientSecret);
        const value = await fetchJson({
          providerId: this.id,
          url: url.toString(),
          timeoutMs: options.timeoutMs,
          signal: options.signal
        });
        return [key, value];
      })
    );

    return Object.fromEntries(
      entries
        .filter((entry) => entry.status === 'fulfilled')
        .map((entry) => entry.value)
    );
  }

  normalize(raw) {
    return {
      observations: normalizeCurrent(raw.current),
      forecasts: [
        ...normalizeForecast(raw.hourly, 'hourly'),
        ...normalizeForecast(raw.daily, 'daily')
      ],
      lightning: normalizeLightning(raw.lightning),
      alerts: normalizeAlerts(raw.alerts),
      windFields: []
    };
  }
}

function normalizeCurrent(raw) {
  const periods = firstResponse(raw)?.periods || [];
  return periods.slice(0, 1).map((period, index) => {
    const observedAt = toIso(period.timestamp || period.dateTimeISO);
    const freshness = freshnessFor(observedAt);

    return {
      id: `xweather-current-${index}`,
      stationName: firstResponse(raw)?.place?.name,
      location: coordsFromResponse(firstResponse(raw)),
      observedAt,
      freshness,
      temperatureC: numberOrUndefined(period.tempC),
      relativeHumidityPct: numberOrUndefined(period.humidity),
      windDirectionDeg: numberOrUndefined(period.windDirDEG),
      windSpeedKph: numberOrUndefined(period.windSpeedKPH),
      windGustKph: numberOrUndefined(period.windGustKPH),
      pressureHpa: numberOrUndefined(period.pressureMB),
      precipitationMm: numberOrUndefined(period.precipMM),
      source: 'XWEATHER',
      confidence: confidenceForFreshness(freshness),
      raw: period
    };
  });
}

function normalizeForecast(raw, type) {
  const response = firstResponse(raw);
  const periods = response?.periods || [];
  return periods.map((period, index) => ({
    id: `xweather-${type}-${index}`,
    location: coordsFromResponse(response),
    issuedAt: toIso(response?.profile?.tz || Date.now()),
    validFrom: toIso(period.timestamp || period.dateTimeISO),
    validTo: toIso((Number(period.timestamp) + 3600) * 1000 || period.dateTimeISO),
    temperatureC: numberOrUndefined(period.avgTempC ?? period.tempC ?? period.maxTempC),
    relativeHumidityPct: numberOrUndefined(period.humidity),
    windDirectionDeg: numberOrUndefined(period.windDirDEG),
    windSpeedKph: numberOrUndefined(period.windSpeedKPH),
    windGustKph: numberOrUndefined(period.windGustKPH),
    precipitationProbabilityPct: numberOrUndefined(period.pop),
    precipitationMm: numberOrUndefined(period.precipMM),
    source: 'XWEATHER',
    confidence: 0.75,
    raw: period
  }));
}

function normalizeLightning(raw) {
  const responses = Array.isArray(raw?.response) ? raw.response : [];
  return responses.map((item, index) => ({
    id: `xweather-lightning-${item.id || index}`,
    location: {
      latitude: Number(item.loc?.lat ?? item.lat),
      longitude: Number(item.loc?.long ?? item.lon)
    },
    detectedAt: toIso(item.timestamp || item.dateTimeISO),
    polarity: numberOrUndefined(item.pulse?.polarity),
    amplitudeKa: numberOrUndefined(item.pulse?.peakamp),
    source: 'XWEATHER',
    confidence: 0.8,
    raw: item
  }));
}

function normalizeAlerts(raw) {
  const responses = Array.isArray(raw?.response) ? raw.response : [];
  return responses.map((item, index) => ({
    id: `xweather-alert-${item.id || index}`,
    title: item.details?.name || item.name || 'Weather alert',
    type: item.details?.type || item.type || 'weather',
    severity: item.details?.severity || item.severity || 'unknown',
    issuedAt: toIso(item.timestamps?.issued || item.timestamp),
    expiresAt: toIso(item.timestamps?.expires),
    source: 'XWEATHER',
    raw: item
  }));
}

function firstResponse(raw) {
  return Array.isArray(raw?.response) ? raw.response[0] : undefined;
}

function coordsFromResponse(response) {
  return {
    latitude: Number(response?.loc?.lat ?? response?.place?.lat ?? 39.5),
    longitude: Number(response?.loc?.long ?? response?.place?.lon ?? -8)
  };
}

function toIso(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === 'number') {
    return new Date(value > 100000000000 ? value : value * 1000).toISOString();
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString();
}

function numberOrUndefined(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
