import { ProviderError } from './provider-error.mjs';

export async function fetchJson({ providerId, url, timeoutMs = 8000, signal, headers = {} }) {
  const text = await fetchText({ providerId, url, timeoutMs, signal, headers });

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ProviderError({
      providerId,
      code: 'INVALID_JSON',
      message: 'Provider returned invalid JSON',
      details: error.message
    });
  }
}

export async function fetchText({ providerId, url, timeoutMs = 8000, signal, headers = {} }) {
  if (!url) {
    throw new ProviderError({
      providerId,
      code: 'MISSING_CREDENTIALS',
      message: 'Provider URL is not configured'
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();

  if (signal) {
    if (signal.aborted) controller.abort();
    signal.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json,text/plain;q=0.9,*/*;q=0.8', ...headers }
    });

    if (!response.ok) {
      throw new ProviderError({
        providerId,
        code: response.status === 429 ? 'RATE_LIMIT' : 'HTTP_ERROR',
        message: `HTTP ${response.status} from provider`,
        details: { status: response.status, statusText: response.statusText }
      });
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new ProviderError({
        providerId,
        code: 'EMPTY_RESPONSE',
        message: 'Provider returned an empty response'
      });
    }

    if (/^\s*</.test(text)) {
      throw new ProviderError({
        providerId,
        code: 'HTML_UNEXPECTED',
        message: 'Provider returned HTML instead of data'
      });
    }

    return text;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ProviderError({
        providerId,
        code: 'TIMEOUT',
        message: `Provider timed out after ${timeoutMs}ms`
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    if (signal) {
      signal.removeEventListener('abort', abortFromCaller);
    }
  }
}
