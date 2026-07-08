const fallbackStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'OpenStreetMap'
    }
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
};

const state = {
  map: null,
  fires: [],
  hotspots: [],
  aircraft: [],
  weather: [],
  weatherBundle: null,
  simulation: null,
  simulationVisible: true,
  decisions: null,
  postfire: null,
  prevention: null
};

boot();

async function boot() {
  const [config, fires, hotspots, aircraft, weather] = await Promise.all([
    getJson('/api/config'),
    getJson('/api/fires'),
    getJson('/api/hotspots'),
    getJson('/api/aircraft'),
    getJson('/api/weather')
  ]);

  state.fires = fires.data || [];
  state.hotspots = hotspots.data || [];
  state.aircraft = aircraft.data || [];
  state.weather = weather.data || [];
  state.weatherBundle = weather;

  document.querySelector('#mode').textContent = config.mockMode ? 'Mock mode' : 'Live mode';
  document.querySelector('#updated').textContent = new Date().toLocaleTimeString();

  initMap(config);
  renderProviders([fires.status, hotspots.status, aircraft.status, weather.status]);
  renderWeather(weather);
  renderFallbackMap();
  setupSimulationControls();
  setupDecisionControls();
  await runSimulation(60);
  setupRecoveryTabs();
  await Promise.all([runPostFire(60), runPrevention()]);
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response.json();
}

function initMap(config) {
  const fallback = document.querySelector('#mapFallback');
  renderFallbackMap();
  if (!window.maplibregl) {
    renderFallbackMap();
    return;
  }

  const style = config.mapTilerStyleUrl || fallbackStyle;
  state.map = new maplibregl.Map({
    container: 'map',
    style,
    center: [-8.15, 40.08],
    zoom: 8.2
  });

  state.map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');
  state.map.on('error', (event) => {
    console.warn('Map source failed', event?.error || event);
    renderFallbackMap();
  });
  state.map.on('load', () => {
    addPointLayer('fires', state.fires, '#d33f2f', 8);
    addPointLayer('hotspots', state.hotspots, '#f08c00', 6);
    addPointLayer('aircraft', state.aircraft, '#2563eb', 7);
    addPointLayer('weather', state.weather.filter((item) => item.location), '#247a48', 6);
    addPointLayer('lightning', state.weatherBundle?.lightning || [], '#6d28d9', 7);
    if (state.simulation) {
      renderSimulationLayers(state.simulation);
    }
    if (state.postfire) {
      renderPostFireLayers(state.postfire);
    }
    if (state.prevention) {
      renderPreventionLayers(state.prevention);
    }
    fallback.hidden = true;
  });
}

function addPointLayer(id, rows, color, radius) {
  const features = rows
    .map((item) => {
      const location = item.location || { latitude: item.latitude, longitude: item.longitude };
      if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
        return null;
      }
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [location.longitude, location.latitude] },
        properties: { id: item.id, label: item.name || item.callsign || item.stationName || id }
      };
    })
    .filter(Boolean);

  state.map.addSource(id, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features }
  });
  state.map.addLayer({
    id,
    type: 'circle',
    source: id,
    paint: {
      'circle-radius': radius,
      'circle-color': color,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  });
}

function renderProviders(statuses) {
  const container = document.querySelector('#providers');
  container.replaceChildren();

  for (const status of statuses) {
    const article = document.createElement('article');
    article.className = 'provider';
    article.innerHTML = `
      <div class="provider-header">
        <span class="provider-name"></span>
        <span class="badge"></span>
      </div>
      <p class="provider-message"></p>
    `;
    article.querySelector('.provider-name').textContent = status.name;
    const badge = article.querySelector('.badge');
    badge.textContent = status.health;
    badge.classList.add(status.health);
    article.querySelector('.provider-message').textContent = status.message || 'No status message';
    container.append(article);
  }
}

function renderWeather(bundle) {
  const container = document.querySelector('#weatherSummary');
  const latest = (bundle.observations || [])[0];
  const lightningCount = (bundle.lightning || []).length;
  const alertCount = (bundle.alerts || []).length;

  if (!latest) {
    container.innerHTML = '<p class="provider-message">No weather observations available.</p>';
    return;
  }

  const ageMinutes = Math.max(0, Math.round((Date.now() - Date.parse(latest.observedAt)) / 60000));
  const freshnessClass = latest.freshness === 'fresh' ? '' : latest.freshness;
  const rows = [
    ['Source', latest.source || bundle.status?.name || 'Unknown'],
    ['Station', latest.stationName || latest.stationId || latest.id],
    ['Updated', `${ageMinutes} min ago`],
    ['Freshness', latest.freshness || 'unknown', freshnessClass],
    ['Temperature', formatNumber(latest.temperatureC, 'C')],
    ['Humidity', formatNumber(latest.relativeHumidityPct, '%')],
    ['Wind', `${formatNumber(latest.windSpeedKph, 'km/h')} from ${formatNumber(latest.windDirectionDeg, 'deg')}`],
    ['Gust', formatNumber(latest.windGustKph, 'km/h')],
    ['Precipitation', formatNumber(latest.precipitationMm, 'mm')],
    ['Lightning', `${lightningCount} strikes`],
    ['Alerts', `${alertCount} active`]
  ];

  container.replaceChildren(...rows.map(([label, value, className]) => weatherRow(label, value, className)));
}

function weatherRow(label, value, className = '') {
  const row = document.createElement('div');
  row.className = 'weather-row';

  const labelElement = document.createElement('span');
  labelElement.className = 'weather-label';
  labelElement.textContent = label;

  const valueElement = document.createElement('span');
  valueElement.className = `weather-value ${className}`.trim();
  valueElement.textContent = value;

  row.append(labelElement, valueElement);
  return row;
}

function formatNumber(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '-';
  }
  return `${Math.round(number)} ${unit}`;
}

function setupSimulationControls() {
  document.querySelector('#horizonControls').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-horizon]');
    if (!button) {
      return;
    }

    for (const item of document.querySelectorAll('#horizonControls button')) {
      item.classList.toggle('active', item === button);
    }

    await runSimulation(Number(button.dataset.horizon));
  });

  document.querySelector('#simulationToggle').addEventListener('change', (event) => {
    state.simulationVisible = event.target.checked;
    setSimulationLayerVisibility(state.simulationVisible);
  });
}

async function runSimulation(horizonMinutes) {
  const summary = document.querySelector('#simulationSummary');
  summary.innerHTML = '<p class="provider-message">Running simulation...</p>';

  const simulation = await getJson(`/api/simulations/run?horizonMinutes=${horizonMinutes}`);
  state.simulation = simulation;
  renderSimulationSummary(simulation);

  if (state.map?.loaded()) {
    renderSimulationLayers(simulation);
  } else {
    renderFallbackMap();
  }

  await Promise.all([runDecisions(horizonMinutes), runPostFire(horizonMinutes)]);
}

function renderSimulationSummary(simulation) {
  const container = document.querySelector('#simulationSummary');
  const rows = [
    ['Horizon', `${simulation.horizonMinutes} min`],
    ['Confidence', `${Math.round(simulation.confidence * 100)} %`],
    ['Direction', `${Math.round(simulation.dominantSpreadDirection)} deg`],
    ['Spread rate', `${simulation.estimatedRateOfSpread} m/min`],
    ['Intensity', simulation.estimatedIntensity]
  ];

  container.replaceChildren(...rows.map(([label, value]) => weatherRow(label, value)));
  container.append(noteBlock('Assumptions', simulation.assumptions));
  container.append(noteBlock('Missing data', simulation.missingData.length ? simulation.missingData : ['none']));
  container.append(noteBlock('Warnings', simulation.warnings));
}

function noteBlock(title, items) {
  const wrapper = document.createElement('div');
  const label = document.createElement('div');
  label.className = 'weather-label';
  label.textContent = title;
  const list = document.createElement('ul');
  list.className = 'note-list';

  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    list.append(li);
  }

  wrapper.append(label, list);
  return wrapper;
}

function renderSimulationLayers(simulation) {
  upsertGeoJsonLayer({
    id: 'simulation-uncertainty',
    data: simulation.uncertaintyGeoJson,
    type: 'fill',
    paint: {
      'fill-color': '#d97706',
      'fill-opacity': 0.16
    }
  });
  upsertGeoJsonLayer({
    id: 'simulation-perimeter',
    data: simulation.predictedPerimeterGeoJson,
    type: 'fill',
    paint: {
      'fill-color': '#dc2626',
      'fill-opacity': 0.28
    }
  });
  upsertGeoJsonLayer({
    id: 'simulation-direction',
    data: simulation.directionGeoJson,
    type: 'line',
    paint: {
      'line-color': '#7c2d12',
      'line-width': 3
    }
  });
  upsertGeoJsonLayer({
    id: 'simulation-fronts',
    data: simulation.temporalFrontsGeoJson,
    type: 'circle',
    paint: {
      'circle-radius': 5,
      'circle-color': '#7c2d12',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  });
  setSimulationLayerVisibility(state.simulationVisible);
}

function upsertGeoJsonLayer({ id, data, type, paint }) {
  if (state.map.getSource(id)) {
    state.map.getSource(id).setData(data);
    return;
  }

  state.map.addSource(id, { type: 'geojson', data });
  state.map.addLayer({ id, type, source: id, paint });
}

function setSimulationLayerVisibility(visible) {
  if (!state.map) {
    return;
  }

  const visibility = visible ? 'visible' : 'none';
  for (const id of ['simulation-uncertainty', 'simulation-perimeter', 'simulation-direction', 'simulation-fronts']) {
    if (state.map.getLayer(id)) {
      state.map.setLayoutProperty(id, 'visibility', visibility);
    }
  }
}

function setupDecisionControls() {
  document.querySelector('#decisionRefresh').addEventListener('click', async () => {
    const active = document.querySelector('#horizonControls button.active');
    await runDecisions(Number(active?.dataset.horizon || 60));
  });
}

async function runDecisions(horizonMinutes) {
  const container = document.querySelector('#decisionSummary');
  container.innerHTML = '<p class="provider-message">Generating decision support...</p>';

  const snapshot = await getJson(`/api/decisions/run?horizonMinutes=${horizonMinutes}`);
  state.decisions = snapshot;
  renderAIAnalysis(snapshot);
  renderDecisions(snapshot);
}

function renderAIAnalysis(snapshot) {
  const container = document.querySelector('#aiSummary');
  const analysis = snapshot.aiAnalysis;
  const status = snapshot.aiStatus;

  if (!analysis) {
    container.innerHTML = `
      <article class="ai-card">
        <div class="recommendation-title">
          <span>AI analysis unavailable</span>
          <span class="priority medium">${status?.health || 'degraded'}</span>
        </div>
        <p class="provider-message">Fallback heuristico ativo. As recomendacoes de regras continuam disponiveis.</p>
      </article>
    `;
    return;
  }

  const card = document.createElement('article');
  card.className = 'ai-card';
  const title = document.createElement('div');
  title.className = 'recommendation-title';
  const name = document.createElement('span');
  name.textContent = `AI analysis (${analysis.mode})`;
  const risk = document.createElement('span');
  risk.className = `priority ${analysis.riskClassification === 'high' || analysis.riskClassification === 'extreme' ? 'high' : 'medium'}`;
  risk.textContent = analysis.riskClassification;
  title.append(name, risk);

  const body = document.createElement('div');
  body.className = 'simulation-summary';
  body.append(
    weatherRow('Confidence', `${Math.round(analysis.confidence * 100)} %`),
    weatherRow('Generated', new Date(analysis.generatedAt).toLocaleTimeString()),
    textBlock('Behavior', analysis.behaviorAnalysis),
    textBlock('Forecast', analysis.qualitativeForecast),
    textBlock('Explanation', analysis.explanation),
    noteBlock('Uncertainty', analysis.uncertainty || []),
    noteBlock('Missing data', analysis.missingData?.length ? analysis.missingData : ['none'])
  );

  card.append(title, body);
  container.replaceChildren(card);
}

function renderDecisions(snapshot) {
  const container = document.querySelector('#decisionSummary');
  const recommendations = snapshot.recommendations || [];
  if (!recommendations.length) {
    container.innerHTML = '<p class="provider-message">No recommendations available.</p>';
    return;
  }

  container.replaceChildren(...recommendations.map(renderRecommendation));
}

function renderRecommendation(recommendation) {
  const article = document.createElement('article');
  article.className = 'recommendation';

  const title = document.createElement('div');
  title.className = 'recommendation-title';
  const name = document.createElement('span');
  name.textContent = recommendation.title;
  const priority = document.createElement('span');
  priority.className = `priority ${recommendation.priority}`;
  priority.textContent = recommendation.priority;
  title.append(name, priority);

  const body = document.createElement('div');
  body.className = 'simulation-summary';
  body.append(
    weatherRow('Confidence', `${Math.round(recommendation.confidence * 100)} %`),
    weatherRow('Category', recommendation.category),
    weatherRow('Created', new Date(recommendation.createdAt).toLocaleTimeString()),
    textBlock('Description', recommendation.description),
    textBlock('Rationale', recommendation.rationale),
    noteBlock('Assumptions', recommendation.assumptions || []),
    noteBlock('Missing data', recommendation.missingData?.length ? recommendation.missingData : ['none']),
    noteBlock('Suggested validation', recommendation.suggestedValidation || [])
  );

  article.append(title, body);
  return article;
}

function textBlock(label, text) {
  const wrapper = document.createElement('div');
  const labelElement = document.createElement('div');
  labelElement.className = 'weather-label';
  labelElement.textContent = label;
  const value = document.createElement('p');
  value.className = 'provider-message';
  value.textContent = text;
  wrapper.append(labelElement, value);
  return wrapper;
}

function setupRecoveryTabs() {
  document.querySelector('.tabs').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-tab]');
    if (!button) {
      return;
    }

    for (const tab of document.querySelectorAll('.tabs button')) {
      tab.classList.toggle('active', tab === button);
    }

    const active = button.dataset.tab;
    document.querySelector('#postfirePanel').hidden = active !== 'postfire';
    document.querySelector('#preventionPanel').hidden = active !== 'prevention';
  });
}

async function runPostFire(horizonMinutes) {
  const snapshot = await getJson(`/api/postfire/run?horizonMinutes=${horizonMinutes}`);
  state.postfire = snapshot;
  renderPostFire(snapshot);
  if (state.map?.loaded()) {
    renderPostFireLayers(snapshot);
  } else {
    renderFallbackMap();
  }
}

async function runPrevention() {
  const snapshot = await getJson('/api/prevention/run');
  state.prevention = snapshot;
  renderPrevention(snapshot);
  if (state.map?.loaded()) {
    renderPreventionLayers(snapshot);
  } else {
    renderFallbackMap();
  }
}

function renderPostFire(snapshot) {
  const panel = document.querySelector('#postfirePanel');
  const assessment = snapshot.assessment;
  panel.replaceChildren(
    weatherRow('Severity', assessment.estimatedSeverity),
    weatherRow('Erosion risk', assessment.erosionRisk),
    weatherRow('Runoff risk', assessment.runoffRisk),
    weatherRow('Confidence', `${Math.round(assessment.confidence * 100)} %`),
    noteBlock('Missing data', assessment.missingData),
    noteBlock('Priorities', snapshot.stabilizationPriorities.map((item) => `${item.priority}: ${item.title}`)),
    noteBlock('Recovery tasks', snapshot.recoveryTasks.map((item) => `${item.priority}: ${item.title}`))
  );
}

function renderPrevention(snapshot) {
  const panel = document.querySelector('#preventionPanel');
  panel.replaceChildren(
    weatherRow('Confidence', `${Math.round(snapshot.confidence * 100)} %`),
    weatherRow('Incidents', String(snapshot.dataStatus.incidentCount)),
    weatherRow('Hotspots', String(snapshot.dataStatus.hotspotCount)),
    weatherRow('Lightning', String(snapshot.dataStatus.lightningCount)),
    noteBlock('Missing data', snapshot.dataStatus.missingData),
    noteBlock('Priorities', snapshot.priorities.map((item) => `${item.priority}: ${item.title}`)),
    textBlock('Report', snapshot.reportSummary)
  );
}

function renderPostFireLayers(snapshot) {
  upsertGeoJsonLayer({
    id: 'postfire-burned-perimeter',
    data: snapshot.assessment.perimeterGeoJson,
    type: 'fill',
    paint: {
      'fill-color': '#4b5563',
      'fill-opacity': 0.22
    }
  });
  upsertGeoJsonLayer({
    id: 'postfire-erosion-zones',
    data: snapshot.erosionZonesGeoJson,
    type: 'line',
    paint: {
      'line-color': '#92400e',
      'line-width': 2
    }
  });
}

function renderPreventionLayers(snapshot) {
  upsertGeoJsonLayer({
    id: 'prevention-critical-areas',
    data: snapshot.criticalAreasGeoJson,
    type: 'circle',
    paint: {
      'circle-radius': 9,
      'circle-color': '#0f766e',
      'circle-opacity': 0.72,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  });
}

function renderFallbackMap() {
  const svg = document.querySelector('#fallbackMapSvg');
  const fallback = document.querySelector('#mapFallback');
  if (!svg || !fallback) {
    return;
  }

  fallback.hidden = false;
  const bounds = collectBounds();
  const width = 1000;
  const height = 700;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.replaceChildren();

  appendSvg(svg, 'rect', { x: 0, y: 0, width, height, fill: '#dfe8df' });
  for (let x = 0; x <= width; x += 100) appendSvg(svg, 'line', { x1: x, y1: 0, x2: x, y2: height, stroke: '#cbd8ca', 'stroke-width': 1 });
  for (let y = 0; y <= height; y += 100) appendSvg(svg, 'line', { x1: 0, y1: y, x2: width, y2: y, stroke: '#cbd8ca', 'stroke-width': 1 });

  renderFallbackFeature(svg, state.simulation?.uncertaintyGeoJson, bounds, '#d97706', 0.18, '#d97706');
  renderFallbackFeature(svg, state.simulation?.predictedPerimeterGeoJson, bounds, '#dc2626', 0.28, '#dc2626');
  renderFallbackFeature(svg, state.postfire?.assessment?.perimeterGeoJson, bounds, '#4b5563', 0.2, '#4b5563');
  renderFallbackFeature(svg, state.postfire?.erosionZonesGeoJson, bounds, 'none', 0, '#92400e');
  renderFallbackFeature(svg, state.prevention?.criticalAreasGeoJson, bounds, '#0f766e', 0.7, '#ffffff');

  renderFallbackPoints(svg, state.fires, bounds, '#d33f2f', 8);
  renderFallbackPoints(svg, state.hotspots, bounds, '#f08c00', 6);
  renderFallbackPoints(svg, state.aircraft, bounds, '#2563eb', 7);
  renderFallbackPoints(svg, state.weather, bounds, '#247a48', 6);
  renderFallbackPoints(svg, state.weatherBundle?.lightning || [], bounds, '#6d28d9', 7);
}

function collectBounds() {
  const points = [
    ...pointRows(state.fires),
    ...pointRows(state.hotspots),
    ...pointRows(state.aircraft),
    ...pointRows(state.weather),
    ...pointRows(state.weatherBundle?.lightning || []),
    ...geoJsonPositions(state.simulation?.predictedPerimeterGeoJson),
    ...geoJsonPositions(state.simulation?.uncertaintyGeoJson),
    ...geoJsonPositions(state.postfire?.assessment?.perimeterGeoJson),
    ...geoJsonPositions(state.prevention?.criticalAreasGeoJson)
  ];
  const valid = points.filter((point) => Number.isFinite(point.longitude) && Number.isFinite(point.latitude));
  if (!valid.length) {
    return { minLon: -8.5, maxLon: -7.8, minLat: 39.75, maxLat: 40.35 };
  }

  const lons = valid.map((point) => point.longitude);
  const lats = valid.map((point) => point.latitude);
  const paddingLon = Math.max(0.04, (Math.max(...lons) - Math.min(...lons)) * 0.22);
  const paddingLat = Math.max(0.04, (Math.max(...lats) - Math.min(...lats)) * 0.22);
  return {
    minLon: Math.min(...lons) - paddingLon,
    maxLon: Math.max(...lons) + paddingLon,
    minLat: Math.min(...lats) - paddingLat,
    maxLat: Math.max(...lats) + paddingLat
  };
}

function project(point, bounds) {
  const x = ((point.longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 1000;
  const y = (1 - (point.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 700;
  return { x, y };
}

function pointRows(rows) {
  return (rows || []).map((item) => item.location || { latitude: item.latitude, longitude: item.longitude });
}

function renderFallbackPoints(svg, rows, bounds, color, radius) {
  for (const point of pointRows(rows)) {
    if (!Number.isFinite(point?.latitude) || !Number.isFinite(point?.longitude)) continue;
    const projected = project(point, bounds);
    appendSvg(svg, 'circle', {
      cx: projected.x,
      cy: projected.y,
      r: radius,
      fill: color,
      stroke: '#ffffff',
      'stroke-width': 2
    });
  }
}

function renderFallbackFeature(svg, geoJson, bounds, fill, opacity, stroke) {
  for (const feature of geoJsonFeatures(geoJson)) {
    const geometry = feature.geometry || feature;
    if (geometry.type === 'Polygon') {
      const points = geometry.coordinates[0].map(([longitude, latitude]) => project({ longitude, latitude }, bounds));
      appendSvg(svg, 'polygon', {
        points: points.map((point) => `${point.x},${point.y}`).join(' '),
        fill,
        'fill-opacity': opacity,
        stroke,
        'stroke-width': 2
      });
    }
    if (geometry.type === 'LineString') {
      const points = geometry.coordinates.map(([longitude, latitude]) => project({ longitude, latitude }, bounds));
      appendSvg(svg, 'polyline', {
        points: points.map((point) => `${point.x},${point.y}`).join(' '),
        fill: 'none',
        stroke,
        'stroke-width': 3
      });
    }
    if (geometry.type === 'Point') {
      const [longitude, latitude] = geometry.coordinates;
      const point = project({ longitude, latitude }, bounds);
      appendSvg(svg, 'circle', { cx: point.x, cy: point.y, r: 7, fill, stroke, 'stroke-width': 2 });
    }
  }
}

function geoJsonFeatures(geoJson) {
  if (!geoJson) return [];
  if (geoJson.type === 'FeatureCollection') return geoJson.features || [];
  if (geoJson.type === 'Feature') return [geoJson];
  return [{ type: 'Feature', geometry: geoJson, properties: {} }];
}

function geoJsonPositions(geoJson) {
  const positions = [];
  for (const feature of geoJsonFeatures(geoJson)) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === 'Point') positions.push({ longitude: geometry.coordinates[0], latitude: geometry.coordinates[1] });
    if (geometry.type === 'LineString') geometry.coordinates.forEach(([longitude, latitude]) => positions.push({ longitude, latitude }));
    if (geometry.type === 'Polygon') geometry.coordinates.flat().forEach(([longitude, latitude]) => positions.push({ longitude, latitude }));
  }
  return positions;
}

function appendSvg(parent, tag, attrs) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, String(value));
  }
  parent.append(element);
  return element;
}
