import type { ComponentType } from "react";

export type Feature = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export type LandingMetrics = {
  totalRequests: number;
  totalIssues: number;
  completedServices: number;
  pendingServices: number;
  activeCitizens: number;
  activeStaff: number;
  verifiedTransactions: number;
  branchesCovered: number;
};

export type LandingTrend = {
  month: string;
  value: number;
};

export type LandingMetricsResponse = {
  metrics: LandingMetrics;
  trends: {
    monthlyIntake: LandingTrend[];
    serviceMix: Array<{ label: string; value: number }>;
  };
};
