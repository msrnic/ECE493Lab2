export function mapDraftError(error) {
  if (!error || typeof error !== 'object') {
    return {
      status: 500,
      body: {
        code: 'DRAFT_SAVE_FAILED',
        message: 'Draft was not saved due to a system error. Please retry.',
        reloadRequired: false
      }
    };
  }

  switch (error.code) {
    case 'DRAFT_AUTH_REQUIRED':
      return {
        status: 401,
        body: {
          code: 'DRAFT_AUTH_REQUIRED',
          message: 'Authentication required.'
        }
      };
    case 'DRAFT_FORBIDDEN':
      return {
        status: 403,
        body: {
          code: 'DRAFT_FORBIDDEN',
          message: 'You do not have permission for this action.'
        }
      };
    case 'DRAFT_STALE':
      return {
        status: 409,
        body: {
          code: 'DRAFT_STALE',
          message: 'Draft has changed since it was loaded. Reload latest draft before saving.',
          reloadRequired: true,
          latestRevision: error.latestRevision,
          latestVersionId: error.latestVersionId
        }
      };
    case 'DRAFT_NOT_FOUND':
      return {
        status: 404,
        body: {
          code: 'DRAFT_NOT_FOUND',
          message: error.message || 'Draft data was not found.'
        }
      };
    case 'DRAFT_BAD_REQUEST':
    case 'DRAFT_BAD_REVISION':
      return {
        status: 400,
        body: {
          code: error.code,
          message: error.message || 'Request failed validation.'
        }
      };
    case 'DRAFT_SAVE_FAILED':
      return {
        status: 500,
        body: {
          code: 'DRAFT_SAVE_FAILED',
          message: error.message || 'Draft was not saved due to a system error. Please retry.',
          reloadRequired: false
        }
      };
    default:
      return {
        status: 500,
        body: {
          code: 'DRAFT_SAVE_FAILED',
          message: 'Draft was not saved due to a system error. Please retry.',
          reloadRequired: false
        }
      };
  }
}

export function mapErrorToOutcome(errorCode) {
  if (errorCode === 'DRAFT_STALE') {
    return 'FAILED_STALE';
  }

  if (errorCode === 'DRAFT_AUTH_REQUIRED' || errorCode === 'DRAFT_FORBIDDEN') {
    return 'FAILED_AUTH';
  }

  return 'FAILED_SYSTEM';
}
