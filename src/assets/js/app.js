import { enhanceLoginForm } from '../../controllers/login-controller.js';
import { redirectAuthenticatedUser } from '../../controllers/session-controller.js';

export async function bootstrapLoginPage({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch,
  locationRef = globalThis.location
} = {}) {
  const enhanced = enhanceLoginForm({
    documentRef,
    fetchImpl,
    locationRef
  });

  if (!enhanced) {
    return {
      enhanced: false,
      redirected: false
    };
  }

  const redirectResult = await redirectAuthenticatedUser({
    fetchImpl,
    locationRef
  });

  return {
    enhanced: true,
    redirected: redirectResult.redirected
  };
}
