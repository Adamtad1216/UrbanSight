import { sendOk } from "../utils/response.js";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../services/systemSettingService.js";

export async function getSystemStatus(_req, res) {
  const settings = await getSystemSettings();
  return sendOk(res, { settings });
}

export async function getSystemSettingsForAdmin(_req, res) {
  const settings = await getSystemSettings({ forceRefresh: true });
  return sendOk(res, { settings });
}

export async function patchSystemSettings(req, res) {
  const settings = await updateSystemSettings(req.body || {}, req.user?._id);
  return sendOk(res, { settings });
}
