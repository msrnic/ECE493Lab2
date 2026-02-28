import { renderViewState } from './ViewStateRenderer.js';

function byDataAttribute(documentRef, attributeName) {
  return documentRef.querySelector(`[${attributeName}]`);
}

function renderOptions(selectElement, items, mapLabel) {
  if (!selectElement) {
    return;
  }

  selectElement.innerHTML = '';
  for (const item of items) {
    const option = selectElement.ownerDocument.createElement('option');
    option.value = item.value;
    option.textContent = mapLabel(item);
    selectElement.appendChild(option);
  }
}

function formatCandidateLabel(candidate) {
  const tags = [];
  if (candidate.availabilityStatus === 'unavailable') {
    tags.push('unavailable');
  }
  if (candidate.coiFlag) {
    tags.push('conflict');
  }
  return tags.length > 0
    ? `${candidate.displayName} (${tags.join(', ')})`
    : `${candidate.displayName} (available)`;
}

export function createAssignReviewersView({ documentRef } = {}) {
  const banner = documentRef ? byDataAttribute(documentRef, 'data-assignment-banner') : null;
  const paperSelect = documentRef ? byDataAttribute(documentRef, 'data-assignment-paper') : null;
  const reviewerSelect = documentRef ? byDataAttribute(documentRef, 'data-assignment-reviewers') : null;
  const confirmButton = documentRef ? byDataAttribute(documentRef, 'data-assignment-confirm') : null;

  function renderPapers(papers) {
    renderOptions(
      paperSelect,
      (papers ?? []).map((paper) => ({ value: paper.paperId, paper })),
      (entry) => entry.paper.title
    );
  }

  function renderReviewerCandidates(candidates) {
    renderOptions(
      reviewerSelect,
      (candidates ?? []).map((candidate) => ({ value: candidate.reviewerId, candidate })),
      (entry) => formatCandidateLabel(entry.candidate)
    );
  }

  function getSelection() {
    const selectedPaperId = paperSelect?.value ?? null;
    const selectedReviewerIds = reviewerSelect
      ? [...reviewerSelect.selectedOptions].map((option) => option.value).filter(Boolean)
      : [];

    return {
      paperId: selectedPaperId,
      reviewerIds: selectedReviewerIds
    };
  }

  function setState(status, message) {
    renderViewState(banner, { status, message });
  }

  function setConfirmEnabled(enabled) {
    if (!confirmButton) {
      return;
    }
    confirmButton.disabled = !enabled;
  }

  function bindPaperChange(handler) {
    if (!paperSelect) {
      return () => {};
    }

    const listener = () => handler(paperSelect.value || null);
    paperSelect.addEventListener('change', listener);
    return () => paperSelect.removeEventListener('change', listener);
  }

  function bindReviewerChange(handler) {
    if (!reviewerSelect) {
      return () => {};
    }

    const listener = () => handler(getSelection());
    reviewerSelect.addEventListener('change', listener);
    return () => reviewerSelect.removeEventListener('change', listener);
  }

  function bindConfirm(handler) {
    if (!confirmButton) {
      return () => {};
    }

    const listener = () => handler(getSelection());
    confirmButton.addEventListener('click', listener);
    return () => confirmButton.removeEventListener('click', listener);
  }

  return {
    renderPapers,
    renderReviewerCandidates,
    getSelection,
    setState,
    setConfirmEnabled,
    bindPaperChange,
    bindReviewerChange,
    bindConfirm
  };
}
