import { validateGeoJson } from './geojson/validate.mjs';

export function summarizeSystemHealth({ providers, aiStatus, config, snapshots = {} }) {
  const providerStatuses = providers.map((provider) => provider.getStatus());
  const statuses = [...providerStatuses, aiStatus].filter(Boolean);
  const degraded = config.forceDegraded || statuses.some((status) => ['degraded', 'offline'].includes(status.health));
  const offline = statuses.length > 0 && statuses.every((status) => status.health === 'offline');

  return {
    fetchedAt: new Date().toISOString(),
    health: offline ? 'offline' : degraded ? 'degraded' : 'healthy',
    degradedMode: Boolean(config.forceDegraded || degraded),
    mockMode: config.enableMocks,
    providerStatuses,
    aiStatus,
    snapshots,
    message: config.forceDegraded
      ? 'Forced degraded mode is enabled'
      : degraded
        ? 'One or more subsystems are degraded or offline'
        : 'System is healthy'
  };
}

export function validateGeoJsonExports(exports) {
  return Object.fromEntries(Object.entries(exports).map(([key, value]) => [key, validateGeoJson(value)]));
}
