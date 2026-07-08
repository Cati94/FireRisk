import { BaseProvider } from './base-provider.mjs';
import { fetchText } from './http.mjs';

export class FIRMSProvider extends BaseProvider {
  constructor({ baseUrl, mapKey, mockData }) {
    super({ id: 'firms', name: 'NASA FIRMS hotspots', enabled: Boolean((baseUrl && mapKey) || mockData) });
    this.baseUrl = baseUrl;
    this.mapKey = mapKey;
    this.mockData = mockData;
  }

  async fetchRaw(options = {}) {
    if (!this.mapKey) {
      return this.mockData;
    }

    const url = `${this.baseUrl.replace(/\/$/, '')}/country/csv/${this.mapKey}/VIIRS_SNPP_NRT/PRT/1`;
    const csv = await fetchText({
      providerId: this.id,
      url,
      timeoutMs: options.timeoutMs,
      signal: options.signal
    });
    return parseCsv(csv);
  }

  normalize(raw) {
    const rows = Array.isArray(raw) ? raw : raw?.data || [];
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((item, index) => {
      const latitude = Number(item.location?.latitude ?? item.latitude ?? item.lat);
      const longitude = Number(item.location?.longitude ?? item.longitude ?? item.lon ?? item.lng);
      const confidenceRaw = Number(item.confidence);
      return {
        id: String(item.id ?? `firms-${index}`),
        location: {
          latitude: Number.isFinite(latitude) ? latitude : 39.5,
          longitude: Number.isFinite(longitude) ? longitude : -8
        },
        detectedAt: item.detectedAt ?? item.acq_datetime ?? item.acq_date ?? new Date().toISOString(),
        source: 'NASA_FIRMS',
        satellite: item.satellite,
        confidence: normalizeConfidence(confidenceRaw),
        brightness: numberOrUndefined(item.bright_ti4 ?? item.brightness),
        frp: numberOrUndefined(item.frp),
        raw: item
      };
    });
  }
}

function numberOrUndefined(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeConfidence(value) {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return value <= 1 ? value : Math.min(value / 100, 1);
}

function parseCsv(csv) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}
