export class ProviderError extends Error {
  constructor({ providerId, code, message, details }) {
    super(message);
    this.name = 'ProviderError';
    this.providerId = providerId;
    this.code = code;
    this.details = details;
  }
}
