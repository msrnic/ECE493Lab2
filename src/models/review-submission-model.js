import Ajv from 'ajv';

export const REVIEW_RECOMMENDATIONS = Object.freeze([
  'STRONG_ACCEPT',
  'ACCEPT',
  'WEAK_ACCEPT',
  'WEAK_REJECT',
  'REJECT',
  'STRONG_REJECT'
]);

export const REQUIRED_REVIEW_FIELDS = Object.freeze([
  'recommendation',
  'overallScore',
  'confidenceScore',
  'summary'
]);

const reviewSubmissionSchema = {
  type: 'object',
  required: REQUIRED_REVIEW_FIELDS,
  additionalProperties: true,
  properties: {
    recommendation: {
      type: 'string',
      enum: REVIEW_RECOMMENDATIONS
    },
    overallScore: {
      type: 'integer',
      minimum: 1,
      maximum: 5
    },
    confidenceScore: {
      type: 'integer',
      minimum: 1,
      maximum: 5
    },
    summary: {
      type: 'string',
      minLength: 1,
      pattern: '.*\\S.*'
    }
  }
};

function normalizeOptionalText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function normalizeScore(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : value;
}

function toRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value;
}

function isMissingScore(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return true;
  }

  const score = Number(value);
  return !Number.isInteger(score) || score < 1 || score > 5;
}

function collectMissingFields(payload) {
  const missing = new Set();
  const recommendation = String(payload.recommendation ?? '').trim();
  const summary = String(payload.summary ?? '').trim();

  if (!REVIEW_RECOMMENDATIONS.includes(recommendation)) {
    missing.add('recommendation');
  }

  if (isMissingScore(payload.overallScore)) {
    missing.add('overallScore');
  }

  if (isMissingScore(payload.confidenceScore)) {
    missing.add('confidenceScore');
  }

  if (summary.length === 0) {
    missing.add('summary');
  }

  return REQUIRED_REVIEW_FIELDS.filter((field) => missing.has(field));
}

export function normalizeReviewSubmissionPayload(payload) {
  const record = toRecord(payload);

  return {
    recommendation: String(record.recommendation ?? '').trim(),
    overallScore: Number(record.overallScore),
    confidenceScore: Number(record.confidenceScore),
    summary: String(record.summary ?? '').trim(),
    strengths: normalizeOptionalText(record.strengths),
    weaknesses: normalizeOptionalText(record.weaknesses),
    commentsForChair: normalizeOptionalText(record.commentsForChair)
  };
}

export function createReviewSubmissionModel({
  ajv = new Ajv({
    allErrors: true,
    coerceTypes: true
  })
} = {}) {
  const validateSchema = ajv.compile(reviewSubmissionSchema);

  function validate(payload) {
    const record = toRecord(payload);
    const validationTarget = {
      ...record,
      overallScore: normalizeScore(record.overallScore),
      confidenceScore: normalizeScore(record.confidenceScore)
    };

    const schemaValid = validateSchema(validationTarget);
    const missingFields = collectMissingFields(validationTarget);
    const schemaErrors = Array.isArray(validateSchema.errors) ? validateSchema.errors : [];

    if (!schemaValid || missingFields.length > 0) {
      return {
        valid: false,
        missingFields,
        errors: schemaErrors
      };
    }

    return {
      valid: true,
      value: normalizeReviewSubmissionPayload(validationTarget)
    };
  }

  return {
    validate
  };
}
