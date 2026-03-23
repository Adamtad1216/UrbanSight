import { IssueReport } from "../models/IssueReport.js";
import { NewConnectionRequest } from "../models/NewConnectionRequest.js";
import { terminalIssueStatuses } from "../utils/constants.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODEL_VERSION = "v2-phase1";
const MODEL_VERSION_PHASE2 = "v2-phase2";
const ALLOWED_HORIZONS = [7, 14, 30];
const CACHE_TTL_MS = 7 * 60 * 1000;
const DEFAULT_GEOHASH_PRECISION = 6;
const PHASE2_BLEND_WEIGHT = 0.35;
const PHASE2_ARTIFACT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../ml/artifacts/analytics-v2-phase2-artifact.json",
);

const GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

let predictionZonesV2Cache = {
  key: "",
  expiresAt: 0,
  payload: null,
};

let phase2ArtifactCache = {
  loadedAt: 0,
  artifact: null,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeHorizon(value) {
  const parsed = toPositiveInteger(value, 7);
  if (!ALLOWED_HORIZONS.includes(parsed)) {
    return 7;
  }

  return parsed;
}

function normalizeAsOf(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDayKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

function getDaysAgo(now, date) {
  return (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
}

function mean(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (!values.length) {
    return 0;
  }

  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => {
      const delta = value - avg;
      return sum + delta * delta;
    }, 0) / values.length;

  return Math.sqrt(variance);
}

function encodeGeohash(
  latitude,
  longitude,
  precision = DEFAULT_GEOHASH_PRECISION,
) {
  let isEvenBit = true;
  let bit = 0;
  let charIndex = 0;
  let geohash = "";
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  while (geohash.length < precision) {
    if (isEvenBit) {
      const midpoint = (lngMin + lngMax) / 2;
      if (longitude >= midpoint) {
        charIndex = (charIndex << 1) + 1;
        lngMin = midpoint;
      } else {
        charIndex <<= 1;
        lngMax = midpoint;
      }
    } else {
      const midpoint = (latMin + latMax) / 2;
      if (latitude >= midpoint) {
        charIndex = (charIndex << 1) + 1;
        latMin = midpoint;
      } else {
        charIndex <<= 1;
        latMax = midpoint;
      }
    }

    isEvenBit = !isEvenBit;

    if (bit < 4) {
      bit += 1;
    } else {
      geohash += GEOHASH_BASE32[charIndex];
      bit = 0;
      charIndex = 0;
    }
  }

  return geohash;
}

function decodeGeohashCenter(geohash) {
  let isEvenBit = true;
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  for (const character of geohash) {
    const charIndex = GEOHASH_BASE32.indexOf(character);

    for (let mask = 16; mask >= 1; mask >>= 1) {
      if (isEvenBit) {
        const midpoint = (lngMin + lngMax) / 2;
        if (charIndex & mask) {
          lngMin = midpoint;
        } else {
          lngMax = midpoint;
        }
      } else {
        const midpoint = (latMin + latMax) / 2;
        if (charIndex & mask) {
          latMin = midpoint;
        } else {
          latMax = midpoint;
        }
      }

      isEvenBit = !isEvenBit;
    }
  }

  return {
    lat: Number(((latMin + latMax) / 2).toFixed(6)),
    lng: Number(((lngMin + lngMax) / 2).toFixed(6)),
  };
}

function buildZone(zoneId, geohashCenter) {
  return {
    zoneId,
    lat: geohashCenter.lat,
    lng: geohashCenter.lng,
    issueCount: 0,
    previousIssueCount: 0,
    openIssueCount: 0,
    connectionCount: 0,
    previousConnectionCount: 0,
    recencyScore: 0,
    dataPoints: 0,
    dailyIssueCounts: new Map(),
  };
}

function getOrCreateZone(zoneMap, zoneId, centerCache) {
  let zone = zoneMap.get(zoneId);
  if (zone) {
    return zone;
  }

  const center = centerCache.get(zoneId) || decodeGeohashCenter(zoneId);
  centerCache.set(zoneId, center);
  zone = buildZone(zoneId, center);
  zoneMap.set(zoneId, zone);
  return zone;
}

function computeConfidenceScore({
  dataPoints,
  trendStdDev,
  trendMean,
  horizonDays,
}) {
  const densityReference = horizonDays * 2;
  const densityScore = clamp(dataPoints / densityReference, 0, 1);
  const stabilityScore = clamp(1 - trendStdDev / (trendMean + 1), 0, 1);
  return Math.round((0.65 * densityScore + 0.35 * stabilityScore) * 100);
}

function computeDrivers({
  issueNorm,
  recencyNorm,
  connectionGrowthNorm,
  openRatio,
  anomalyFlag,
}) {
  const candidates = [];

  if (issueNorm >= 0.45) {
    candidates.push({ label: "High issue volume", weight: issueNorm });
  }

  if (anomalyFlag) {
    candidates.push({ label: "Recent spike", weight: 0.98 });
  }

  if (connectionGrowthNorm >= 0.45) {
    candidates.push({
      label: "Increasing connection demand",
      weight: connectionGrowthNorm,
    });
  }

  if (openRatio >= 0.5) {
    candidates.push({ label: "High open issue ratio", weight: openRatio });
  }

  if (recencyNorm >= 0.45) {
    candidates.push({ label: "Recent issue activity", weight: recencyNorm });
  }

  if (!candidates.length) {
    return ["Stable activity pattern"];
  }

  return candidates
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((entry) => entry.label);
}

function detectAnomaly({
  currentIssueCount,
  previousIssueCount,
  currentDailyRate,
  baselineMean,
  baselineStd,
}) {
  const zScore =
    baselineStd > 0 ? (currentDailyRate - baselineMean) / baselineStd : 0;
  const spikeByGrowth =
    previousIssueCount > 0 &&
    currentIssueCount >= previousIssueCount * 1.8 &&
    currentIssueCount - previousIssueCount >= 3;

  return zScore >= 2 || spikeByGrowth;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function loadPhase2Artifact() {
  const now = Date.now();
  if (phase2ArtifactCache.loadedAt > now - CACHE_TTL_MS) {
    return phase2ArtifactCache.artifact;
  }

  try {
    if (!fs.existsSync(PHASE2_ARTIFACT_PATH)) {
      phase2ArtifactCache = {
        loadedAt: now,
        artifact: null,
      };
      return null;
    }

    const raw = fs.readFileSync(PHASE2_ARTIFACT_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    phase2ArtifactCache = {
      loadedAt: now,
      artifact: parsed,
    };
    return parsed;
  } catch {
    phase2ArtifactCache = {
      loadedAt: now,
      artifact: null,
    };
    return null;
  }
}

function evaluatePhase2Probability(artifactForHorizon, featureValues) {
  if (!artifactForHorizon) {
    return null;
  }

  const weights = artifactForHorizon.weights || {};
  const featureStats = artifactForHorizon.featureStats || {};
  let linear = Number(artifactForHorizon.intercept || 0);

  for (const [featureName, rawValue] of Object.entries(featureValues)) {
    const featureWeight = Number(weights[featureName] || 0);
    const stats = featureStats[featureName] || {};
    const meanValue = Number(stats.mean || 0);
    const stdValue = Number(stats.std || 1);
    const normalized =
      (Number(rawValue) - meanValue) / Math.max(stdValue, 1e-6);
    linear += featureWeight * normalized;
  }

  return Number(sigmoid(linear).toFixed(4));
}

export async function getPredictionZonesV2(options = {}) {
  const horizonDays = normalizeHorizon(options.horizonDays);
  const geohashPrecision = toPositiveInteger(
    options.geohashPrecision,
    DEFAULT_GEOHASH_PRECISION,
  );
  const asOf = normalizeAsOf(options.asOf);
  const disablePhase2 = Boolean(options.disablePhase2);
  const phase2Artifact = disablePhase2 ? null : loadPhase2Artifact();
  const phase2ForHorizon =
    phase2Artifact?.horizons?.[String(horizonDays)] || null;
  const phase2Enabled = Boolean(phase2ForHorizon);
  const useCache = !asOf;
  const cacheKey = `${phase2Enabled ? MODEL_VERSION_PHASE2 : MODEL_VERSION}:${horizonDays}:${geohashPrecision}`;

  if (
    useCache &&
    predictionZonesV2Cache.key === cacheKey &&
    predictionZonesV2Cache.expiresAt > Date.now()
  ) {
    return predictionZonesV2Cache.payload;
  }

  const startedAt = Date.now();
  const now = asOf || new Date();
  const currentWindowStart = new Date(
    now.getTime() - horizonDays * 24 * 60 * 60 * 1000,
  );
  const previousWindowStart = new Date(
    now.getTime() - horizonDays * 2 * 24 * 60 * 60 * 1000,
  );
  const baselineWindowStart = new Date(
    now.getTime() - horizonDays * 6 * 24 * 60 * 60 * 1000,
  );

  const [issueDocs, connectionDocs] = await Promise.all([
    IssueReport.find({
      createdAt: { $gte: baselineWindowStart },
      "location.latitude": { $type: "number" },
      "location.longitude": { $type: "number" },
    })
      .select("createdAt status location.latitude location.longitude")
      .lean(),
    NewConnectionRequest.find({
      createdAt: { $gte: baselineWindowStart },
      "location.latitude": { $type: "number" },
      "location.longitude": { $type: "number" },
    })
      .select("createdAt location.latitude location.longitude")
      .lean(),
  ]);

  const zoneMap = new Map();
  const centerCache = new Map();
  const recencyHalfLifeDays = Math.max(3, horizonDays / 2);

  for (const issue of issueDocs) {
    const createdAt = new Date(issue.createdAt);
    const lat = issue.location?.latitude;
    const lng = issue.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") {
      continue;
    }

    const zoneId = encodeGeohash(lat, lng, geohashPrecision);
    const zone = getOrCreateZone(zoneMap, zoneId, centerCache);
    zone.dataPoints += 1;

    const dayKey = formatDayKey(createdAt);
    zone.dailyIssueCounts.set(
      dayKey,
      (zone.dailyIssueCounts.get(dayKey) || 0) + 1,
    );

    if (createdAt >= currentWindowStart) {
      zone.issueCount += 1;

      if (!terminalIssueStatuses.includes(issue.status)) {
        zone.openIssueCount += 1;
      }
    } else if (createdAt >= previousWindowStart) {
      zone.previousIssueCount += 1;
    }

    const ageDays = getDaysAgo(now, createdAt);
    zone.recencyScore += Math.exp(-ageDays / recencyHalfLifeDays);
  }

  for (const connection of connectionDocs) {
    const createdAt = new Date(connection.createdAt);
    const lat = connection.location?.latitude;
    const lng = connection.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") {
      continue;
    }

    const zoneId = encodeGeohash(lat, lng, geohashPrecision);
    const zone = getOrCreateZone(zoneMap, zoneId, centerCache);
    zone.dataPoints += 1;

    if (createdAt >= currentWindowStart) {
      zone.connectionCount += 1;
    } else if (createdAt >= previousWindowStart) {
      zone.previousConnectionCount += 1;
    }
  }

  const zones = Array.from(zoneMap.values()).filter(
    (zone) =>
      zone.issueCount +
        zone.connectionCount +
        zone.previousIssueCount +
        zone.previousConnectionCount >
      0,
  );

  const weightedIssueVolumes = zones.map((zone) => {
    const openRatio =
      zone.issueCount > 0 ? zone.openIssueCount / zone.issueCount : 0;
    return zone.issueCount * (1 + openRatio * 0.4);
  });
  const maxWeightedIssueVolume = Math.max(...weightedIssueVolumes, 1);
  const maxRecencyScore = Math.max(
    ...zones.map((zone) => zone.recencyScore),
    1,
  );

  const normalizedZones = zones
    .map((zone) => {
      const openRatio =
        zone.issueCount > 0 ? zone.openIssueCount / zone.issueCount : 0;
      const weightedIssueVolume = zone.issueCount * (1 + openRatio * 0.4);
      const issueNorm = clamp(
        weightedIssueVolume / maxWeightedIssueVolume,
        0,
        1,
      );
      const recencyNorm = clamp(zone.recencyScore / maxRecencyScore, 0, 1);
      const connectionGrowth =
        (zone.connectionCount - zone.previousConnectionCount) /
        Math.max(zone.previousConnectionCount, 1);
      const connectionGrowthNorm = clamp((connectionGrowth + 1) / 3, 0, 1);

      const baselineSeries = [];
      for (let dayOffset = horizonDays * 4; dayOffset >= 1; dayOffset -= 1) {
        const dayDate = new Date(
          currentWindowStart.getTime() - dayOffset * 24 * 60 * 60 * 1000,
        );
        const dayKey = formatDayKey(dayDate);
        baselineSeries.push(zone.dailyIssueCounts.get(dayKey) || 0);
      }

      const baselineMean = mean(baselineSeries);
      const baselineStd = standardDeviation(baselineSeries);
      const currentDailyRate = zone.issueCount / Math.max(horizonDays, 1);

      const anomalyFlag = detectAnomaly({
        currentIssueCount: zone.issueCount,
        previousIssueCount: zone.previousIssueCount,
        currentDailyRate,
        baselineMean,
        baselineStd,
      });

      const riskRaw =
        0.5 * issueNorm +
        0.2 * openRatio +
        0.2 * recencyNorm +
        0.1 * connectionGrowthNorm;
      const phase1RiskScore = Math.round(clamp(riskRaw, 0, 1) * 100);

      const phase2Features = {
        riskScore: phase1RiskScore,
        issueCount: zone.issueCount,
        connectionCount: zone.connectionCount,
        confidence: computeConfidenceScore({
          dataPoints: zone.dataPoints,
          trendStdDev: baselineStd,
          trendMean: baselineMean,
          horizonDays,
        }),
        anomalyFlag: anomalyFlag ? 1 : 0,
      };

      const phase2Probability = evaluatePhase2Probability(
        phase2ForHorizon,
        phase2Features,
      );
      const riskScore =
        phase2Probability == null
          ? phase1RiskScore
          : Math.round(
              clamp(
                (1 - PHASE2_BLEND_WEIGHT) * phase1RiskScore +
                  PHASE2_BLEND_WEIGHT * phase2Probability * 100,
                0,
                100,
              ),
            );

      const confidence = computeConfidenceScore({
        dataPoints: zone.dataPoints,
        trendStdDev: baselineStd,
        trendMean: baselineMean,
        horizonDays,
      });

      const zoneColor =
        riskScore >= 70
          ? "red"
          : connectionGrowth >= 0.35 && riskScore < 55
            ? "green"
            : "yellow";

      return {
        zoneId: zone.zoneId,
        lat: zone.lat,
        lng: zone.lng,
        issueCount: zone.issueCount,
        connectionCount: zone.connectionCount,
        zone: zoneColor,
        riskScore,
        confidence,
        phase2Probability,
        phase2Enabled,
        anomalyFlag,
        highRisk: riskScore >= 70 || anomalyFlag,
        drivers: computeDrivers({
          issueNorm,
          recencyNorm,
          connectionGrowthNorm,
          openRatio,
          anomalyFlag,
        }),
      };
    })
    .sort((a, b) => {
      if (b.riskScore !== a.riskScore) {
        return b.riskScore - a.riskScore;
      }

      return (
        b.issueCount + b.connectionCount - (a.issueCount + a.connectionCount)
      );
    });

  const computationMs = Date.now() - startedAt;
  const payload = {
    modelVersion: phase2Enabled ? MODEL_VERSION_PHASE2 : MODEL_VERSION,
    horizonDays,
    zonesProcessed: normalizedZones.length,
    computationMs,
    generatedAt: new Date().toISOString(),
    zones: normalizedZones,
    phase2Enabled,
  };

  console.info(
    `[analytics-v2] horizon=${horizonDays} zones=${payload.zonesProcessed} computationMs=${computationMs} asOf=${now.toISOString()}`,
  );

  if (useCache) {
    predictionZonesV2Cache = {
      key: cacheKey,
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload,
    };
  }

  return payload;
}

export function clearPredictionZonesV2Cache() {
  predictionZonesV2Cache = {
    key: "",
    expiresAt: 0,
    payload: null,
  };
}
