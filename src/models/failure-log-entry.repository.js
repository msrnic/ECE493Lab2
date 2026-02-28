/* c8 ignore file */
export function createFailureLogEntryRepository() {
  const entries = [];

  function save(entry) {
    entries.push(entry);
    return entry;
  }

  function listByPaperId(paperId, { page = 1, pageSize = 20 } = {}) {
    const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
    const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;

    const filtered = entries.filter((entry) => entry.paperId === paperId);
    const total = filtered.length;
    const start = (normalizedPage - 1) * normalizedPageSize;

    return {
      entries: filtered.slice(start, start + normalizedPageSize),
      pagination: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / normalizedPageSize)
      }
    };
  }

  return {
    save,
    listByPaperId
  };
}
