import { AIModelError } from './ai-model-error.mjs';

export class BaseAIModelAdapter {
  constructor({ id, mode, enabled = true }) {
    this.id = id;
    this.mode = mode;
    this.status = {
      id,
      mode,
      healthy: enabled,
      health: enabled ? 'unknown' : 'offline',
      enabled,
      message: enabled ? 'Not checked yet' : 'Adapter disabled'
    };
  }

  getStatus() {
    return { ...this.status };
  }

  setStatus(patch) {
    this.status = { ...this.status, ...patch };
    return this.getStatus();
  }

  async healthCheck() {
    return this.getStatus();
  }

  handleFailure(error) {
    const modelError = error instanceof AIModelError
      ? error
      : new AIModelError({
          code: 'UNKNOWN',
          message: error?.message || 'Unknown AI model failure',
          details: error
        });

    return this.setStatus({
      healthy: false,
      health: 'degraded',
      lastFailureAt: new Date().toISOString(),
      message: modelError.message,
      degradedReason: modelError.code
    });
  }
}
