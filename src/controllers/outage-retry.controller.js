export function createOutageRetryController({ outageRetryWindowModel, nowFn = () => new Date() } = {}) {
  function evaluateOutage({ reviewerId, paperId, now = nowFn() }) {
    return outageRetryWindowModel.registerTemporaryOutage({ reviewerId, paperId, now });
  }

  function clearOutageWindow({ reviewerId, paperId }) {
    outageRetryWindowModel.clearWindow(reviewerId, paperId);
  }

  return {
    evaluateOutage,
    clearOutageWindow
  };
}
