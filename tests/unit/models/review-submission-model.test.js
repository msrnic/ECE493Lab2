import { describe, expect, it } from 'vitest';
import {
  createReviewSubmissionModel,
  normalizeReviewSubmissionPayload,
  REQUIRED_REVIEW_FIELDS
} from '../../../src/models/review-submission-model.js';
import {
  createInvalidReviewPayload,
  createValidReviewPayload
} from '../../fixtures/review-submission-fixtures.js';

describe('review-submission-model', () => {
  it('accepts a valid payload and returns normalized values', () => {
    const model = createReviewSubmissionModel();
    const result = model.validate(
      createValidReviewPayload({
        overallScore: '5',
        confidenceScore: '4',
        summary: '  Strong work.  ',
        strengths: '  Novel framing.  '
      })
    );

    expect(result.valid).toBe(true);
    expect(result.value).toEqual({
      recommendation: 'ACCEPT',
      overallScore: 5,
      confidenceScore: 4,
      summary: 'Strong work.',
      strengths: 'Novel framing.',
      weaknesses: 'Minor writing issues.',
      commentsForChair: 'Fits scope.'
    });
  });

  it('returns canonical missing fields for blank required values', () => {
    const model = createReviewSubmissionModel();
    const result = model.validate(createInvalidReviewPayload());

    expect(result.valid).toBe(false);
    expect(result.missingFields).toEqual(REQUIRED_REVIEW_FIELDS);
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('flags invalid recommendation and out-of-range scores as missing', () => {
    const model = createReviewSubmissionModel();
    const result = model.validate(
      createValidReviewPayload({
        recommendation: 'MAYBE',
        overallScore: 8,
        confidenceScore: 0
      })
    );

    expect(result.valid).toBe(false);
    expect(result.missingFields).toEqual([
      'recommendation',
      'overallScore',
      'confidenceScore'
    ]);
  });

  it('handles non-object payloads as invalid submissions', () => {
    const model = createReviewSubmissionModel();
    const result = model.validate(['not-an-object']);

    expect(result.valid).toBe(false);
    expect(result.missingFields).toEqual(REQUIRED_REVIEW_FIELDS);
  });

  it('normalizes optional fields and empty values explicitly', () => {
    expect(
      normalizeReviewSubmissionPayload(
        createValidReviewPayload({
          strengths: null,
          weaknesses: undefined,
          commentsForChair: '  '
        })
      )
    ).toMatchObject({
      strengths: '',
      weaknesses: '',
      commentsForChair: ''
    });
  });

  it('normalizes empty payload objects without throwing', () => {
    expect(normalizeReviewSubmissionPayload({})).toEqual({
      recommendation: '',
      overallScore: Number.NaN,
      confidenceScore: Number.NaN,
      summary: '',
      strengths: '',
      weaknesses: '',
      commentsForChair: ''
    });
  });

  it('falls back to an empty error array when validator errors are unavailable', () => {
    const ajv = {
      compile() {
        const validator = () => true;
        validator.errors = undefined;
        return validator;
      }
    };
    const model = createReviewSubmissionModel({ ajv });
    const result = model.validate({});

    expect(result.valid).toBe(false);
    expect(result.missingFields).toEqual(REQUIRED_REVIEW_FIELDS);
    expect(result.errors).toEqual([]);
  });
});
