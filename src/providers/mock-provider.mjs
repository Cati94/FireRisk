import { BaseProvider } from './base-provider.mjs';

export class MockProvider extends BaseProvider {
  constructor({ id, name, data = [] }) {
    super({ id, name, enabled: true });
    this.data = data;
    this.setStatus({
      health: 'healthy',
      lastUpdated: new Date().toISOString(),
      message: 'Mock provider ready'
    });
  }

  async fetchRaw() {
    return structuredClone(this.data);
  }

  normalize(raw) {
    return raw;
  }
}
