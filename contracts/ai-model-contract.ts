import type {
  Aircraft,
  DecisionRecommendation,
  FireOccurrence,
  Hotspot,
  Incident,
  ISODateTime,
  LightningStrike,
  PropagationPrediction,
  SuppressionAction,
  WeatherForecast,
  WeatherObservation,
  Confidence,
} from './firerisk-types';

export type AIModelMode = 'mock' | 'local' | 'remote';

export type AIModelInput = {
  incident: Incident;
  occurrences?: FireOccurrence[];
  hotspots?: Hotspot[];
  weatherObservations?: WeatherObservation[];
  weatherForecasts?: WeatherForecast[];
  lightning?: LightningStrike[];
  aircraft?: Aircraft[];
  propagationPredictions?: PropagationPrediction[];
  suppressionActions?: SuppressionAction[];
  humanObservations?: string[];
  historicalContext?: unknown;
  generatedAt: ISODateTime;
};

export type AIModelFinding = {
  id: string;
  title: string;
  description: string;
  confidence: Confidence;
  evidence: string[];
  assumptions: string[];
  missingData: string[];
};

export type AIModelOutput = {
  id: string;
  mode: AIModelMode;
  generatedAt: ISODateTime;
  incidentId: string;
  behaviorAnalysis: string;
  qualitativeForecast: string;
  riskClassification: 'low' | 'moderate' | 'high' | 'extreme' | 'unknown';
  confidence: Confidence;
  findings: AIModelFinding[];
  recommendations: DecisionRecommendation[];
  uncertainty: string[];
  missingData: string[];
  explanation: string;
  raw?: unknown;
};

export type AIModelStatus = {
  mode: AIModelMode;
  healthy: boolean;
  lastRunAt?: ISODateTime;
  message?: string;
};

export interface AIModelAdapter {
  readonly id: string;
  readonly mode: AIModelMode;

  analyze(input: AIModelInput): Promise<AIModelOutput>;
  healthCheck(): Promise<AIModelStatus>;
  getStatus(): AIModelStatus;
}
