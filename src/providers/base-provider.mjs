import { ProviderError } from './provider-error.mjs';

export class BaseProvider {
  constructor({ id, name, enabled = true }) {
    this.id = id;
    this.name = name;
    this.status = {
      id,
      name,
      health: enabled ? 'unknown' : 'offline',
      enabled,
      message: enabled ? 'Not checked yet' : 'Provider disabled'
    };
  }

  getStatus() {
    return { ...this.status };
  }

  getLastUpdated() {
    return this.status.lastUpdated;
  }

  setStatus(patch) {
    this.status = { ...this.status, ...patch };
    return this.getStatus();
  }

  async healthCheck(options = {}) {
    try {
      const raw = await this.fetchRaw(options);
      const normalized = this.normalize(raw);
      const count = Array.isArray(normalized) ? normalized.length : undefined;
      return this.setStatus({
        health: 'healthy',
        lastUpdated: new Date().toISOString(),
        lastSuccessAt: new Date().toISOString(),
        message: count === undefined ? 'Provider healthy' : `Provider healthy (${count} records)`
      });
    } catch (error) {
      return this.handleFailure(error);
    }
  }

  handleFailure(error) {
    const now = new Date().toISOString();
    const providerError = error instanceof ProviderError
      ? error
      : new ProviderError({
          providerId: this.id,
          code: 'UNKNOWN',
          message: error?.message || 'Unknown provider failure',
          details: error
        });

    return this.setStatus({
      health: providerError.code === 'MISSING_CREDENTIALS' ? 'offline' : 'degraded',
      lastUpdated: now,
      lastFailureAt: now,
      message: providerError.message,
      degradedReason: providerError.code
    });
  }
}
