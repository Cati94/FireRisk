// FireRisk core domain types
// These contracts are intentionally framework-agnostic.

export type ISODateTime = string;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type GeoJsonFeature = GeoJSON.Feature;
export type GeoJsonFeatureCollection = GeoJSON.FeatureCollection;

export type Confidence = number; // 0..1

export type ProviderHealth = 'healthy' | 'degraded' | 'offline' | 'unknown';

export type DataFreshness = 'fresh' | 'stale' | 'expired' | 'unknown';

export type IncidentStatus =
  | 'reported'
  | 'active'
  | 'monitoring'
  | 'controlled'
  | 'resolved'
  | 'unknown';

export type Incident = {
  id: string;
  name?: string;
  status: IncidentStatus;
  location: Coordinates;
  startedAt?: ISODateTime;
  updatedAt: ISODateTime;
  source: string;
  confidence?: Confidence;
  perimeterGeoJson?: GeoJsonFeature | GeoJsonFeatureCollection;
  notes?: string[];
};

export type FireOccurrence = {
  id: string;
  incidentId?: string;
  location: Coordinates;
  municipality?: string;
  parish?: string;
  district?: string;
  status?: IncidentStatus;
  startedAt?: ISODateTime;
  updatedAt?: ISODateTime;
  source: string;
  raw?: unknown;
};

export type Hotspot = {
  id: string;
  location: Coordinates;
  detectedAt: ISODateTime;
  source: 'NASA_FIRMS' | string;
  satellite?: string;
  confidence?: Confidence;
  brightness?: number;
  frp?: number;
  raw?: unknown;
};

export type AircraftType =
  | 'helicopter'
  | 'fixed-wing'
  | 'air-tanker'
  | 'reconnaissance'
  | 'unknown';

export type Aircraft = {
  id: string;
  callsign?: string;
  type: AircraftType;
  location: Coordinates;
  heading?: number;
  altitudeMeters?: number;
  speedKph?: number;
  updatedAt: ISODateTime;
  source: string;
  raw?: unknown;
};

export type WeatherObservation = {
  id: string;
  stationId?: string;
  stationName?: string;
  location?: Coordinates;
  observedAt: ISODateTime;
  freshness: DataFreshness;
  temperatureC?: number;
  relativeHumidityPct?: number;
  windDirectionDeg?: number;
  windSpeedKph?: number;
  windGustKph?: number;
  pressureHpa?: number;
  precipitationMm?: number;
  source: string;
  confidence?: Confidence;
  raw?: unknown;
};

export type WeatherForecast = {
  id: string;
  location: Coordinates;
  issuedAt: ISODateTime;
  validFrom: ISODateTime;
  validTo: ISODateTime;
  temperatureC?: number;
  relativeHumidityPct?: number;
  windDirectionDeg?: number;
  windSpeedKph?: number;
  windGustKph?: number;
  precipitationProbabilityPct?: number;
  precipitationMm?: number;
  source: string;
  confidence?: Confidence;
  raw?: unknown;
};

export type WindField = {
  id: string;
  validAt: ISODateTime;
  features: GeoJsonFeatureCollection;
  source: string;
  confidence?: Confidence;
};

export type LightningStrike = {
  id: string;
  location: Coordinates;
  detectedAt: ISODateTime;
  polarity?: number;
  amplitudeKa?: number;
  source: string;
  confidence?: Confidence;
  raw?: unknown;
};

export type TerrainCell = {
  id: string;
  location: Coordinates;
  elevationMeters?: number;
  slopeDeg?: number;
  aspectDeg?: number;
  source?: string;
  confidence?: Confidence;
};

export type FuelModel = {
  id: string;
  name: string;
  description?: string;
  load?: number;
  continuity?: 'low' | 'medium' | 'high' | 'unknown';
  moisture?: number;
  source?: string;
  confidence?: Confidence;
};

export type FireFront = {
  id: string;
  incidentId: string;
  observedAt: ISODateTime;
  geometry: GeoJsonFeature | GeoJsonFeatureCollection;
  source: string;
  confidence?: Confidence;
};

export type PropagationPrediction = {
  id: string;
  incidentId: string;
  generatedAt: ISODateTime;
  horizonMinutes: number;
  predictedPerimeterGeoJson: GeoJsonFeature | GeoJsonFeatureCollection;
  uncertaintyGeoJson?: GeoJsonFeature | GeoJsonFeatureCollection;
  dominantSpreadDirectionDeg?: number;
  estimatedRateOfSpreadMPerMin?: number;
  estimatedIntensity?: 'low' | 'moderate' | 'high' | 'extreme' | 'unknown';
  confidence: Confidence;
  assumptions: string[];
  missingData: string[];
  warnings: string[];
};

export type SuppressionAction = {
  id: string;
  incidentId: string;
  type:
    | 'ground-attack'
    | 'aerial-drop'
    | 'reconnaissance'
    | 'containment-line'
    | 'backburn'
    | 'monitoring'
    | 'unknown';
  location?: Coordinates;
  geometry?: GeoJsonFeature | GeoJsonFeatureCollection;
  startedAt?: ISODateTime;
  endedAt?: ISODateTime;
  source: string;
  notes?: string[];
};

export type DecisionCategory =
  | 'monitoring'
  | 'initial-attack'
  | 'resource-reinforcement'
  | 'resource-positioning'
  | 'sensitive-point-protection'
  | 'crew-safety'
  | 'lightning-risk'
  | 'rekindle-risk'
  | 'weather-window'
  | 'aerial-recon'
  | 'ground-validation'
  | 'insufficient-data';

export type DecisionPriority = 'low' | 'medium' | 'high' | 'critical';

export type DecisionRecommendation = {
  id: string;
  incidentId: string;
  title: string;
  category: DecisionCategory;
  priority: DecisionPriority;
  confidence: Confidence;
  description: string;
  rationale: string;
  assumptions: string[];
  missingData: string[];
  suggestedValidation: string[];
  createdAt: ISODateTime;
  relatedGeoJson?: GeoJsonFeature | GeoJsonFeatureCollection;
  source: 'heuristic' | 'ai' | 'hybrid' | string;
};

export type OperationalRisk = {
  id: string;
  incidentId: string;
  type:
    | 'rapid-spread'
    | 'wind-shift'
    | 'spotting'
    | 'lightning'
    | 'crew-safety'
    | 'interface-risk'
    | 'rekindle'
    | 'unknown';
  severity: DecisionPriority;
  confidence: Confidence;
  description: string;
  createdAt: ISODateTime;
  relatedGeoJson?: GeoJsonFeature | GeoJsonFeatureCollection;
};

export type PostFireAssessment = {
  id: string;
  incidentId?: string;
  perimeterGeoJson: GeoJsonFeature | GeoJsonFeatureCollection;
  assessedAt: ISODateTime;
  estimatedSeverity?: 'low' | 'moderate' | 'high' | 'mixed' | 'unknown';
  erosionRisk?: DecisionPriority;
  runoffRisk?: DecisionPriority;
  confidence: Confidence;
  assumptions: string[];
  missingData: string[];
};

export type RecoveryTask = {
  id: string;
  assessmentId: string;
  title: string;
  priority: DecisionPriority;
  description: string;
  location?: Coordinates;
  geometry?: GeoJsonFeature | GeoJsonFeatureCollection;
  confidence: Confidence;
};

export type PreventionMeasure = {
  id: string;
  title: string;
  priority: DecisionPriority;
  description: string;
  geometry?: GeoJsonFeature | GeoJsonFeatureCollection;
  confidence: Confidence;
  assumptions: string[];
  missingData: string[];
};
