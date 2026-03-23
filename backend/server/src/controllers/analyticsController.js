import { getPredictionZones } from "../services/analyticsService.js";
import { getPredictionZonesV2 } from "../services/analyticsV2Service.js";
import { sendError } from "../utils/response.js";

export async function getPredictionZonesAnalytics(req, res) {
  try {
    const zones = await getPredictionZones({
      precision: req.query.precision,
      lookbackDays: req.query.lookbackDays,
      minTotalCount: req.query.minTotalCount,
    });

    return res.json(zones);
  } catch (_error) {
    return sendError(res, 500, "Unable to generate prediction zones");
  }
}

export async function getPredictionZonesAnalyticsV2(req, res) {
  try {
    const result = await getPredictionZonesV2({
      horizonDays: req.query.horizon,
    });

    return res.json({
      success: true,
      zones: result.zones,
      meta: {
        modelVersion: result.modelVersion,
        horizonDays: result.horizonDays,
        zonesProcessed: result.zonesProcessed,
        computationMs: result.computationMs,
        generatedAt: result.generatedAt,
        phase2Enabled: result.phase2Enabled,
      },
    });
  } catch (_error) {
    return sendError(res, 500, "Unable to generate prediction zones v2");
  }
}
