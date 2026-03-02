function mapError(error) {
  return {
    status: error?.status ?? 500,
    body: {
      code: error?.code ?? 'INTERNAL_ERROR',
      message: error?.message ?? 'Unexpected error.'
    }
  };
}

export function createAdminFailureLogController({ unresolvedFailureModel } = {}) {
  if (!unresolvedFailureModel) {
    throw new Error('unresolvedFailureModel is required');
  }

  async function listUnresolvedFailures(req, res) {
    try {
      const page = req.query?.page;
      const pageSize = req.query?.pageSize;
      const result = unresolvedFailureModel.list({
        submissionId: req.query?.submissionId,
        authorId: req.query?.authorId,
        from: req.query?.from,
        to: req.query?.to,
        page,
        pageSize
      });

      return res.status(200).json(result);
    } catch (error) {
      const mapped = mapError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function getUnresolvedFailure(req, res) {
    try {
      const failureRecordId = String(req.params?.failureRecordId ?? '').trim();
      if (!failureRecordId) {
        return res.status(400).json({
          code: 'INVALID_FAILURE_RECORD_ID',
          message: 'failureRecordId is required'
        });
      }

      const record = unresolvedFailureModel.getById(failureRecordId);
      if (!record) {
        return res.status(404).json({
          code: 'FAILURE_RECORD_NOT_FOUND',
          message: 'Failure record not found'
        });
      }

      return res.status(200).json(record);
    } catch (error) {
      const mapped = mapError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  return {
    listUnresolvedFailures,
    getUnresolvedFailure
  };
}
