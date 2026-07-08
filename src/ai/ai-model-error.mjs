export class AIModelError extends Error {
  constructor({ code, message, details }) {
    super(message);
    this.name = 'AIModelError';
    this.code = code;
    this.details = details;
  }
}
