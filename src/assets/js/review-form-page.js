import {
  clearReviewFormFeedback,
  hydrateReviewForm,
  readReviewFormValues,
  renderValidationFeedback,
  resolveReviewAssignmentId,
  setReviewFormStatus
} from '../../views/review-form-view.js';

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function requestJson(fetchImpl, url, options) {
  try {
    const response = await fetchImpl(url, options);
    return {
      ok: response.ok,
      status: response.status,
      payload: await readJsonSafe(response)
    };
  } catch {
    return {
      ok: false,
      status: 0,
      payload: {
        message: 'Request failed.'
      }
    };
  }
}

function getErrorMessage(response, fallbackMessage) {
  const payloadMessage = String(response?.payload?.message ?? '').trim();
  return payloadMessage || fallbackMessage;
}

export function createReviewSubmissionApi({
  fetchImpl = globalThis.fetch,
  assignmentId
} = {}) {
  const encodedAssignmentId = encodeURIComponent(assignmentId);
  const statusUrl = `/api/reviewer-assignments/${encodedAssignmentId}/review-status`;
  const submissionUrl = `/api/reviewer-assignments/${encodedAssignmentId}/review-submissions`;

  return {
    getStatus() {
      return requestJson(fetchImpl, statusUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });
    },
    submitReview(payload) {
      return requestJson(fetchImpl, submissionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }
  };
}

export function bootstrapReviewFormPage({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch
} = {}) {
  const form = documentRef?.querySelector?.('[data-review-form]');
  const statusNode = documentRef?.querySelector?.('[data-review-form-status]');
  const errorsNode = documentRef?.querySelector?.('[data-review-form-errors]');

  if (!form || !statusNode || !errorsNode) {
    return {
      enhanced: false
    };
  }

  const assignmentId = resolveReviewAssignmentId({ documentRef });
  if (!assignmentId) {
    setReviewFormStatus(statusNode, {
      type: 'error',
      message: 'Assignment ID is missing.'
    });

    return {
      enhanced: false
    };
  }

  const api = createReviewSubmissionApi({
    fetchImpl,
    assignmentId
  });

  void api.getStatus()
    .then((response) => {
      if (response.ok && response.payload?.status === 'COMPLETED') {
        setReviewFormStatus(statusNode, {
          type: 'info',
          message: 'A completed review already exists for this assignment.'
        });
      }
    })
    .catch(() => {});

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    clearReviewFormFeedback(form, errorsNode);
    setReviewFormStatus(statusNode, {
      type: 'info',
      message: 'Submitting review...'
    });

    const payload = readReviewFormValues(form);
    const response = await api.submitReview(payload);

    if (response.ok) {
      setReviewFormStatus(statusNode, {
        type: 'success',
        message: 'Review submitted successfully.'
      });
      return;
    }

    if (response.status === 400) {
      renderValidationFeedback(form, errorsNode, {
        missingFields: response.payload?.missingFields,
        fieldMessages: response.payload?.fieldMessages
      });
      hydrateReviewForm(form, payload);
      setReviewFormStatus(statusNode, {
        type: 'error',
        message: getErrorMessage(response, 'Review submission failed validation.')
      });
      return;
    }

    setReviewFormStatus(statusNode, {
      type: response.status === 409 ? 'warning' : 'error',
      message: getErrorMessage(response, 'Review submission failed.')
    });
  });

  return {
    enhanced: true
  };
}

bootstrapReviewFormPage();
