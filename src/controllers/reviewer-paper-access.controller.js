import { randomUUID } from 'node:crypto';
import { renderReviewerPaperAccessPage } from '../views/reviewer-paper-access.view.js';

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(index, 0)];
}

function resolveRequestId(req) {
  const requestIdHeader = req.headers?.['x-request-id'];
  if (typeof requestIdHeader === 'string' && requestIdHeader.trim().length > 0) {
    return requestIdHeader;
  }

  return randomUUID();
}

export function createReviewerPaperAccessController({
  paperAccessApiService,
  nowFn = () => new Date()
} = {}) {
  const pendingSelections = new Map();
  const renderedDurationsMs = [];

  function markSelectionStarted({ requestId, reviewerId, paperId, startedAt = nowFn() }) {
    const normalizedRequestId = requestId ?? randomUUID();
    pendingSelections.set(normalizedRequestId, {
      reviewerId,
      paperId,
      startedAt: startedAt instanceof Date ? startedAt.getTime() : Date.parse(startedAt)
    });
    return normalizedRequestId;
  }

  function markSelectionRendered({ requestId, renderedAt = nowFn() }) {
    const pending = pendingSelections.get(requestId);
    if (!pending) {
      return null;
    }

    pendingSelections.delete(requestId);
    const renderedAtMs = renderedAt instanceof Date ? renderedAt.getTime() : Date.parse(renderedAt);
    const durationMs = Math.max(0, renderedAtMs - pending.startedAt);
    renderedDurationsMs.push(durationMs);
    return {
      ...pending,
      durationMs
    };
  }

  function getSelectionLatencySummary() {
    return {
      count: renderedDurationsMs.length,
      p95Ms: percentile(renderedDurationsMs, 95)
    };
  }

  async function listAssignedPapers(req, res) {
    if (!req.authenticatedReviewerId) {
      return res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.'
      });
    }

    const response = paperAccessApiService.listAssignedPapers({
      reviewerId: req.authenticatedReviewerId
    });

    return res.status(response.status).json(response.body);
  }

  async function getPaperAccessPage(req, res) {
    if (!req.authenticatedReviewerId || !req.authenticatedSession) {
      return res.status(302).redirect('/login');
    }

    const assigned = paperAccessApiService.listAssignedPapers({ reviewerId: req.authenticatedReviewerId });
    const requestId = resolveRequestId(req);

    markSelectionStarted({
      requestId,
      reviewerId: req.authenticatedReviewerId,
      paperId: req.query?.paperId ?? null,
      startedAt: nowFn()
    });

    const rendered = markSelectionRendered({
      requestId,
      renderedAt: nowFn()
    });

    return res.status(200).type('html').send(
      renderReviewerPaperAccessPage({
        userEmail: req.authenticatedSession.user.email,
        papers: assigned.body.papers,
        selectedPaperId: req.query?.paperId ?? null,
        renderedLatencyMs: rendered.durationMs
      })
    );
  }

  return {
    listAssignedPapers,
    getPaperAccessPage,
    markSelectionStarted,
    markSelectionRendered,
    getSelectionLatencySummary
  };
}
