import { BaseProvider } from './base-provider.mjs';
import { fetchJson } from './http.mjs';

export class ICNFProvider extends BaseProvider {
  constructor({ url, mockData }) {
    super({ id: 'icnf', name: 'ICNF occurrences', enabled: Boolean(url || mockData) });
    this.url = url;
    this.mockData = mockData;
  }

  async fetchRaw(options = {}) {
    if (!this.url) {
      return this.mockData;
    }
    return fetchJson({
      providerId: this.id,
      url: this.url,
      timeoutMs: options.timeoutMs,
      signal: options.signal
    });
  }

  normalize(raw) {
    const rows = Array.isArray(raw) ? raw : raw?.features || raw?.ocorrencias || raw?.data || [];
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((item, index) => {
      const latitude = Number(item.location?.latitude ?? item.latitude ?? item.lat ?? item.Latitude ?? item.y);
      const longitude = Number(item.location?.longitude ?? item.longitude ?? item.lon ?? item.lng ?? item.Longitude ?? item.x);
      return {
        id: String(item.id ?? item.codigo ?? item.numero ?? `icnf-${index}`),
        name: item.name ?? item.local ?? item.localidade,
        location: {
          latitude: Number.isFinite(latitude) ? latitude : 39.5,
          longitude: Number.isFinite(longitude) ? longitude : -8
        },
        municipality: item.municipio ?? item.concelho,
        parish: item.freguesia,
        district: item.distrito,
        status: item.status ?? item.estado ?? 'unknown',
        startedAt: item.startedAt ?? item.dataInicio ?? item.inicio,
        updatedAt: item.updatedAt ?? item.dataAtualizacao ?? new Date().toISOString(),
        source: 'ICNF',
        raw: item
      };
    });
  }
}
