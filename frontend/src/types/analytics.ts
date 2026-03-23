export type ZoneColor = "red" | "green" | "yellow";

export interface PredictionZone {
  zoneId?: string;
  lat: number;
  lng: number;
  issueCount: number;
  connectionCount: number;
  zone: ZoneColor;
  riskScore?: number;
  confidence?: number;
  drivers?: string[];
  anomalyFlag?: boolean;
  modelVersion?: string;
  horizonDays?: number;
  highRisk?: boolean;
  phase2Probability?: number | null;
  phase2Enabled?: boolean;
  trend?: {
    currentIssueCount: number;
    previousIssueCount: number;
  };
}

export interface PredictionZonesResponse {
  success: boolean;
  zones: PredictionZone[];
}

export interface PredictionZonesV2Response {
  success: boolean;
  zones: PredictionZone[];
  meta: {
    modelVersion: string;
    horizonDays: number;
    zonesProcessed: number;
    computationMs: number;
    generatedAt: string;
    phase2Enabled?: boolean;
  };
}
