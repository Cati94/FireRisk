import { HttpAIModelAdapter } from './http-ai-model-adapter.mjs';
import { MockAIModelAdapter } from './mock-ai-model-adapter.mjs';

export function createAIModelAdapter(config) {
  if (config.aiMode === 'local') {
    return new HttpAIModelAdapter({
      id: 'ai-local',
      mode: 'local',
      endpoint: config.aiLocalEndpoint,
      apiKey: ''
    });
  }

  if (config.aiMode === 'remote') {
    return new HttpAIModelAdapter({
      id: 'ai-remote',
      mode: 'remote',
      endpoint: config.aiRemoteEndpoint,
      apiKey: config.aiApiKey
    });
  }

  return new MockAIModelAdapter();
}
