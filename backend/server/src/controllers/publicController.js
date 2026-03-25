import { buildLandingMetrics } from "../services/publicMetricsService.js";
import { sendOk } from "../utils/response.js";

export async function getLandingMetrics(_req, res) {
  const payload = await buildLandingMetrics();
  return sendOk(res, payload);
}
