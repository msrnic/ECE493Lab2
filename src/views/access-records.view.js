function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderRecordRow(record) {
  return `<tr>
    <td>${escapeHtml(record.attemptId)}</td>
    <td>${escapeHtml(record.reviewerId)}</td>
    <td>${escapeHtml(record.outcome)}</td>
    <td>${escapeHtml(record.reasonCode)}</td>
    <td>${escapeHtml(record.occurredAt)}</td>
  </tr>`;
}

export function renderAccessRecordsView({ paperId, records = [], outcomeFilter = 'all' } = {}) {
  const rows = records.length > 0
    ? records.map(renderRecordRow).join('')
    : '<tr><td colspan="5" data-access-records-empty>No access attempts found.</td></tr>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Paper Access Records</title>
  </head>
  <body>
    <main>
      <h1>Paper Access Records</h1>
      <p data-access-records-paper>Paper: ${escapeHtml(paperId ?? 'unknown')}</p>
      <p data-access-records-filter>Filter: ${escapeHtml(outcomeFilter)}</p>
      <table data-access-records-table>
        <thead>
          <tr>
            <th>Attempt ID</th>
            <th>Reviewer</th>
            <th>Outcome</th>
            <th>Reason</th>
            <th>Occurred At</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </main>
  </body>
</html>`;
}
