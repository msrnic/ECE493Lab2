import { enhanceLoginForm } from '../../controllers/login-controller.js';
import { enhancePasswordChangeForm } from '../../controllers/password-change-form-controller.js';
import { redirectAuthenticatedUser } from '../../controllers/session-controller.js';
import { bootstrapReviewerPaperAccessPage } from './reviewer-paper-access-page.js';

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

export function bootstrapPasswordChangePage({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch
} = {}) {
  const enhanced = enhancePasswordChangeForm({
    documentRef,
    fetchImpl
  });

  return {
    enhanced: Boolean(enhanced)
  };
}

export { bootstrapReviewerPaperAccessPage };
