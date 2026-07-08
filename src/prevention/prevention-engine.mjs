export class PreventionEngine {
  analyze({ incidents = [], hotspots = [], weatherBundle }) {
    const generatedAt = new Date().toISOString();
    const missingData = [
      'fuelContinuity',
      'urbanWildlandInterface',
      'cameraCoverage',
      'sensorCoverage',
      'roadNetwork',
      'waterPoints',
      'longTermIncidentHistory'
    ];
    const confidence = Math.max(0.25, Math.round((0.62 - missingData.length * 0.035) * 100) / 100);
    const features = criticalAreaFeatures({ incidents, hotspots });

    return {
      id: `prevention-${Date.now()}`,
      generatedAt,
      confidence,
      dataStatus: {
        incidentCount: incidents.length,
        hotspotCount: hotspots.length,
        lightningCount: weatherBundle?.lightning?.length || 0,
        missingData
      },
      criticalAreasGeoJson: {
        type: 'FeatureCollection',
        features
      },
      priorities: [
        {
          id: `prev-${Date.now()}-1`,
          title: 'Fuel-management strip review',
          priority: 'medium',
          confidence,
          description: 'Sugerir priorizacao analitica de faixas de gestao de combustivel perto de ocorrencias e hotspots conhecidos.',
          rationale: 'A proximidade entre ocorrencias mock e hotspots indica area candidata para triagem preventiva.',
          missingData: ['fuelContinuity', 'urbanWildlandInterface'],
          suggestedValidation: ['Validar continuidade de combustivel e exposicao a interfaces urbano-florestais']
        },
        {
          id: `prev-${Date.now()}-2`,
          title: 'Surveillance focus area',
          priority: weatherBundle?.lightning?.length ? 'high' : 'medium',
          confidence,
          description: 'Sugerir vigilancia preventiva em areas com sinais recentes de ignicao, hotspots ou lightning.',
          rationale: 'A vigilancia e tratada como prioridade analitica, nao como ordem operacional.',
          missingData: ['cameraCoverage', 'sensorCoverage', 'longTermIncidentHistory'],
          suggestedValidation: ['Comparar com historico oficial e cobertura real de vigilancia']
        },
        {
          id: `prev-${Date.now()}-3`,
          title: 'Camera and sensor candidate zone',
          priority: 'low',
          confidence,
          description: 'Sugerir avaliacao de localizacao candidata para camaras ou sensores em zonas recorrentes.',
          rationale: 'A recomendacao usa apenas proximidade mock; estudos de cobertura e permissao seriam necessarios.',
          missingData: ['viewshedAnalysis', 'powerConnectivity', 'communicationsCoverage'],
          suggestedValidation: ['Realizar analise de visibilidade, acesso, energia e comunicacoes']
        }
      ],
      reportSummary: 'Relatorio preventivo mock preparado para futura exportacao PDF/CSV/GeoJSON.'
    };
  }
}

function criticalAreaFeatures({ incidents, hotspots }) {
  const incidentFeatures = incidents.map((incident) => ({
    type: 'Feature',
    properties: {
      kind: 'prevention-incident-cluster',
      id: incident.id,
      priority: 'medium'
    },
    geometry: {
      type: 'Point',
      coordinates: [incident.location.longitude, incident.location.latitude]
    }
  }));
  const hotspotFeatures = hotspots.map((hotspot) => ({
    type: 'Feature',
    properties: {
      kind: 'prevention-hotspot',
      id: hotspot.id,
      priority: 'medium'
    },
    geometry: {
      type: 'Point',
      coordinates: [hotspot.location.longitude, hotspot.location.latitude]
    }
  }));

  return [...incidentFeatures, ...hotspotFeatures];
}
