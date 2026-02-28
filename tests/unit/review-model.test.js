import { describe, expect, it } from 'vitest';
import { REVIEW_STATUSES, createReviewModel } from '../../src/models/review-model.js';
import {
  createInProgressReview,
  createSubmittedReview
} from '../fixtures/review-visibility-fixtures.js';

describe('review-model', () => {
  it('returns only submitted reviews with reviewer identity in available results', () => {
    const model = createReviewModel({
      seedReviews: [
        createSubmittedReview(),
        createInProgressReview(),
        createSubmittedReview({
          reviewId: 'REV-SUBMITTED-2',
          reviewerId: 'reviewer-3',
          reviewerName: 'Reviewer Three',
          overallScore: 5,
          comments: 'Ready for acceptance.',
          submittedAt: '2026-02-08T10:00:00.000Z'
        })
      ]
    });

    const allReviews = model.listReviewsForPaper('PAPER-TEST-1');
    expect(allReviews).toHaveLength(3);

    const summaries = model.listSubmittedReviewSummaries('PAPER-TEST-1');
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toMatchObject({
      reviewerId: 'reviewer-1',
      reviewerName: 'Reviewer One'
    });

    const result = model.buildVisibilityResult({ paperId: 'PAPER-TEST-1' });
    expect(result.status).toBe('available');
    expect(result.reviews).toHaveLength(2);
  });

  it('returns pending when no submitted reviews exist', () => {
    const model = createReviewModel({
      seedReviews: [
        createInProgressReview(),
        {
          ...createInProgressReview({
            reviewId: 'REV-DRAFT-1',
            status: REVIEW_STATUSES.DRAFT
          })
        }
      ]
    });

    const result = model.buildVisibilityResult({ paperId: 'PAPER-TEST-1' });
    expect(result).toEqual({
      paperId: 'PAPER-TEST-1',
      status: 'pending',
      reviews: []
    });
  });

  it('validates review shape and status invariants', () => {
    const model = createReviewModel({ seedReviews: [] });

    expect(() => model.upsertReview({})).toThrow(/status must be a non-empty string/);
    expect(() => model.upsertReview({ ...createInProgressReview({ status: 'unknown' }) })).toThrow(
      /status must be one of/
    );
    expect(() => model.upsertReview({ ...createSubmittedReview({ overallScore: Number.NaN }) })).toThrow(
      /overallScore must be a finite number/
    );
    expect(() => model.upsertReview({ ...createSubmittedReview({ comments: '   ' }) })).toThrow(
      /comments must be provided/
    );
    expect(() => model.upsertReview({ ...createSubmittedReview({ submittedAt: null }) })).toThrow(
      /submittedAt must be provided/
    );
    expect(() => model.upsertReview({ ...createSubmittedReview({ submittedAt: 'not-a-date' }) })).toThrow(
      /submittedAt must be a valid date/
    );
    expect(() => model.listReviewsForPaper('')).toThrow(/paperId must be a non-empty string/);
    expect(() => model.buildVisibilityResult({ paperId: '' })).toThrow(/paperId must be a non-empty string/);

    const withDateObject = model.upsertReview({
      ...createSubmittedReview({
        reviewId: 'REV-SUBMITTED-DATE',
        submittedAt: new Date('2026-02-08T11:00:00.000Z')
      })
    });
    expect(withDateObject.submittedAt).toBe('2026-02-08T11:00:00.000Z');

    const withNonStringComments = model.upsertReview({
      ...createInProgressReview({
        reviewId: 'REV-IN-PROGRESS-NONSTRING',
        comments: null
      })
    });
    expect(withNonStringComments.comments).toBe('');
  });

  it('supports removing reviews', () => {
    const model = createReviewModel({
      seedReviews: [createSubmittedReview()]
    });

    expect(model.removeReview('REV-SUBMITTED-1')).toBe(true);
    expect(model.removeReview('REV-SUBMITTED-1')).toBe(false);
    expect(() => model.removeReview('')).toThrow(/reviewId must be a non-empty string/);
  });
});
