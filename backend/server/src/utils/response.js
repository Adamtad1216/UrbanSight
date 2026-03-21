export function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

export function sendOk(res, data, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
