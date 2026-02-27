import { createSubmissionResource } from '../models/submission-model.js';
import { isRetryAllowed } from '../models/session-state-model.js';

function hasSubmissionAccess(req, submission) {
  return (
    submission &&
    submission.authorId === req.submissionSession?.authorId &&
    submission.sessionId === req.submissionSession?.sessionId
  );
}

export function createStatusController({
  submissionRepository,
  fileRepository,
  sessionStateRepository,
  nowFn = () => new Date()
}) {
  async function getSubmission(req, res) {
    const submission = submissionRepository.findById(req.params.submissionId);
    if (!hasSubmissionAccess(req, submission)) {
      res.status(404).json({
        code: 'SUBMISSION_NOT_FOUND',
        message: 'Submission not found.'
      });
      return;
    }

    const files = fileRepository.listBySubmissionId(submission.submissionId);
    const sessionState = sessionStateRepository.findBySessionId(
      req.submissionSession.sessionId,
      nowFn()
    );

    res.status(200).json(
      createSubmissionResource({
        submission,
        files,
        retryAllowed: isRetryAllowed({
          submissionStatus: submission.status,
          sessionState
        })
      })
    );
  }

  return {
    getSubmission
  };
}
