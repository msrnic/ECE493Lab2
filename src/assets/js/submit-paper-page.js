import {
  applyValidationErrors,
  readSubmissionFormValues,
  renderValidationSummary,
  setSubmissionStatus
} from '../../views/submit-paper-view.js';
import { bootstrapDraftPage } from './draft-page.js';

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

function getManuscriptFile(form) {
  const input = form.querySelector('[name="manuscript"]');
  return input?.files?.[0] ?? null;
}

function toUploadFilePayload(file) {
  const restoredSize = Number(file?.draftSizeBytes);
  const size = Number.isFinite(restoredSize) && restoredSize > 0
    ? restoredSize
    : Number(file?.size ?? 0);

  return {
    name: String(file?.name ?? '').trim(),
    type: String(file?.type ?? '').trim(),
    size
  };
}

export function createSubmissionApi({ fetchImpl = globalThis.fetch } = {}) {
  return {
    createSubmission(payload) {
      return requestJson(fetchImpl, '/api/v1/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    },

    uploadFile({ submissionId, category, file }) {
      return requestJson(fetchImpl, `/api/v1/submissions/${submissionId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category,
          file: toUploadFilePayload(file)
        })
      });
    },

    validateSubmission({ submissionId }) {
      return requestJson(fetchImpl, `/api/v1/submissions/${submissionId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
    },

    finalizeSubmission({ submissionId, idempotencyKey }) {
      return requestJson(fetchImpl, `/api/v1/submissions/${submissionId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({})
      });
    }
  };
}

function extractDetailedErrorMessage(payload) {
  if (!Array.isArray(payload?.details)) {
    return '';
  }

  const detail = payload.details.find(
    (item) => typeof item?.message === 'string' && item.message.trim().length > 0
  );

  return detail?.message?.trim() ?? '';
}

function getErrorMessage(response, fallback) {
  const payloadMessage = typeof response.payload?.message === 'string'
    ? response.payload.message.trim()
    : '';
  const detailMessage = extractDetailedErrorMessage(response.payload);

  if (!payloadMessage) {
    return detailMessage || fallback;
  }

  if (payloadMessage === 'Uploaded file violates policy.' && detailMessage) {
    return detailMessage;
  }

  return payloadMessage;
}

function createFallbackActionSequenceId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (typeof uuid === 'string' && uuid.trim().length > 0) {
    return uuid;
  }

  return `action-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveIdempotencyKey(createResponsePayload, submissionValues) {
  const actionSequenceId = createResponsePayload?.actionSequenceId ?? submissionValues.actionSequenceId;
  if (typeof actionSequenceId === 'string' && actionSequenceId.trim().length > 0) {
    return actionSequenceId.trim();
  }

  return createFallbackActionSequenceId();
}

export function bootstrapSubmitPaperPage({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch
} = {}) {
  const form = documentRef.querySelector('[data-submit-paper-form]');
  const statusNode = documentRef.querySelector('[data-submit-paper-status]');

  if (!form || !statusNode) {
    return {
      enhanced: false
    };
  }

  const api = createSubmissionApi({ fetchImpl });
  bootstrapDraftPage({
    documentRef,
    formRef: form,
    apiClientOptions: {
      fetchImpl
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    applyValidationErrors(form, []);
    setSubmissionStatus(statusNode, {
      type: 'info',
      message: 'Submitting paper...'
    });

    const submissionValues = readSubmissionFormValues(form);
    const createResponse = await api.createSubmission({
      metadata: submissionValues.metadata
    });
    if (!createResponse.ok) {
      setSubmissionStatus(statusNode, {
        type: 'error',
        message: getErrorMessage(createResponse, 'Failed to create submission.')
      });
      return;
    }

    const submissionId = createResponse.payload.submissionId;
    const manuscriptFile = getManuscriptFile(form);
    if (manuscriptFile) {
      const uploadResponse = await api.uploadFile({
        submissionId,
        category: 'manuscript',
        file: manuscriptFile
      });

      if (!uploadResponse.ok) {
        const isRetry = uploadResponse.payload?.outcome === 'retry_required';
        setSubmissionStatus(statusNode, {
          type: isRetry ? 'warning' : 'error',
          message: getErrorMessage(uploadResponse, 'Failed to upload manuscript.')
        });
        return;
      }
    }

    const validationResponse = await api.validateSubmission({
      submissionId
    });

    if (!validationResponse.ok) {
      setSubmissionStatus(statusNode, {
        type: 'error',
        message: getErrorMessage(validationResponse, 'Failed to validate submission.')
      });
      return;
    }

    if (!validationResponse.payload.valid) {
      applyValidationErrors(form, validationResponse.payload.errors ?? []);
      setSubmissionStatus(statusNode, {
        type: 'error',
        message: renderValidationSummary(validationResponse.payload.errors)
      });
      return;
    }

    const finalizeResponse = await api.finalizeSubmission({
      submissionId,
      idempotencyKey: resolveIdempotencyKey(createResponse.payload, submissionValues)
    });

    if (!finalizeResponse.ok) {
      const type = finalizeResponse.payload?.outcome === 'retry_required' ? 'warning' : 'error';
      setSubmissionStatus(statusNode, {
        type,
        message: getErrorMessage(finalizeResponse, 'Failed to finalize submission.')
      });
      return;
    }

    setSubmissionStatus(statusNode, {
      type: 'success',
      message: `Submission complete. Confirmation code: ${finalizeResponse.payload.confirmationCode}`
    });
  });

  return {
    enhanced: true
  };
}
