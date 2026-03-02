export function sendSuccess(res, status, payload) {
  return res.status(status).json(payload);
}

export function sendError(res, status, code, message, details) {
  const body = { code, message };

  if (details) {
    body.details = details;
  }

  return res.status(status).json(body);
}
