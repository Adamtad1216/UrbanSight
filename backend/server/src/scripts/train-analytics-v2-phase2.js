import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "../config/db.js";
import { IssueReport } from "../models/IssueReport.js";
import { getPredictionZonesV2 } from "../services/analyticsV2Service.js";

const HORIZONS = [7, 14, 30];
const LOOKBACK_DAYS = 180;
const STEP_DAYS = 7;
const GEOHASH_PRECISION = 6;
const POSITIVE_PERCENT = 0.2;
const SPARSE_MIN_SAMPLES = 30;
const SPARSE_MIN_UNIQUE_ZONES = 5;
const SPARSE_MIN_NEGATIVE_SAMPLES = 5;
const FEATURE_NAMES = [
  "riskScore",
  "issueCount",
  "connectionCount",
  "confidence",
  "anomalyFlag",
];

const GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
const ARTIFACT_OUTPUT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../ml/artifacts/analytics-v2-phase2-artifact.json",
);

function encodeGeohash(latitude, longitude, precision = GEOHASH_PRECISION) {
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

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toSet(values) {
  return new Set(values);
}

function topNCount(universeSize, fraction) {
  if (universeSize <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(universeSize * fraction));
}

function pickTopByScore(scoreEntries, count) {
  if (count <= 0 || !scoreEntries.length) {
    return new Set();
  }

  const sorted = [...scoreEntries].sort((a, b) => b.score - a.score);
  return toSet(sorted.slice(0, count).map((entry) => entry.zoneId));
}

function mean(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values, avg) {
  if (!values.length) {
    return 1;
  }

  const variance =
    values.reduce((sum, value) => {
      const diff = value - avg;
      return sum + diff * diff;
    }, 0) / values.length;

  return Math.sqrt(variance) || 1;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
}

function trainLogisticRegression(rows) {
  if (!rows.length) {
    return null;
  }

  const featureStats = {};
  for (const name of FEATURE_NAMES) {
    const values = rows.map((row) => Number(row.features[name] || 0));
    const avg = mean(values);
    const std = stdDev(values, avg);
    featureStats[name] = {
      mean: Number(avg.toFixed(6)),
      std: Number(std.toFixed(6)),
    };
  }

  const normalizedRows = rows.map((row) => {
    const vector = FEATURE_NAMES.map((name) => {
      const stats = featureStats[name];
      return (
        (Number(row.features[name] || 0) - stats.mean) /
        Math.max(stats.std, 1e-6)
      );
    });

    return {
      x: vector,
      y: row.label,
    };
  });

  const featureCount = FEATURE_NAMES.length;
  let weights = new Array(featureCount).fill(0);
  let intercept = 0;
  const learningRate = 0.04;
  const epochs = 700;
  const l2Reg = 0.0005;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    let gradIntercept = 0;
    const gradWeights = new Array(featureCount).fill(0);

    for (const row of normalizedRows) {
      const linear = dotProduct(weights, row.x) + intercept;
      const prediction = sigmoid(linear);
      const error = prediction - row.y;

      gradIntercept += error;
      for (let i = 0; i < featureCount; i += 1) {
        gradWeights[i] += error * row.x[i];
      }
    }

    const n = normalizedRows.length;
    intercept -= (learningRate * gradIntercept) / n;

    for (let i = 0; i < featureCount; i += 1) {
      const regTerm = l2Reg * weights[i];
      weights[i] -= (learningRate * (gradWeights[i] + regTerm)) / n;
    }
  }

  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const row of normalizedRows) {
    const linear = dotProduct(weights, row.x) + intercept;
    const prediction = sigmoid(linear) >= 0.5 ? 1 : 0;

    if (prediction === 1 && row.y === 1) tp += 1;
    if (prediction === 0 && row.y === 0) tn += 1;
    if (prediction === 1 && row.y === 0) fp += 1;
    if (prediction === 0 && row.y === 1) fn += 1;
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const accuracy = (tp + tn) / Math.max(tp + tn + fp + fn, 1);

  const weightsByFeature = {};
  FEATURE_NAMES.forEach((name, index) => {
    weightsByFeature[name] = Number(weights[index].toFixed(6));
  });

  return {
    intercept: Number(intercept.toFixed(6)),
    weights: weightsByFeature,
    featureStats,
    metrics: {
      samples: normalizedRows.length,
      positives: rows.filter((row) => row.label === 1).length,
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      accuracy: Number(accuracy.toFixed(4)),
    },
  };
}

function buildSparseDataWarning(rows) {
  const samples = rows.length;
  const positives = rows.filter((row) => row.label === 1).length;
  const negatives = Math.max(samples - positives, 0);
  const uniqueZones = new Set(rows.map((row) => row.zoneId)).size;

  const reasons = [];
  if (samples < SPARSE_MIN_SAMPLES) {
    reasons.push(`samples<${SPARSE_MIN_SAMPLES}`);
  }
  if (uniqueZones < SPARSE_MIN_UNIQUE_ZONES) {
    reasons.push(`uniqueZones<${SPARSE_MIN_UNIQUE_ZONES}`);
  }
  if (negatives < SPARSE_MIN_NEGATIVE_SAMPLES) {
    reasons.push(`negatives<${SPARSE_MIN_NEGATIVE_SAMPLES}`);
  }

  if (!reasons.length) {
    return null;
  }

  return {
    sparseData: true,
    reasons,
    samples,
    positives,
    negatives,
    uniqueZones,
  };
}

async function buildTrainingRows(horizonDays, allIssues, now) {
  const backtestStart = addDays(now, -LOOKBACK_DAYS);
  const anchorEnd = addDays(now, -horizonDays);
  const anchorDates = [];

  for (
    let anchor = new Date(backtestStart);
    anchor <= anchorEnd;
    anchor = addDays(anchor, STEP_DAYS)
  ) {
    anchorDates.push(new Date(anchor));
  }

  const rows = [];

  for (const anchorDate of anchorDates) {
    const prediction = await getPredictionZonesV2({
      horizonDays,
      geohashPrecision: GEOHASH_PRECISION,
      asOf: anchorDate,
      disablePhase2: true,
    });

    if (!prediction.zones.length) {
      continue;
    }

    const futureWindowEnd = addDays(anchorDate, horizonDays);
    const futureIssues = allIssues.filter((issue) => {
      const createdAt = new Date(issue.createdAt);
      return createdAt > anchorDate && createdAt <= futureWindowEnd;
    });

    const futureCountByZone = new Map();
    for (const issue of futureIssues) {
      const lat = issue.location?.latitude;
      const lng = issue.location?.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") {
        continue;
      }

      const zoneId = encodeGeohash(lat, lng, GEOHASH_PRECISION);
      futureCountByZone.set(zoneId, (futureCountByZone.get(zoneId) || 0) + 1);
    }

    const scoredZones = prediction.zones.map((zone) => ({
      zoneId: zone.zoneId,
      score: futureCountByZone.get(zone.zoneId) || 0,
    }));

    const positiveCount = topNCount(scoredZones.length, POSITIVE_PERCENT);
    const positiveZones = pickTopByScore(scoredZones, positiveCount);

    for (const zone of prediction.zones) {
      rows.push({
        horizonDays,
        anchorDate: anchorDate.toISOString(),
        zoneId: zone.zoneId,
        label: positiveZones.has(zone.zoneId) ? 1 : 0,
        features: {
          riskScore: Number(zone.riskScore || 0),
          issueCount: Number(zone.issueCount || 0),
          connectionCount: Number(zone.connectionCount || 0),
          confidence: Number(zone.confidence || 0),
          anomalyFlag: zone.anomalyFlag ? 1 : 0,
        },
      });
    }
  }

  return rows;
}

async function runTraining() {
  const startedAt = Date.now();
  await connectDB();

  const now = new Date();
  const issues = await IssueReport.find({
    createdAt: { $gte: addDays(now, -LOOKBACK_DAYS - 35) },
    "location.latitude": { $type: "number" },
    "location.longitude": { $type: "number" },
  })
    .select("createdAt location.latitude location.longitude")
    .lean();

  const artifact = {
    modelVersion: "v2-phase2",
    generatedAt: new Date().toISOString(),
    config: {
      horizons: HORIZONS,
      lookbackDays: LOOKBACK_DAYS,
      stepDays: STEP_DAYS,
      positivePercent: POSITIVE_PERCENT,
      geohashPrecision: GEOHASH_PRECISION,
      sparseDataThresholds: {
        minSamples: SPARSE_MIN_SAMPLES,
        minUniqueZones: SPARSE_MIN_UNIQUE_ZONES,
        minNegativeSamples: SPARSE_MIN_NEGATIVE_SAMPLES,
      },
      features: FEATURE_NAMES,
    },
    horizons: {},
  };

  for (const horizonDays of HORIZONS) {
    const rows = await buildTrainingRows(horizonDays, issues, now);
    const sparseDataWarning = buildSparseDataWarning(rows);
    const trained = trainLogisticRegression(rows);

    if (!trained) {
      artifact.horizons[String(horizonDays)] = {
        trained: false,
        reason: "No rows available",
      };
      continue;
    }

    artifact.horizons[String(horizonDays)] = {
      trained: true,
      intercept: trained.intercept,
      weights: trained.weights,
      featureStats: trained.featureStats,
      metrics: trained.metrics,
      sparseDataWarning,
    };

    if (sparseDataWarning) {
      console.warn(
        `[analytics-v2:phase2] horizon=${horizonDays} sparse-data warning: ${sparseDataWarning.reasons.join(", ")}`,
      );
    }

    console.log(
      `[analytics-v2:phase2] horizon=${horizonDays} samples=${trained.metrics.samples} precision=${trained.metrics.precision} recall=${trained.metrics.recall}`,
    );
  }

  fs.mkdirSync(path.dirname(ARTIFACT_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    ARTIFACT_OUTPUT_PATH,
    JSON.stringify(artifact, null, 2),
    "utf-8",
  );

  const elapsedMs = Date.now() - startedAt;
  console.log(`Phase 2 artifact written: ${ARTIFACT_OUTPUT_PATH}`);
  console.log(`Phase 2 training completed in ${elapsedMs} ms`);
}

runTraining()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Phase 2 training failed:", error.message);
    process.exit(1);
  });
