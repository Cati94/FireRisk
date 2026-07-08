export function freshnessFor(observedAt, staleMinutes = 30, expiredMinutes = 120) {
  const timestamp = Date.parse(observedAt || '');
  if (!Number.isFinite(timestamp)) {
    return 'unknown';
  }

  const ageMinutes = (Date.now() - timestamp) / 60000;
  if (ageMinutes > expiredMinutes) return 'expired';
  if (ageMinutes > staleMinutes) return 'stale';
  return 'fresh';
}

export function confidenceForFreshness(freshness) {
  if (freshness === 'fresh') return 0.9;
  if (freshness === 'stale') return 0.6;
  if (freshness === 'expired') return 0.25;
  return 0.4;
}

export function nearestObservation(observations, location) {
  if (!location || !Array.isArray(observations) || observations.length === 0) {
    return undefined;
  }

  return observations
    .map((observation) => ({
      observation,
      distanceKm: distanceKm(location, observation.location)
    }))
    .filter((entry) => Number.isFinite(entry.distanceKm))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
}

function distanceKm(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;

  const lat1 = toRadians(Number(a.latitude));
  const lat2 = toRadians(Number(b.latitude));
  const deltaLat = toRadians(Number(b.latitude) - Number(a.latitude));
  const deltaLon = toRadians(Number(b.longitude) - Number(a.longitude));

  if (![lat1, lat2, deltaLat, deltaLon].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY;
  }

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
