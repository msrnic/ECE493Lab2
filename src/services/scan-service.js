export function createScanService({ defaultStatus = 'passed' } = {}) {
  const forcedResults = new Map();

  async function scanFile(file = {}) {
    const filename = file.originalname ?? file.name ?? '';

    if (forcedResults.has(filename)) {
      return {
        status: forcedResults.get(filename)
      };
    }

    if (filename.toLowerCase().includes('virus')) {
      return {
        status: 'failed'
      };
    }

    return {
      status: defaultStatus
    };
  }

  function setForcedResult(filename, status) {
    if (!filename) {
      return;
    }

    forcedResults.set(filename, status);
  }

  function clearForcedResults() {
    forcedResults.clear();
  }

  return {
    scanFile,
    setForcedResult,
    clearForcedResults
  };
}
