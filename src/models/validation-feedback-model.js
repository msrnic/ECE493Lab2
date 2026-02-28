const FIELD_MESSAGES = Object.freeze({
  recommendation: 'Select a recommendation before submitting.',
  overallScore: 'Provide an overall score from 1 to 5.',
  confidenceScore: 'Provide a confidence score from 1 to 5.',
  summary: 'Provide a non-empty summary of your review.'
});

const FIELD_ORDER = Object.freeze([
  'recommendation',
  'overallScore',
  'confidenceScore',
  'summary'
]);

function canonicalizeMissingFields(missingFields = []) {
  const seen = new Set(Array.isArray(missingFields) ? missingFields : []);
  return FIELD_ORDER.filter((field) => seen.has(field));
}

function selectMessages(missingFields) {
  return missingFields.reduce((messages, field) => {
    messages[field] = FIELD_MESSAGES[field];
    return messages;
  }, {});
}

export function createValidationFeedbackModel({
  nowFn = () => new Date()
} = {}) {
  function createFeedback({
    assignmentId,
    missingFields = []
  }) {
    const normalizedMissingFields = canonicalizeMissingFields(missingFields);
    return {
      assignmentId,
      missingFields: normalizedMissingFields,
      messages: selectMessages(normalizedMissingFields),
      generatedAt: nowFn().toISOString()
    };
  }

  function toValidationErrorResponse({
    assignmentId,
    missingFields = []
  }) {
    const feedback = createFeedback({
      assignmentId,
      missingFields
    });

    return {
      code: 'VALIDATION_FAILED',
      message: 'Required review fields are missing or invalid.',
      missingFields: feedback.missingFields,
      fieldMessages: feedback.messages
    };
  }

  return {
    createFeedback,
    toValidationErrorResponse
  };
}
