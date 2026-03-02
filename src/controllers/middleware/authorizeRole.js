import { sendError } from '../http/responses.js';

export default function authorizeRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role || !roles.includes(role)) {
      return sendError(res, 403, 'FORBIDDEN', 'You are not authorized to access this resource.');
    }

    return next();
  };
}
