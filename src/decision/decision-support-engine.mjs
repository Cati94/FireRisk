export class DecisionSupportEngine {
  generate(input) {
    const context = normalizeContext(input);
    const recommendations = [
      progressionRecommendation(context),
      validationRecommendation(context),
      lightningRecommendation(context),
      aircraftRecommendation(context),
      dataQualityRecommendation(context)
    ].filter(Boolean);

    return recommendations.map((recommendation, index) => ({
      id: `rec-${Date.now()}-${index + 1}`,
      createdAt: new Date().toISOString(),
      source: 'heuristic',
      incidentId: context.incident?.id || 'unknown',
      ...recommendation
    }));
  }
}

function normalizeContext(input) {
  const simulation = input.simulation;
  const weather = input.weatherObservation;
  const missingData = new Set([
    ...(simulation?.missingData || []),
    ...(weather ? [] : ['weatherObservation']),
    ...(input.hotspots?.length ? [] : ['hotspots']),
    ...(input.aircraft?.length ? [] : ['aircraft']),
    'waterPoints',
    'roadNetwork',
    'sensitiveZones',
    'localHistory'
  ]);

  return {
    incident: input.incident,
    hotspots: input.hotspots || [],
    aircraft: input.aircraft || [],
    weatherObservation: weather,
    weatherBundle: input.weatherBundle,
    simulation,
    missingData: [...missingData]
  };
}

function progressionRecommendation(context) {
  const simulation = context.simulation;
  if (!simulation) {
    return null;
  }

  const priority = priorityFromIntensity(simulation.estimatedIntensity);
  const confidence = reduceConfidence(simulation.confidence, context.missingData.length);
  const direction = Math.round(simulation.dominantSpreadDirection);

  return {
    title: 'Probable progression sector review',
    category: 'resource-positioning',
    priority,
    confidence,
    description: `Sugerir avaliacao do flanco provavel de progressao, com direcao dominante aproximada de ${direction} graus.`,
    rationale: `A simulacao indica intensidade ${simulation.estimatedIntensity} e taxa estimada de ${simulation.estimatedRateOfSpread} m/min para o horizonte de ${simulation.horizonMinutes} min.`,
    assumptions: [
      'A direcao do vento observado permanece representativa durante o horizonte analisado',
      'O perimetro previsto e uma aproximacao heuristica, nao uma previsao certa'
    ],
    missingData: context.missingData,
    suggestedValidation: [
      'Confirmar vento local e comportamento observado no terreno',
      'Comparar a frente real com a zona de incerteza antes de ajustar prioridades'
    ],
    relatedGeoJson: simulation.directionGeoJson
  };
}

function validationRecommendation(context) {
  const confidence = context.simulation?.confidence ?? 0.35;
  if (confidence > 0.65 && context.missingData.length < 4) {
    return null;
  }

  return {
    title: 'Ground validation priority',
    category: 'ground-validation',
    priority: context.missingData.length > 5 ? 'high' : 'medium',
    confidence: reduceConfidence(confidence, context.missingData.length),
    description: 'Prioridade provavel para confirmacao no terreno antes de usar a estimativa em planeamento.',
    rationale: 'A confianca analitica esta limitada por dados em falta ou por pressupostos da simulacao simplificada.',
    assumptions: [
      'A validacao local pode alterar a interpretacao da simulacao',
      'Os dados mock ou incompletos reduzem a robustez da recomendacao'
    ],
    missingData: context.missingData,
    suggestedValidation: [
      'Confirmar localizacao, perimetro ou frente ativa',
      'Recolher informacao de combustivel, declive e acessos'
    ],
    relatedGeoJson: context.simulation?.uncertaintyGeoJson
  };
}

function lightningRecommendation(context) {
  const lightning = context.weatherBundle?.lightning || [];
  if (!lightning.length) {
    return null;
  }

  return {
    title: 'Lightning-related ignition watch',
    category: 'lightning-risk',
    priority: lightning.length > 3 ? 'high' : 'medium',
    confidence: reduceConfidence(0.72, context.missingData.length),
    description: 'Sugerir reforco de vigilancia analitica para ignicoes secundarias associadas a lightning recente.',
    rationale: `Foram observadas ${lightning.length} ocorrencias de lightning no pacote meteorologico atual.`,
    assumptions: [
      'Os registos de lightning mock ou reais sao espacialmente relevantes para a area analisada',
      'A disponibilidade de equipas e acessos nao foi avaliada'
    ],
    missingData: context.missingData.filter((item) => item !== 'hotspots'),
    suggestedValidation: [
      'Confirmar ocorrencias novas por observacao local ou fonte oficial',
      'Comparar pontos de lightning com hotspots e chamadas recebidas'
    ],
    relatedGeoJson: {
      type: 'FeatureCollection',
      features: lightning.map((strike) => ({
        type: 'Feature',
        properties: { id: strike.id, source: strike.source },
        geometry: {
          type: 'Point',
          coordinates: [strike.location.longitude, strike.location.latitude]
        }
      }))
    }
  };
}

function aircraftRecommendation(context) {
  if (!context.aircraft.length) {
    return {
      title: 'Known aircraft data unavailable',
      category: 'aerial-recon',
      priority: 'low',
      confidence: 0.32,
      description: 'Dados insuficientes para avaliar meios aereos conhecidos com confianca.',
      rationale: 'Nao ha posicoes de aeronaves disponiveis no contexto atual.',
      assumptions: ['A ausencia de dados nao significa ausencia de meios no terreno'],
      missingData: ['aircraft'],
      suggestedValidation: ['Confirmar meios disponiveis em fonte operacional autorizada']
    };
  }

  return {
    title: 'Aerial reconnaissance context available',
    category: 'aerial-recon',
    priority: 'medium',
    confidence: reduceConfidence(0.62, context.missingData.length),
    description: 'Sugerir avaliacao de reconhecimento aereo apenas como apoio a validacao visual da simulacao.',
    rationale: `${context.aircraft.length} posicoes mock/conhecidas de aeronaves estao disponiveis para contexto espacial.`,
    assumptions: [
      'As posicoes de aeronaves podem estar atrasadas',
      'A decisao operacional depende de autoridade e condicoes locais'
    ],
    missingData: context.missingData,
    suggestedValidation: [
      'Confirmar atualidade das posicoes de aeronaves',
      'Validar condicoes de visibilidade e seguranca antes de interpretar observacoes'
    ]
  };
}

function dataQualityRecommendation(context) {
  if (context.missingData.length < 5) {
    return null;
  }

  return {
    title: 'Insufficient data warning',
    category: 'insufficient-data',
    priority: 'medium',
    confidence: 0.9,
    description: 'Dados insuficientes para estimar comportamento com confianca elevada.',
    rationale: `O contexto atual tem dados em falta: ${context.missingData.join(', ')}.`,
    assumptions: ['A recomendacao prioriza transparencia sobre certeza aparente'],
    missingData: context.missingData,
    suggestedValidation: [
      'Adicionar fontes de combustivel, declive, acessos, pontos sensiveis e historico local',
      'Repetir a analise depois de atualizar os dados de entrada'
    ]
  };
}

function priorityFromIntensity(intensity) {
  if (intensity === 'extreme') return 'critical';
  if (intensity === 'high') return 'high';
  if (intensity === 'moderate') return 'medium';
  return 'low';
}

function reduceConfidence(base, missingCount) {
  return Math.round(Math.max(0.15, Number(base || 0.4) - missingCount * 0.035) * 100) / 100;
}
