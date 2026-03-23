import { IssueReport } from "../models/IssueReport.js";
import { NewConnectionRequest } from "../models/NewConnectionRequest.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_LOOKBACK_DAYS = 120;
const DEFAULT_PRECISION = 2;
const DEFAULT_MIN_TOTAL = 1;
const TREND_WINDOW_DAYS = 7;

let predictionZonesCache = {
  key: "",
  expiresAt: 0,
  zones: [],
};

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizePrecision(value) {
  const parsed = toPositiveInteger(value, DEFAULT_PRECISION);
  return Math.min(Math.max(parsed, 1), 4);
}

function buildZoneKey(lat, lng, precision) {
  return `${Number(lat).toFixed(precision)}:${Number(lng).toFixed(precision)}`;
}

function buildLocationMatch(createdAtGte) {
  return {
    createdAt: { $gte: createdAtGte },
    "location.latitude": { $type: "number" },
    "location.longitude": { $type: "number" },
  };
}

async function aggregateZoneCounts(Model, precision, createdAtGte) {
  return Model.aggregate([
    { $match: buildLocationMatch(createdAtGte) },
    {
      $project: {
        lat: { $round: ["$location.latitude", precision] },
        lng: { $round: ["$location.longitude", precision] },
      },
    },
    {
      $group: {
        _id: {
          lat: "$lat",
          lng: "$lng",
        },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        lat: "$_id.lat",
        lng: "$_id.lng",
        count: 1,
      },
    },
  ]);
}

async function aggregateIssueTrendCounts(
  precision,
  previousWindowStart,
  currentWindowStart,
) {
  const rows = await IssueReport.aggregate([
    {
      $match: {
        createdAt: { $gte: previousWindowStart },
        "location.latitude": { $type: "number" },
        "location.longitude": { $type: "number" },
      },
    },
    {
      $project: {
        lat: { $round: ["$location.latitude", precision] },
        lng: { $round: ["$location.longitude", precision] },
        period: {
          $cond: [
            { $gte: ["$createdAt", currentWindowStart] },
            "current",
            "previous",
          ],
        },
      },
    },
    {
      $group: {
        _id: {
          lat: "$lat",
          lng: "$lng",
          period: "$period",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const trendByZone = new Map();

  for (const row of rows) {
    const key = buildZoneKey(row._id.lat, row._id.lng, precision);
    const currentEntry = trendByZone.get(key) || {
      currentIssueCount: 0,
      previousIssueCount: 0,
    };

    if (row._id.period === "current") {
      currentEntry.currentIssueCount = row.count;
    } else {
      currentEntry.previousIssueCount = row.count;
    }

    trendByZone.set(key, currentEntry);
  }

  return trendByZone;
}

function percentile75(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((sorted.length - 1) * 0.75);
  return sorted[index];
}

function calculateHighThreshold(values) {
  const dynamicThreshold = percentile75(values);
  return Math.max(3, dynamicThreshold);
}

function classifyZone(
  issueCount,
  connectionCount,
  issueThreshold,
  connectionThreshold,
) {
  const dominatesIssue = issueCount >= connectionCount * 1.2;
  const dominatesConnection = connectionCount >= issueCount * 1.2;

  if (issueCount >= issueThreshold && dominatesIssue) {
    return "red";
  }

  if (connectionCount >= connectionThreshold && dominatesConnection) {
    return "green";
  }

  return "yellow";
}

function isHighRisk(currentIssueCount, previousIssueCount) {
  if (previousIssueCount <= 0) {
    return currentIssueCount >= 3;
  }

  return (
    currentIssueCount > previousIssueCount * 1.2 &&
    currentIssueCount - previousIssueCount >= 2
  );
}

export async function getPredictionZones(options = {}) {
  const precision = normalizePrecision(options.precision);
  const lookbackDays = toPositiveInteger(
    options.lookbackDays,
    DEFAULT_LOOKBACK_DAYS,
  );
  const minTotalCount = toPositiveInteger(
    options.minTotalCount,
    DEFAULT_MIN_TOTAL,
  );
  const cacheKey = `${precision}:${lookbackDays}:${minTotalCount}`;

  if (
    predictionZonesCache.key === cacheKey &&
    predictionZonesCache.expiresAt > Date.now()
  ) {
    return predictionZonesCache.zones;
  }

  const now = new Date();
  const lookbackStart = new Date(
    now.getTime() - lookbackDays * 24 * 60 * 60 * 1000,
  );
  const currentWindowStart = new Date(
    now.getTime() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const previousWindowStart = new Date(
    now.getTime() - TREND_WINDOW_DAYS * 2 * 24 * 60 * 60 * 1000,
  );

  const [issueZones, connectionZones, issueTrendByZone] = await Promise.all([
    aggregateZoneCounts(IssueReport, precision, lookbackStart),
    aggregateZoneCounts(NewConnectionRequest, precision, lookbackStart),
    aggregateIssueTrendCounts(
      precision,
      previousWindowStart,
      currentWindowStart,
    ),
  ]);

  const zoneMap = new Map();

  for (const zone of issueZones) {
    const key = buildZoneKey(zone.lat, zone.lng, precision);
    zoneMap.set(key, {
      lat: zone.lat,
      lng: zone.lng,
      issueCount: zone.count,
      connectionCount: 0,
    });
  }

  for (const zone of connectionZones) {
    const key = buildZoneKey(zone.lat, zone.lng, precision);
    const existing = zoneMap.get(key);
    if (existing) {
      existing.connectionCount = zone.count;
      continue;
    }

    zoneMap.set(key, {
      lat: zone.lat,
      lng: zone.lng,
      issueCount: 0,
      connectionCount: zone.count,
    });
  }

  const mergedZones = Array.from(zoneMap.values()).filter(
    (zone) => zone.issueCount + zone.connectionCount >= minTotalCount,
  );

  const issueThreshold = calculateHighThreshold(
    mergedZones.map((zone) => zone.issueCount),
  );
  const connectionThreshold = calculateHighThreshold(
    mergedZones.map((zone) => zone.connectionCount),
  );

  const zones = mergedZones
    .map((zone) => {
      const key = buildZoneKey(zone.lat, zone.lng, precision);
      const trend = issueTrendByZone.get(key) || {
        currentIssueCount: 0,
        previousIssueCount: 0,
      };

      return {
        ...zone,
        zone: classifyZone(
          zone.issueCount,
          zone.connectionCount,
          issueThreshold,
          connectionThreshold,
        ),
        highRisk: isHighRisk(trend.currentIssueCount, trend.previousIssueCount),
        trend,
      };
    })
    .sort(
      (a, b) =>
        b.issueCount + b.connectionCount - (a.issueCount + a.connectionCount),
    );

  predictionZonesCache = {
    key: cacheKey,
    expiresAt: Date.now() + CACHE_TTL_MS,
    zones,
  };

  return zones;
}

export function clearPredictionZonesCache() {
  predictionZonesCache = {
    key: "",
    expiresAt: 0,
    zones: [],
  };
}
