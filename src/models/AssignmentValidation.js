function validationError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

export function hasAvailabilityConflict(candidate) {
  return candidate?.availabilityStatus !== 'available';
}

export function hasCoiConflict(candidate) {
  return candidate?.coiFlag === true;
}

export function validateUniqueReviewers(selections) {
  if (!Array.isArray(selections) || selections.length === 0) {
    throw validationError('ASSIGNMENT_BAD_REQUEST', 'selections must include at least one reviewer');
  }

  const seenReviewerIds = new Set();
  for (const selection of selections) {
    const reviewerId = selection?.reviewerId;
    if (!reviewerId) {
      throw validationError('ASSIGNMENT_BAD_REQUEST', 'reviewerId is required for each selection');
    }

    if (seenReviewerIds.has(reviewerId)) {
      throw validationError('DUPLICATE_REVIEWER', 'reviewer must be unique per assignment attempt', {
        reviewerId
      });
    }

    seenReviewerIds.add(reviewerId);
  }
}

export function collectBlockingSelectionIds(selections) {
  if (!Array.isArray(selections) || selections.length === 0) {
    return [];
  }

  return selections
    .filter((selection) => selection?.status === 'needs_replacement')
    .map((selection) => selection.selectionId);
}
