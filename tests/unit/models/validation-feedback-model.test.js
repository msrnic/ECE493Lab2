import { describe, expect, it } from 'vitest';
import { createValidationFeedbackModel } from '../../../src/models/validation-feedback-model.js';

describe('validation-feedback-model', () => {
  it('builds canonical feedback with field messages', () => {
    const model = createValidationFeedbackModel({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });

    const feedback = model.createFeedback({
      assignmentId: 'asg-1',
      missingFields: ['summary', 'recommendation', 'summary', 'unknown']
    });

    expect(feedback).toEqual({
      assignmentId: 'asg-1',
      missingFields: ['recommendation', 'summary'],
      messages: {
        recommendation: 'Select a recommendation before submitting.',
        summary: 'Provide a non-empty summary of your review.'
      },
      generatedAt: '2026-02-08T00:00:00.000Z'
    });
  });

  it('creates API-ready validation error payloads', () => {
    const model = createValidationFeedbackModel({
      nowFn: () => new Date('2026-02-08T00:00:01.000Z')
    });

    expect(
      model.toValidationErrorResponse({
        assignmentId: 'asg-2',
        missingFields: ['overallScore', 'confidenceScore']
      })
    ).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Required review fields are missing or invalid.',
      missingFields: ['overallScore', 'confidenceScore'],
      fieldMessages: {
        overallScore: 'Provide an overall score from 1 to 5.',
        confidenceScore: 'Provide a confidence score from 1 to 5.'
      }
    });
  });

  it('handles empty missing-field arrays', () => {
    const model = createValidationFeedbackModel();
    const feedback = model.createFeedback({
      assignmentId: 'asg-3',
      missingFields: []
    });

    expect(feedback.missingFields).toEqual([]);
    expect(feedback.messages).toEqual({});
  });

  it('ignores non-array missing field inputs', () => {
    const model = createValidationFeedbackModel();
    const feedback = model.createFeedback({
      assignmentId: 'asg-4',
      missingFields: 'summary'
    });

    expect(feedback.missingFields).toEqual([]);
    expect(feedback.messages).toEqual({});
  });
});
