import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { defaultMetrics, defaultMonthly } from "./data";
import type {
  LandingMetrics,
  LandingMetricsResponse,
  LandingTrend,
} from "./types";

export function useLandingMetrics() {
  const [metrics, setMetrics] = useState<LandingMetrics>(defaultMetrics);
  const [monthly, setMonthly] = useState<LandingTrend[]>(defaultMonthly);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMetrics() {
      try {
        const response = await apiRequest<LandingMetricsResponse>(
          "/public/landing-metrics",
        );

        if (!isMounted) {
          return;
        }

        setMetrics(response.metrics);
        setMonthly(
          response.trends.monthlyIntake.length > 0
            ? response.trends.monthlyIntake
            : defaultMonthly,
        );
        setIsLive(true);
      } catch {
        if (!isMounted) {
          return;
        }

        setMetrics(defaultMetrics);
        setMonthly(defaultMonthly);
        setIsLive(false);
      }
    }

    loadMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  return { metrics, monthly, isLive };
}
