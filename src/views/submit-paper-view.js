function toStringValue(value) {
  return String(value ?? '');
}

export function readSubmissionFormValues(form) {
  if (!form) {
    return {
      actionSequenceId: '',
      sessionId: '',
      metadata: {
        title: '',
        abstract: '',
        authorList: [],
        keywords: []
      }
    };
  }

  const values = Object.fromEntries(new FormData(form).entries());
  const authors = toStringValue(values.authorList)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const keywords = toStringValue(values.keywords)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    actionSequenceId: toStringValue(values.actionSequenceId).trim(),
    sessionId: toStringValue(values.sessionId).trim(),
    metadata: {
      title: toStringValue(values.title).trim(),
      abstract: toStringValue(values.abstract).trim(),
      authorList: authors,
      keywords
    }
  };
}

export function renderValidationSummary(errors = []) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return '';
  }

  return errors.map((error) => error.message).join(' ');
}

export function setSubmissionStatus(statusNode, { type = 'info', message = '' } = {}) {
  if (!statusNode) {
    return;
  }

  statusNode.dataset.status = type;
  statusNode.textContent = message;
}

export function applyValidationErrors(form, errors = []) {
  if (!form) {
    return;
  }

  const fields = form.querySelectorAll('[data-field]');
  for (const field of fields) {
    field.removeAttribute('aria-invalid');
  }

  for (const error of errors) {
    const fieldKey = String(error.field ?? '').replace('files.', '');
    const input = form.querySelector(`[name="${fieldKey}"]`);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
    }
  }
}

export function hydrateSubmissionForm(form, metadata = {}) {
  if (!form) {
    return;
  }

  const title = form.querySelector('[name="title"]');
  const abstract = form.querySelector('[name="abstract"]');
  const authorList = form.querySelector('[name="authorList"]');
  const keywords = form.querySelector('[name="keywords"]');

  if (title) {
    title.value = toStringValue(metadata.title);
  }
  if (abstract) {
    abstract.value = toStringValue(metadata.abstract);
  }
  if (authorList) {
    authorList.value = Array.isArray(metadata.authorList) ? metadata.authorList.join(', ') : '';
  }
  if (keywords) {
    keywords.value = Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : '';
  }
}
