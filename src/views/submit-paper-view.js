function toStringValue(value) {
  return String(value ?? '');
}

function toPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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

export function hydrateSubmissionFileInput(form, files = []) {
  if (!form) {
    return;
  }

  const manuscript = form.querySelector('[name="manuscript"]');
  if (!manuscript) {
    return;
  }

  const descriptors = Array.isArray(files) ? files : [];
  const restoredFiles = descriptors
    .map((fileDescriptor) => {
      const fileName = toStringValue(fileDescriptor?.fileName).trim();
      if (!fileName) {
        return null;
      }

      const mimeType = toStringValue(fileDescriptor?.mimeType).trim() || 'application/octet-stream';
      const restoredSizeBytes = toPositiveNumber(fileDescriptor?.sizeBytes);
      const restoredFile = new File([new Uint8Array(0)], fileName, {
        type: mimeType,
        lastModified: Date.now()
      });

      Object.defineProperty(restoredFile, 'draftSizeBytes', {
        value: restoredSizeBytes,
        configurable: true
      });
      Object.defineProperty(restoredFile, 'draftChecksum', {
        value: toStringValue(fileDescriptor?.checksum).trim(),
        configurable: true
      });
      Object.defineProperty(restoredFile, 'draftStorageKey', {
        value: toStringValue(fileDescriptor?.storageKey).trim(),
        configurable: true
      });

      return restoredFile;
    })
    .filter(Boolean);

  Object.defineProperty(manuscript, 'files', {
    value: restoredFiles,
    configurable: true
  });

  if (restoredFiles.length === 0) {
    manuscript.value = '';
    delete manuscript.dataset.restoredFileNames;
    return;
  }

  manuscript.dataset.restoredFileNames = restoredFiles.map((file) => file.name).join(', ');
}
