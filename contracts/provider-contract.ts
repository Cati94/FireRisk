import type { ISODateTime, ProviderHealth } from './firerisk-types';

export type ProviderStatus = {
  id: string;
  name: string;
  health: ProviderHealth;
  enabled: boolean;
  lastUpdated?: ISODateTime;
  lastSuccessAt?: ISODateTime;
  lastFailureAt?: ISODateTime;
  message?: string;
  stale?: boolean;
  degradedReason?: string;
};

export type ProviderResult<T> = {
  providerId: string;
  fetchedAt: ISODateTime;
  data: T;
  status: ProviderStatus;
  warnings: string[];
  raw?: unknown;
};

export type ProviderFetchOptions = {
  timeoutMs?: number;
  useCache?: boolean;
  allowMockFallback?: boolean;
  signal?: AbortSignal;
};

export interface FireRiskProvider<TRaw, TNormalized> {
  readonly id: string;
  readonly name: string;

  fetchRaw(options?: ProviderFetchOptions): Promise<TRaw>;
  normalize(raw: TRaw): TNormalized;
  healthCheck(options?: ProviderFetchOptions): Promise<ProviderStatus>;
  getStatus(): ProviderStatus;
  getLastUpdated(): ISODateTime | undefined;
}

export class ProviderError extends Error {
  readonly providerId: string;
  readonly code:
    | 'TIMEOUT'
    | 'HTTP_ERROR'
    | 'HTML_UNEXPECTED'
    | 'INVALID_JSON'
    | 'EMPTY_RESPONSE'
    | 'RATE_LIMIT'
    | 'MISSING_CREDENTIALS'
    | 'PARTIAL_RESPONSE'
    | 'UNKNOWN';
  readonly details?: unknown;

  constructor(args: {
    providerId: string;
    code: ProviderError['code'];
    message: string;
    details?: unknown;
  }) {
    super(args.message);
    this.name = 'ProviderError';
    this.providerId = args.providerId;
    this.code = args.code;
    this.details = args.details;
  }
}
