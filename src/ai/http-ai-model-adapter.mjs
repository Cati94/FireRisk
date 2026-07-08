import { BaseAIModelAdapter } from './base-ai-model-adapter.mjs';
import { AIModelError } from './ai-model-error.mjs';

export class HttpAIModelAdapter extends BaseAIModelAdapter {
  constructor({ id, mode, endpoint, apiKey }) {
    super({ id, mode, enabled: Boolean(endpoint) });
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  async analyze(input) {
    if (!this.endpoint) {
      throw new AIModelError({
        code: 'MISSING_ENDPOINT',
        message: `${this.mode} AI endpoint is not configured`
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new AIModelError({
          code: 'HTTP_ERROR',
          message: `AI endpoint returned HTTP ${response.status}`,
          details: { status: response.status, statusText: response.statusText }
        });
      }

      const text = await response.text();
      if (!text.trim()) {
        throw new AIModelError({ code: 'EMPTY_RESPONSE', message: 'AI endpoint returned an empty response' });
      }
      if (/^\s*</.test(text)) {
        throw new AIModelError({ code: 'HTML_UNEXPECTED', message: 'AI endpoint returned HTML instead of JSON' });
      }

      let output;
      try {
        output = JSON.parse(text);
      } catch (error) {
        throw new AIModelError({ code: 'INVALID_JSON', message: 'AI endpoint returned invalid JSON', details: error.message });
      }

      const generatedAt = output.generatedAt || new Date().toISOString();
      this.setStatus({
        healthy: true,
        health: 'healthy',
        lastRunAt: generatedAt,
        message: `${this.mode} AI analysis generated`
      });
      return normalizeOutput(output, this.mode, input);
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new AIModelError({ code: 'TIMEOUT', message: 'AI endpoint timed out after 8000ms' });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeOutput(output, mode, input) {
  const generatedAt = output.generatedAt || new Date().toISOString();
  return {
    id: output.id || `ai-${Date.now()}`,
    mode,
    generatedAt,
    incidentId: output.incidentId || input.incident?.id || 'unknown',
    behaviorAnalysis: output.behaviorAnalysis || 'AI behavior analysis unavailable.',
    qualitativeForecast: output.qualitativeForecast || 'AI qualitative forecast unavailable.',
    riskClassification: output.riskClassification || 'unknown',
    confidence: Number.isFinite(Number(output.confidence)) ? Number(output.confidence) : 0.3,
    findings: Array.isArray(output.findings) ? output.findings : [],
    recommendations: Array.isArray(output.recommendations) ? output.recommendations : [],
    uncertainty: Array.isArray(output.uncertainty) ? output.uncertainty : ['AI uncertainty was not supplied by the model'],
    missingData: Array.isArray(output.missingData) ? output.missingData : [],
    explanation: output.explanation || 'External AI output normalized by FireRisk adapter.',
    raw: output
  };
}
