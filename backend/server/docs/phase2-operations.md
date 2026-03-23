# Phase 2 Operations

This document covers the operational flow for the Phase 2 analytics artifact.

## Purpose

Phase 2 adds an offline-trained artifact used by `analyticsV2Service` for blended risk scoring.

- Runtime service: `backend/server/src/services/analyticsV2Service.js`
- Trainer script: `backend/server/src/scripts/train-analytics-v2-phase2.js`
- Artifact path: `backend/server/src/ml/artifacts/analytics-v2-phase2-artifact.json`

## Train Artifact

Run from workspace root:

```bash
npm run analytics:train:v2:phase2
```

Expected outputs:

- Updated artifact JSON at `backend/server/src/ml/artifacts/analytics-v2-phase2-artifact.json`
- Console summary per horizon (7, 14, 30)
- Optional sparse-data warning when data is not representative

## Deploy Artifact

1. Ensure training completed successfully and artifact JSON is generated.
2. Include the artifact file in deployment package/image.
3. Restart backend service so runtime loads the latest artifact.
4. Validate endpoint response:
   - `GET /api/analytics/prediction-zones-v2?horizon=7`
   - Confirm `meta.modelVersion` is `v2-phase2` when artifact is active.

## Retrain Cadence

Recommended baseline cadence:

- Weekly retrain (every 7 days)
- Additional retrain after major data ingestion updates

Suggested cron-style schedule example:

- Every Sunday 02:00 local server time

## Sparse Data Guard

The trainer warns when data is too limited for meaningful training quality.

Current thresholds:

- samples >= 30
- unique zones >= 5
- negative samples >= 5

If thresholds are not met, the artifact is still written, but a `sparseDataWarning` object is added per horizon.

## Operational Checklist

- Run training command
- Check for sparse-data warnings
- Verify artifact timestamp and horizon entries
- Deploy artifact with backend
- Validate `/prediction-zones-v2` metadata in production
