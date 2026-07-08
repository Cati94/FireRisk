export class PostFireAssessmentEngine {
  assess({ incident, simulation }) {
    const perimeter = simulation?.predictedPerimeterGeoJson || fallbackPerimeter(incident);
    const intensity = simulation?.estimatedIntensity || 'unknown';
    const confidence = confidenceFor({ simulation, intensity });
    const missingData = [
      ...(simulation ? [] : ['burnedPerimeter']),
      'burnSeverityImagery',
      'soilType',
      'slopeModel',
      'hydrology',
      'fieldValidation'
    ];
    const severity = severityFromIntensity(intensity);
    const erosionRisk = severity === 'high' ? 'high' : severity === 'moderate' ? 'medium' : 'low';
    const runoffRisk = severity === 'high' ? 'high' : severity === 'moderate' ? 'medium' : 'low';
    const generatedAt = new Date().toISOString();

    return {
      assessment: {
        id: `postfire-${Date.now()}`,
        incidentId: incident?.id || 'mock-fire-01',
        perimeterGeoJson: perimeter,
        assessedAt: generatedAt,
        estimatedSeverity: severity,
        erosionRisk,
        runoffRisk,
        confidence,
        assumptions: [
          'Burned perimeter is approximated from the latest predicted perimeter when no imported perimeter exists',
          'Severity is simplified from simulation intensity and must be validated with field or remote-sensing data'
        ],
        missingData
      },
      erosionZonesGeoJson: erosionZones(perimeter),
      stabilizationPriorities: priorities({ severity, erosionRisk, runoffRisk, confidence }),
      recoveryTasks: recoveryTasks({ incident, severity, erosionRisk, runoffRisk, confidence })
    };
  }
}

function severityFromIntensity(intensity) {
  if (intensity === 'extreme' || intensity === 'high') return 'high';
  if (intensity === 'moderate') return 'moderate';
  if (intensity === 'low') return 'low';
  return 'unknown';
}

function confidenceFor({ simulation, intensity }) {
  const base = simulation?.confidence ?? 0.35;
  const penalty = intensity === 'unknown' ? 0.12 : 0;
  return Math.round(Math.max(0.2, base - penalty) * 100) / 100;
}

function priorities({ severity, erosionRisk, runoffRisk, confidence }) {
  return [
    {
      id: `stab-${Date.now()}-1`,
      title: 'Emergency stabilization review',
      priority: severity === 'high' ? 'high' : 'medium',
      confidence,
      description: 'Sugerir avaliacao de estabilizacao de emergencia nas zonas com maior severidade estimada.',
      missingData: ['burnSeverityImagery', 'fieldValidation'],
      rationale: `Severidade estimada: ${severity}; risco de erosao: ${erosionRisk}; risco de escorrencia: ${runoffRisk}.`
    },
    {
      id: `stab-${Date.now()}-2`,
      title: 'Runoff and drainage inspection',
      priority: runoffRisk === 'high' ? 'high' : 'medium',
      confidence,
      description: 'Sugerir verificacao analitica de linhas de agua, drenagens e zonas vulneraveis a escorrencia.',
      missingData: ['hydrology', 'rainForecast'],
      rationale: 'A ausencia de hidrologia detalhada limita a confianca da prioridade.'
    }
  ];
}

function recoveryTasks({ incident, severity, erosionRisk, runoffRisk, confidence }) {
  const location = incident?.location;
  return [
    {
      id: `recovery-${Date.now()}-1`,
      assessmentId: 'pending-persistence',
      title: 'Field severity validation',
      priority: 'high',
      description: 'Confirmar severidade estimada e limites do perimetro ardido antes de planear intervencoes.',
      location,
      confidence,
      missingData: ['fieldValidation']
    },
    {
      id: `recovery-${Date.now()}-2`,
      assessmentId: 'pending-persistence',
      title: 'Erosion control screening',
      priority: erosionRisk === 'high' ? 'high' : 'medium',
      description: 'Identificar encostas, solos expostos e linhas de escorrencia para intervencoes prioritarias.',
      location,
      confidence,
      missingData: ['soilType', 'slopeModel']
    },
    {
      id: `recovery-${Date.now()}-3`,
      assessmentId: 'pending-persistence',
      title: 'Post-fire runoff monitoring',
      priority: runoffRisk === 'high' || severity === 'high' ? 'high' : 'medium',
      description: 'Acompanhar previsao de precipitacao e sinais de escorrencia nas primeiras janelas criticas.',
      location,
      confidence,
      missingData: ['rainForecast', 'hydrology']
    }
  ];
}

function erosionZones(perimeter) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'probable-erosion-zone', confidence: 0.45 },
        geometry: perimeter.geometry
      }
    ]
  };
}

function fallbackPerimeter(incident) {
  const center = incident?.location || { latitude: 40.112, longitude: -8.246 };
  const delta = 0.01;
  return {
    type: 'Feature',
    properties: { kind: 'mock-burned-perimeter' },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [center.longitude - delta, center.latitude - delta],
        [center.longitude + delta, center.latitude - delta],
        [center.longitude + delta, center.latitude + delta],
        [center.longitude - delta, center.latitude + delta],
        [center.longitude - delta, center.latitude - delta]
      ]]
    }
  };
}
