import { BaseAIModelAdapter } from './base-ai-model-adapter.mjs';

export class MockAIModelAdapter extends BaseAIModelAdapter {
  constructor() {
    super({ id: 'ai-mock', mode: 'mock', enabled: true });
    this.setStatus({
      healthy: true,
      health: 'healthy',
      message: 'Mock AI model ready'
    });
  }

  async analyze(input) {
    const simulation = input.propagationPredictions?.[0];
    const weather = input.weatherObservations?.[0];
    const missingData = [
      ...(simulation?.missingData || []),
      ...(input.historicalContext ? [] : ['historicalContext']),
      ...(input.suppressionActions?.length ? [] : ['suppressionActions']),
      ...(input.humanObservations?.length ? [] : ['humanObservations']),
      'cameraImagery',
      'uavImagery'
    ];
    const riskClassification = riskFromSimulation(simulation, weather);
    const confidence = Math.max(0.2, Math.round(((simulation?.confidence ?? 0.5) - missingData.length * 0.025) * 100) / 100);
    const generatedAt = new Date().toISOString();

    const output = {
      id: `ai-${Date.now()}`,
      mode: this.mode,
      generatedAt,
      incidentId: input.incident?.id || 'unknown',
      behaviorAnalysis: `Mock AI analysis indicates ${riskClassification} qualitative fire-behavior concern based on wind, humidity, and the current simulation envelope.`,
      qualitativeForecast: 'If observed wind and dry conditions persist, the most relevant uncertainty remains the downwind flank and unvalidated fuel/slope context.',
      riskClassification,
      confidence,
      findings: [
        {
          id: `finding-${Date.now()}-1`,
          title: 'Simulation-driven spread signal',
          description: 'The simulated direction and uncertainty envelope are the strongest current analytical signals.',
          confidence,
          evidence: [
            `Estimated spread rate: ${simulation?.estimatedRateOfSpread ?? 'unknown'} m/min`,
            `Estimated intensity: ${simulation?.estimatedIntensity ?? 'unknown'}`
          ],
          assumptions: [
            'The latest simulation is representative of the current incident state',
            'Weather observations are recent enough for qualitative assessment'
          ],
          missingData
        }
      ],
      recommendations: [
        {
          id: `ai-rec-${Date.now()}-1`,
          incidentId: input.incident?.id || 'unknown',
          title: 'AI-assisted validation focus',
          category: 'ground-validation',
          priority: riskClassification === 'high' || riskClassification === 'extreme' ? 'high' : 'medium',
          confidence,
          description: 'Sugerir confirmacao assistiva da zona de maior incerteza antes de interpretar a previsao como robusta.',
          rationale: 'A analise IA mock combina simulacao, meteorologia e dados em falta para destacar a area mais incerta.',
          assumptions: ['A IA fornece apoio analitico e nao ordem operacional'],
          missingData,
          suggestedValidation: [
            'Confirmar comportamento observado no terreno',
            'Atualizar combustivel, declive e observacoes humanas quando disponiveis'
          ],
          createdAt: generatedAt,
          source: 'ai-mock',
          relatedGeoJson: simulation?.uncertaintyGeoJson
        }
      ],
      uncertainty: [
        'Mock model output is deterministic and should not be treated as calibrated prediction',
        'Missing fuel, slope, historical, human-observation, image, and UAV data can materially alter interpretation'
      ],
      missingData,
      explanation: 'This mock adapter follows the AIModelAdapter contract and produces advisory analysis from normalized FireRisk context.',
      raw: { mock: true }
    };

    this.setStatus({
      healthy: true,
      health: 'healthy',
      lastRunAt: generatedAt,
      message: 'Mock AI analysis generated'
    });
    return output;
  }
}

function riskFromSimulation(simulation, weather) {
  if (simulation?.estimatedIntensity === 'extreme') return 'extreme';
  if (simulation?.estimatedIntensity === 'high') return 'high';
  if ((weather?.relativeHumidityPct ?? 100) < 25 && (weather?.windGustKph ?? 0) > 35) return 'high';
  if (simulation?.estimatedIntensity === 'moderate') return 'moderate';
  return 'low';
}
