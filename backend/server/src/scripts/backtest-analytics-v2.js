import fs from "node:fs";
import path from "node:path";
import { connectDB } from "../config/db.js";
import { IssueReport } from "../models/IssueReport.js";
import { getPredictionZonesV2 } from "../services/analyticsV2Service.js";

const HORIZONS = [7, 14, 30];
const LOOKBACK_DAYS = 90;
const STEP_DAYS = 7;
const GEOHASH_PRECISION = 6;
const GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
const TOP_RISK_PERCENT = 0.2;
const MIN_ACTIVITY_EVENTS = 2;
const FALLBACK_MIN_ACTIVITY_EVENTS = 1;
const RELIABILITY_MIN_ZONES = 5;

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

function calculateMetrics({ predictedPositive, actualPositive, universeSize }) {
  let tp = 0;
  for (const zoneId of predictedPositive) {
    if (actualPositive.has(zoneId)) {
      tp += 1;
    }
  }

  const fp = Math.max(predictedPositive.size - tp, 0);
  const fn = Math.max(actualPositive.size - tp, 0);

  const precision =
    predictedPositive.size > 0 ? tp / predictedPositive.size : 0;
  const recall = actualPositive.size > 0 ? tp / actualPositive.size : 0;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  const baseRate = universeSize > 0 ? actualPositive.size / universeSize : 0;
  const lift = baseRate > 0 ? precision / baseRate : 0;

  return {
    zonesEvaluated: universeSize,
    predictedPositives: predictedPositive.size,
    actualPositives: actualPositive.size,
    tp,
    fp,
    fn,
    precision,
    recall,
    f1,
    baseRate,
    lift,
  };
}

function topNCount(universeSize, fraction) {
  if (universeSize <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(universeSize * fraction));
}

function pickTopByScore(scoreEntries, count) {
  if (count <= 0 || !scoreEntries.length) {
    return { picked: new Set(), cutoffScore: 0 };
  }

  const sorted = [...scoreEntries].sort((a, b) => b.score - a.score);
  const cutoffScore =
    sorted[Math.min(count - 1, sorted.length - 1)]?.score || 0;

  return {
    picked: toSet(sorted.slice(0, count).map((entry) => entry.zoneId)),
    cutoffScore,
  };
}

function buildSummaryFromSnapshots(snapshots) {
  const average = (extractor) =>
    snapshots.length
      ? snapshots.reduce((sum, row) => sum + Number(extractor(row) || 0), 0) /
        snapshots.length
      : 0;

  const totalModelTp = snapshots.reduce((sum, row) => sum + row.model.tp, 0);
  const totalModelFp = snapshots.reduce((sum, row) => sum + row.model.fp, 0);
  const totalModelFn = snapshots.reduce((sum, row) => sum + row.model.fn, 0);
  const totalBaselineTp = snapshots.reduce(
    (sum, row) => sum + row.baseline.tp,
    0,
  );
  const totalBaselineFp = snapshots.reduce(
    (sum, row) => sum + row.baseline.fp,
    0,
  );
  const totalBaselineFn = snapshots.reduce(
    (sum, row) => sum + row.baseline.fn,
    0,
  );

  return {
    snapshots: snapshots.length,
    aggregate: {
      model: {
        tp: totalModelTp,
        fp: totalModelFp,
        fn: totalModelFn,
      },
      baseline: {
        tp: totalBaselineTp,
        fp: totalBaselineFp,
        fn: totalBaselineFn,
      },
    },
    averages: {
      model: {
        precision: Number(average((row) => row.model.precision).toFixed(4)),
        recall: Number(average((row) => row.model.recall).toFixed(4)),
        f1: Number(average((row) => row.model.f1).toFixed(4)),
        lift: Number(average((row) => row.model.lift).toFixed(4)),
        baseRate: Number(average((row) => row.model.baseRate).toFixed(4)),
        zonesEvaluated: Number(
          average((row) => row.model.zonesEvaluated).toFixed(2),
        ),
        predictedPositives: Number(
          average((row) => row.model.predictedPositives).toFixed(2),
        ),
        actualPositives: Number(
          average((row) => row.model.actualPositives).toFixed(2),
        ),
      },
      baseline: {
        precision: Number(average((row) => row.baseline.precision).toFixed(4)),
        recall: Number(average((row) => row.baseline.recall).toFixed(4)),
        f1: Number(average((row) => row.baseline.f1).toFixed(4)),
        lift: Number(average((row) => row.baseline.lift).toFixed(4)),
        baseRate: Number(average((row) => row.baseline.baseRate).toFixed(4)),
      },
      liftOverBaseline: Number(
        average((row) => row.liftOverBaseline).toFixed(4),
      ),
    },
  };
}

function calculateStabilityScore(reliableSnapshots, totalSnapshots) {
  if (totalSnapshots <= 0 || reliableSnapshots <= 0) {
    return 0;
  }

  const reliabilityCoverage = reliableSnapshots / totalSnapshots;
  const reliabilityVolume = Math.min(1, reliableSnapshots / 8);

  return Number(
    (reliabilityCoverage * 0.6 + reliabilityVolume * 0.4).toFixed(4),
  );
}

function getConfidenceLabel(stabilityScore, reliableSnapshots) {
  if (stabilityScore >= 0.7 && reliableSnapshots >= 6) {
    return "High";
  }

  if (stabilityScore >= 0.4 && reliableSnapshots >= 3) {
    return "Medium";
  }

  return "Low";
}

async function runBacktest() {
  const startedAt = Date.now();
  await connectDB();

  const now = new Date();
  const backtestStart = addDays(now, -LOOKBACK_DAYS);

  const issues = await IssueReport.find({
    createdAt: { $gte: addDays(backtestStart, -7) },
    "location.latitude": { $type: "number" },
    "location.longitude": { $type: "number" },
  })
    .select("createdAt location.latitude location.longitude")
    .lean();

  const report = {
    modelVersion: "unknown",
    generatedAt: new Date().toISOString(),
    config: {
      horizons: HORIZONS,
      lookbackDays: LOOKBACK_DAYS,
      stepDays: STEP_DAYS,
      geohashPrecision: GEOHASH_PRECISION,
      reliabilityMinZones: RELIABILITY_MIN_ZONES,
    },
    horizons: {},
  };

  const reportModelVersions = new Set();

  for (const horizonDays of HORIZONS) {
    const anchorEnd = addDays(now, -horizonDays);
    const anchorDates = [];

    for (
      let anchor = new Date(backtestStart);
      anchor <= anchorEnd;
      anchor = addDays(anchor, STEP_DAYS)
    ) {
      anchorDates.push(new Date(anchor));
    }

    const snapshots = [];
    const horizonModelVersions = new Set();

    for (const anchorDate of anchorDates) {
      const predicted = await getPredictionZonesV2({
        horizonDays,
        geohashPrecision: GEOHASH_PRECISION,
        asOf: anchorDate,
      });
      if (predicted.modelVersion) {
        horizonModelVersions.add(predicted.modelVersion);
        reportModelVersions.add(predicted.modelVersion);
      }

      const historicalByZone = new Map(
        predicted.zones.map((zone) => [zone.zoneId, zone]),
      );

      const futureWindowEnd = addDays(anchorDate, horizonDays);
      const futureIssues = issues.filter((issue) => {
        const createdAt = new Date(issue.createdAt);
        return createdAt > anchorDate && createdAt <= futureWindowEnd;
      });

      const issueCountByZone = new Map();
      for (const issue of futureIssues) {
        const lat = issue.location?.latitude;
        const lng = issue.location?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") {
          continue;
        }

        const zoneId = encodeGeohash(lat, lng, GEOHASH_PRECISION);
        issueCountByZone.set(zoneId, (issueCountByZone.get(zoneId) || 0) + 1);
      }

      const allUniverseEntries = Array.from(
        new Set([
          ...predicted.zones.map((zone) => zone.zoneId),
          ...Array.from(issueCountByZone.keys()),
        ]),
      ).map((zoneId) => {
        const historical = historicalByZone.get(zoneId);
        const historicalActivity =
          Number(historical?.issueCount || 0) +
          Number(historical?.connectionCount || 0);
        const futureActivity = Number(issueCountByZone.get(zoneId) || 0);

        return {
          zoneId,
          historical,
          historicalActivity,
          futureActivity,
        };
      });

      let effectiveMinActivityEvents = MIN_ACTIVITY_EVENTS;
      let universeEntries = allUniverseEntries.filter(
        (entry) =>
          Math.max(entry.historicalActivity, entry.futureActivity) >=
          effectiveMinActivityEvents,
      );

      if (!universeEntries.length) {
        effectiveMinActivityEvents = FALLBACK_MIN_ACTIVITY_EVENTS;
        universeEntries = allUniverseEntries.filter(
          (entry) =>
            Math.max(entry.historicalActivity, entry.futureActivity) >=
            effectiveMinActivityEvents,
        );
      }

      const universeSize = universeEntries.length;
      const positiveCount = topNCount(universeSize, TOP_RISK_PERCENT);

      const modelScores = universeEntries.map((entry) => ({
        zoneId: entry.zoneId,
        score: Number(entry.historical?.riskScore || 0),
      }));

      const baselineScores = universeEntries.map((entry) => ({
        zoneId: entry.zoneId,
        score: Number(entry.historical?.issueCount || 0),
      }));

      const actualScores = universeEntries.map((entry) => ({
        zoneId: entry.zoneId,
        score: entry.futureActivity,
      }));

      const { picked: predictedPositive, cutoffScore: modelCutoffScore } =
        pickTopByScore(modelScores, positiveCount);
      const { picked: baselinePositive, cutoffScore: baselineCutoffScore } =
        pickTopByScore(baselineScores, positiveCount);
      const { picked: actualPositive, cutoffScore: actualCutoffScore } =
        pickTopByScore(actualScores, positiveCount);

      const modelMetrics = calculateMetrics({
        predictedPositive,
        actualPositive,
        universeSize,
      });

      const baselineMetrics = calculateMetrics({
        predictedPositive: baselinePositive,
        actualPositive,
        universeSize,
      });

      const lowReliability = universeSize < RELIABILITY_MIN_ZONES;

      snapshots.push({
        anchorDate: anchorDate.toISOString(),
        thresholdPolicy: `top-${Math.round(TOP_RISK_PERCENT * 100)}%`,
        minActivityEvents: effectiveMinActivityEvents,
        lowReliability,
        zonesPredicted: predicted.zones.length,
        zonesEvaluated: universeSize,
        positivesPerClass: positiveCount,
        cutoffScores: {
          modelRiskScore: modelCutoffScore,
          baselineIssueCount: baselineCutoffScore,
          actualFutureIssueCount: actualCutoffScore,
        },
        model: modelMetrics,
        baseline: baselineMetrics,
        liftOverBaseline:
          baselineMetrics.precision > 0
            ? modelMetrics.precision / baselineMetrics.precision
            : 0,
      });
    }

    const reliableSnapshots = snapshots.filter(
      (snapshot) => !snapshot.lowReliability,
    );
    const lowReliabilitySnapshots = snapshots.length - reliableSnapshots.length;

    const overallSummary = buildSummaryFromSnapshots(snapshots);
    const reliableOnlySummary = buildSummaryFromSnapshots(reliableSnapshots);
    const insufficientData = reliableSnapshots.length === 0;
    const stabilityScore = calculateStabilityScore(
      reliableSnapshots.length,
      snapshots.length,
    );
    const confidenceLabel = getConfidenceLabel(
      stabilityScore,
      reliableSnapshots.length,
    );

    report.horizons[horizonDays] = {
      modelVersion:
        horizonModelVersions.size === 1
          ? Array.from(horizonModelVersions)[0]
          : Array.from(horizonModelVersions),
      thresholdPolicy: `top-${Math.round(TOP_RISK_PERCENT * 100)}%`,
      minActivityEvents: {
        primary: MIN_ACTIVITY_EVENTS,
        fallback: FALLBACK_MIN_ACTIVITY_EVENTS,
      },
      reliabilityPolicy: {
        lowReliabilityIfZonesEvaluatedBelow: RELIABILITY_MIN_ZONES,
      },
      snapshotCounts: {
        totalSnapshots: snapshots.length,
        reliableSnapshots: reliableSnapshots.length,
        lowReliabilitySnapshots,
      },
      stabilityScore,
      confidenceLabel,
      overall: {
        ...overallSummary,
      },
      reliableOnly: {
        ...reliableOnlySummary,
        insufficientData,
      },
      snapshots,
    };
  }

  report.modelVersion =
    reportModelVersions.size === 1
      ? Array.from(reportModelVersions)[0]
      : Array.from(reportModelVersions);

  const reportsDir = path.resolve(process.cwd(), "backend/server/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(
    reportsDir,
    `analytics-v2-backtest-${timestamp}.json`,
  );
  const latestPath = path.join(reportsDir, "analytics-v2-backtest-latest.json");

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2), "utf-8");

  const elapsedMs = Date.now() - startedAt;
  console.log(`Backtest report written: ${reportPath}`);
  console.log(`Latest report written: ${latestPath}`);
  console.log(`Backtest completed in ${elapsedMs} ms`);
}

runBacktest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Analytics v2 backtest failed:", error.message);
    process.exit(1);
  });
