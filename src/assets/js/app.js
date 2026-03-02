import { enhanceLoginForm } from '../../controllers/login-controller.js';
import { enhancePasswordChangeForm } from '../../controllers/password-change-form-controller.js';
import { redirectAuthenticatedUser } from '../../controllers/session-controller.js';
import { createFinalScheduleController } from '../../controllers/final-schedule-controller.js';
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

export async function bootstrapFinalScheduleApp({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch,
  viewerTimeZone,
  apiUrl = '/api/final-schedule'
} = {}) {
  if (!documentRef || typeof documentRef.querySelector !== 'function') {
    return null;
  }

  const container = documentRef.querySelector('[data-final-schedule-root]');
  if (!container) {
    return null;
  }

  const controller = createFinalScheduleController({
    container,
    fetchImpl,
    viewerTimeZone,
    apiUrl
  });

  return controller.load();
}

export function registerFinalScheduleOnLoad({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  bootstrapFn = bootstrapFinalScheduleApp
} = {}) {
  if (
    !documentRef ||
    typeof documentRef.querySelector !== 'function' ||
    typeof bootstrapFn !== 'function'
  ) {
    return;
  }

  const runIfScheduleRootExists = () => {
    if (documentRef.querySelector('[data-final-schedule-root]')) {
      void bootstrapFn({ documentRef });
    }
  };

  if (documentRef.readyState === 'loading' && windowRef && typeof windowRef.addEventListener === 'function') {
    windowRef.addEventListener('DOMContentLoaded', runIfScheduleRootExists, { once: true });
    return;
  }

  runIfScheduleRootExists();
}

export { bootstrapReviewerPaperAccessPage };
