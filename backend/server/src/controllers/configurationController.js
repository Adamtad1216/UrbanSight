import { Configuration } from "../models/Configuration.js";
import { sendError, sendOk } from "../utils/response.js";

const CONFIG_KEY = "global";

const DEFAULT_CONFIGURATION = {
  workflow: {
    requiredTechniciansForCompletion: 2,
    autoAssignSurveyor: true,
    autoAssignTechnicians: true,
    autoAssignMeterReader: true,
  },
  payments: {
    requireReceiptUpload: true,
    allowResubmissionAfterRejection: true,
    supportedMethods: [],
  },
  tools: {
    maxImportFileSizeMb: 5,
    updateDuplicateCodeOnImport: true,
  },
  notifications: {
    notifyCitizenOnStatusChange: true,
    notifyAssigneeOnAutoAssignment: true,
  },
  citizenPortal: {
    showAssignedMeterReaderInfo: true,
  },
};

function mergeConfig(base, override) {
  return {
    workflow: {
      ...base.workflow,
      ...(override?.workflow || {}),
    },
    payments: {
      ...base.payments,
      ...(override?.payments || {}),
    },
    tools: {
      ...base.tools,
      ...(override?.tools || {}),
    },
    notifications: {
      ...base.notifications,
      ...(override?.notifications || {}),
    },
    citizenPortal: {
      ...base.citizenPortal,
      ...(override?.citizenPortal || {}),
    },
  };
}

function normalizeMethods(methods = []) {
  const unique = new Set(
    methods
      .map((method) => String(method || "").trim())
      .filter(Boolean),
  );

  return [...unique];
}

export async function getConfiguration(_req, res) {
  try {
    const doc = await Configuration.findOne({ key: CONFIG_KEY }).lean();
    const configuration = mergeConfig(DEFAULT_CONFIGURATION, doc);

    return sendOk(res, { configuration });
  } catch (error) {
    return sendError(res, 500, error?.message || "Failed to load configuration");
  }
}

export async function updateConfiguration(req, res) {
  try {
    const payload = req.body;

    if (payload?.payments?.supportedMethods) {
      payload.payments.supportedMethods = normalizeMethods(
        payload.payments.supportedMethods,
      );
    }

    const existing = await Configuration.findOne({ key: CONFIG_KEY }).lean();
    const nextConfiguration = mergeConfig(
      mergeConfig(DEFAULT_CONFIGURATION, existing),
      payload,
    );

    const doc = await Configuration.findOneAndUpdate(
      { key: CONFIG_KEY },
      {
        $set: {
          key: CONFIG_KEY,
          ...nextConfiguration,
        },
      },
      {
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        returnDocument: "after",
      },
    ).lean();

    const configuration = mergeConfig(DEFAULT_CONFIGURATION, doc);
    return sendOk(res, { configuration });
  } catch (error) {
    return sendError(res, 500, error?.message || "Failed to update configuration");
  }
}
