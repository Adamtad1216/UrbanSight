import { Configuration } from "../models/Configuration.js";
import {
  DEFAULT_CONFIGURATION,
  mergeConfiguration,
} from "../config/defaultConfiguration.js";
import { sendError, sendOk } from "../utils/response.js";

const CONFIG_KEY = "global";

function normalizeMethods(methods = []) {
  const unique = new Set(
    methods.map((method) => String(method || "").trim()).filter(Boolean),
  );

  return [...unique];
}

export async function getConfiguration(_req, res) {
  try {
    const doc = await Configuration.findOne({ key: CONFIG_KEY }).lean();
    const configuration = mergeConfiguration(DEFAULT_CONFIGURATION, doc);

    return sendOk(res, { configuration });
  } catch (error) {
    return sendError(
      res,
      500,
      error?.message || "Failed to load configuration",
    );
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
    const nextConfiguration = mergeConfiguration(
      mergeConfiguration(DEFAULT_CONFIGURATION, existing),
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

    const configuration = mergeConfiguration(DEFAULT_CONFIGURATION, doc);
    return sendOk(res, { configuration });
  } catch (error) {
    return sendError(
      res,
      500,
      error?.message || "Failed to update configuration",
    );
  }
}
