function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderSessionCard(session) {
  const highlightClass = session.isCurrentAuthorSession ? ' final-schedule__session--mine' : '';
  const highlightAttribute = session.isCurrentAuthorSession ? ' data-current-author-session="true"' : '';

  return `<article class="final-schedule__session${highlightClass}" data-final-schedule-session${highlightAttribute}>
    <h3 data-final-schedule-title>${escapeHtml(session.title)}</h3>
    <p class="final-schedule__meta" data-final-schedule-room>${escapeHtml(session.room)}</p>
    <p class="final-schedule__meta" data-final-schedule-track>${escapeHtml(session.track || 'General')}</p>
    <p class="final-schedule__time" data-final-schedule-conference-time>
      Conference time: ${escapeHtml(session.conferenceTimeLabel)}
    </p>
    <p class="final-schedule__time" data-final-schedule-local-time>
      Local time: ${escapeHtml(session.localTimeLabel)}
    </p>
  </article>`;
}

export function renderLoadingState(root) {
  root.innerHTML = '<p data-final-schedule-status>Loading final schedule...</p>';
}

export function renderErrorState(root, message = 'Unable to load final schedule.') {
  root.innerHTML = `<p data-final-schedule-status="error">${escapeHtml(message)}</p>`;
}

export function renderFinalSchedule(root, viewModel) {
  const actionCount = Number(viewModel.actionsToOutcome ?? 1);
  const actionSummary = `<p data-final-schedule-action-count>${escapeHtml(actionCount)} action(s) from login to schedule outcome.</p>`;

  if (viewModel.status === 'unpublished') {
    root.innerHTML = `
      <section class="final-schedule__notice" data-final-schedule-notice>
        <h2>Final Schedule</h2>
        <p data-final-schedule-status>${escapeHtml(viewModel.notice.message)}</p>
        ${actionSummary}
      </section>
    `;
    return;
  }

  const sessions = viewModel.sessions.map((session) => renderSessionCard(session)).join('');
  const highlightedCount = viewModel.sessions.filter((session) => session.isCurrentAuthorSession).length;

  root.innerHTML = `
    <section data-final-schedule-published>
      <h2>Final Schedule</h2>
      <p data-final-schedule-timezone>Conference timezone: ${escapeHtml(viewModel.conferenceTimeZone)}</p>
      <p data-final-schedule-highlight-summary>
        Highlighted author sessions: ${escapeHtml(highlightedCount)}
      </p>
      ${actionSummary}
      <div class="final-schedule__sessions" data-final-schedule-session-list>
        ${sessions}
      </div>
    </section>
  `;
}
