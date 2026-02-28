function toText(value) {
  return String(value ?? '');
}

function toTrimmedText(value) {
  return toText(value).trim();
}

function toIntegerOrRaw(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : value;
}

function findField(form, field) {
  return form?.querySelector(`[name="${field}"]`);
}

export function readReviewFormValues(form) {
  if (!form) {
    return {
      recommendation: '',
      overallScore: '',
      confidenceScore: '',
      summary: '',
      strengths: '',
      weaknesses: '',
      commentsForChair: ''
    };
  }

  const FormDataConstructor = form.ownerDocument?.defaultView?.FormData ?? globalThis.FormData;
  const raw = Object.fromEntries(new FormDataConstructor(form).entries());
  return {
    recommendation: toTrimmedText(raw.recommendation),
    overallScore: toIntegerOrRaw(raw.overallScore),
    confidenceScore: toIntegerOrRaw(raw.confidenceScore),
    summary: toTrimmedText(raw.summary),
    strengths: toTrimmedText(raw.strengths),
    weaknesses: toTrimmedText(raw.weaknesses),
    commentsForChair: toTrimmedText(raw.commentsForChair)
  };
}

export function setReviewFormStatus(node, {
  type = 'info',
  message = ''
} = {}) {
  if (!node) {
    return;
  }

  node.dataset.status = type;
  node.textContent = message;
}

export function hydrateReviewForm(form, values = {}) {
  if (!form) {
    return;
  }

  const fields = [
    'recommendation',
    'overallScore',
    'confidenceScore',
    'summary',
    'strengths',
    'weaknesses',
    'commentsForChair'
  ];

  for (const field of fields) {
    const input = findField(form, field);
    if (input) {
      input.value = toText(values[field]);
    }
  }
}

export function clearReviewFormFeedback(form, errorsNode) {
  if (form) {
    const fields = form.querySelectorAll('[data-review-field]');
    for (const field of fields) {
      field.removeAttribute('aria-invalid');
    }
  }

  if (errorsNode) {
    errorsNode.textContent = '';
  }
}

export function renderValidationFeedback(form, errorsNode, {
  missingFields = [],
  fieldMessages = {}
} = {}) {
  const normalizedFields = Array.isArray(missingFields) ? missingFields : [];

  if (form) {
    for (const field of normalizedFields) {
      const input = findField(form, field);
      if (input) {
        input.setAttribute('aria-invalid', 'true');
      }
    }
  }

  if (!errorsNode) {
    return '';
  }

  const messages = normalizedFields
    .map((field) => toTrimmedText(fieldMessages[field]))
    .filter((message) => message.length > 0);
  const fallbackMessage = normalizedFields.length > 0
    ? 'Complete all required review fields.'
    : '';
  const summary = messages.join(' ') || fallbackMessage;
  errorsNode.textContent = summary;
  return summary;
}

export function resolveReviewAssignmentId({ documentRef = globalThis.document } = {}) {
  const pageNode = documentRef?.querySelector?.('[data-review-form-page]');
  const formNode = documentRef?.querySelector?.('[data-review-form]');
  const formAssignmentId = toTrimmedText(formNode?.dataset?.assignmentId);
  if (formAssignmentId.length > 0) {
    return formAssignmentId;
  }

  return toTrimmedText(pageNode?.dataset?.assignmentId);
}
