import { describe, expect, it } from 'vitest';
import {
  createReviewRecordModel,
  REVIEW_COMPLETION_STATUS
} from '../../../src/models/review-record-model.js';
import { createValidReviewPayload } from '../../fixtures/review-submission-fixtures.js';

describe('review-record-model', () => {
  it('returns NOT_SUBMITTED when no record exists', () => {
    const model = createReviewRecordModel();
    expect(model.getStatus('asg-1')).toEqual({
      status: REVIEW_COMPLETION_STATUS.NOT_SUBMITTED,
      completedAt: null
    });
    expect(model.getReviewRecord('asg-1')).toBeNull();
  });

  it('creates a completed review record for the first valid submission', async () => {
    const model = createReviewRecordModel({
      idFactory: () => 'review-1',
      nowFn: () => new Date('2026-02-08T10:00:00.000Z'),
      yieldBeforePersist: false
    });

    const result = await model.completeReview({
      assignmentId: 'asg-2',
      reviewerId: 'account-reviewer-2',
      paperId: 'paper-2',
      submission: createValidReviewPayload({
        strengths: null,
        weaknesses: undefined,
        commentsForChair: '  '
      })
    });

    expect(result.ok).toBe(true);
    expect(result.reviewRecord).toMatchObject({
      reviewId: 'review-1',
      assignmentId: 'asg-2',
      status: REVIEW_COMPLETION_STATUS.COMPLETED,
      completedAt: '2026-02-08T10:00:00.000Z'
    });
    expect(result.reviewRecord.strengths).toBe('');
    expect(result.reviewRecord.weaknesses).toBe('');
    expect(result.reviewRecord.commentsForChair).toBe('');

    expect(model.getStatus('asg-2')).toEqual({
      status: REVIEW_COMPLETION_STATUS.COMPLETED,
      completedAt: '2026-02-08T10:00:00.000Z'
    });
  });

  it('rejects a repeated submission after completion', async () => {
    const model = createReviewRecordModel({
      idFactory: () => 'review-repeat',
      nowFn: () => new Date('2026-02-08T11:00:00.000Z')
    });

    await model.completeReview({
      assignmentId: 'asg-3',
      reviewerId: 'account-reviewer-3',
      paperId: 'paper-3',
      submission: createValidReviewPayload()
    });

    const secondAttempt = await model.completeReview({
      assignmentId: 'asg-3',
      reviewerId: 'account-reviewer-3',
      paperId: 'paper-3',
      submission: createValidReviewPayload()
    });

    expect(secondAttempt).toEqual({
      ok: false,
      code: 'REVIEW_ALREADY_COMPLETED',
      message: 'A completed review already exists for this assignment.',
      existingReviewId: 'review-repeat'
    });
  });

  it('rejects concurrent submit attempts with exactly one success', async () => {
    let sequence = 0;
    const model = createReviewRecordModel({
      idFactory: () => `review-${++sequence}`,
      nowFn: () => new Date('2026-02-08T12:00:00.000Z'),
      yieldBeforePersist: true
    });

    const [first, second] = await Promise.all([
      model.completeReview({
        assignmentId: 'asg-4',
        reviewerId: 'account-reviewer-4',
        paperId: 'paper-4',
        submission: createValidReviewPayload()
      }),
      model.completeReview({
        assignmentId: 'asg-4',
        reviewerId: 'account-reviewer-4',
        paperId: 'paper-4',
        submission: createValidReviewPayload()
      })
    ]);

    const outcomes = [first, second];
    const successful = outcomes.filter((entry) => entry.ok);
    const conflicts = outcomes.filter((entry) => !entry.ok);

    expect(successful).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].code).toBe('CONCURRENT_SUBMISSION_REJECTED');
    expect(model.getStatus('asg-4').status).toBe(REVIEW_COMPLETION_STATUS.COMPLETED);
  });

  it('throws for invalid assignment identifiers', async () => {
    const model = createReviewRecordModel();

    expect(() => model.getStatus('')).toThrow(/assignmentId is required/);

    await expect(
      model.completeReview({
        assignmentId: '',
        reviewerId: 'account-reviewer-5',
        paperId: 'paper-5',
        submission: createValidReviewPayload()
      })
    ).rejects.toThrow(/assignmentId is required/);
  });

  it('normalizes missing reviewer, paper, and submission text fields', async () => {
    const model = createReviewRecordModel();
    const result = await model.completeReview({
      assignmentId: 'asg-5',
      submission: {}
    });

    expect(result.ok).toBe(true);
    expect(result.reviewRecord.reviewerId).toBe('');
    expect(result.reviewRecord.paperId).toBe('');
    expect(result.reviewRecord.recommendation).toBe('');
    expect(result.reviewRecord.summary).toBe('');
    expect(typeof result.reviewRecord.reviewId).toBe('string');
    expect(typeof result.reviewRecord.completedAt).toBe('string');
  });
});
