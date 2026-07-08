export function validateGeoJson(value) {
  const errors = [];
  validateNode(value, 'root', errors);
  return {
    valid: errors.length === 0,
    errors
  };
}

function validateNode(value, path, errors) {
  if (!value || typeof value !== 'object') {
    errors.push(`${path} is not an object`);
    return;
  }

  if (value.type === 'FeatureCollection') {
    if (!Array.isArray(value.features)) {
      errors.push(`${path}.features is not an array`);
      return;
    }
    value.features.forEach((feature, index) => validateNode(feature, `${path}.features[${index}]`, errors));
    return;
  }

  if (value.type === 'Feature') {
    if (!value.geometry) {
      errors.push(`${path}.geometry is missing`);
      return;
    }
    validateGeometry(value.geometry, `${path}.geometry`, errors);
    return;
  }

  validateGeometry(value, path, errors);
}

function validateGeometry(geometry, path, errors) {
  if (!geometry || typeof geometry !== 'object') {
    errors.push(`${path} is not an object`);
    return;
  }

  if (!['Point', 'LineString', 'Polygon'].includes(geometry.type)) {
    errors.push(`${path}.type is unsupported: ${geometry.type}`);
    return;
  }

  if (!Array.isArray(geometry.coordinates)) {
    errors.push(`${path}.coordinates is not an array`);
    return;
  }

  if (geometry.type === 'Point') validatePosition(geometry.coordinates, path, errors);
  if (geometry.type === 'LineString') geometry.coordinates.forEach((position, index) => validatePosition(position, `${path}[${index}]`, errors));
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring, ringIndex) => {
      if (!Array.isArray(ring) || ring.length < 4) {
        errors.push(`${path}[${ringIndex}] must have at least 4 positions`);
        return;
      }
      ring.forEach((position, index) => validatePosition(position, `${path}[${ringIndex}][${index}]`, errors));
    });
  }
}

function validatePosition(position, path, errors) {
  if (!Array.isArray(position) || position.length < 2) {
    errors.push(`${path} is not a coordinate position`);
    return;
  }

  const [longitude, latitude] = position.map(Number);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.push(`${path}.longitude is invalid`);
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.push(`${path}.latitude is invalid`);
  }
}
