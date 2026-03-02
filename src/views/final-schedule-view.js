function requireContainer(container) {
  if (!container || typeof container.innerHTML !== 'string') {
    throw new Error('A valid container element is required');
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderLoading(container) {
  requireContainer(container);
  container.innerHTML = '<p class="final-schedule__loading" data-testid="loading">Loading final schedule...</p>';
}

export function renderError(container, message = 'Unable to load final schedule.') {
  requireContainer(container);
  const content = typeof message === 'string' && message.trim() ? message.trim() : 'Unable to load final schedule.';
  container.innerHTML = `<p class="final-schedule__error" role="alert" data-testid="error">${escapeHtml(content)}</p>`;
}

function renderPublishedSessions(sessions) {
  return sessions
    .map((session) => {
      const highlightClass = session.isCurrentAuthorSession ? ' final-schedule__session--mine' : '';
      const safeTrack = session.track ? `<p class="final-schedule__track">Track: ${escapeHtml(session.track)}</p>` : '';

      return `<li class="final-schedule__session${highlightClass}" data-testid="session-item">
        <h3 class="final-schedule__title">${escapeHtml(session.title)}</h3>
        <p class="final-schedule__room">Room: ${escapeHtml(session.room)}</p>
        ${safeTrack}
        <p class="final-schedule__time final-schedule__time--conference">Conference: ${escapeHtml(session.conferenceTimeLabel)}</p>
        <p class="final-schedule__time final-schedule__time--local">Local: ${escapeHtml(session.localTimeLabel)}</p>
      </li>`;
    })
    .join('');
}

export function renderFinalSchedule(container, viewModel, options = {}) {
  requireContainer(container);

  if (!viewModel || typeof viewModel !== 'object') {
    throw new Error('A valid viewModel is required');
  }

  if (viewModel.status === 'unpublished') {
    container.innerHTML = `<section class="final-schedule final-schedule--unpublished" data-testid="unpublished-view">
      <h2>Final Schedule</h2>
      <p class="final-schedule__notice" data-testid="unpublished-notice">${escapeHtml(viewModel.notice.message)}</p>
      <ul class="final-schedule__sessions" data-testid="session-list"></ul>
    </section>`;
    return;
  }

  if (viewModel.status !== 'published') {
    throw new Error('Unknown final schedule status');
  }

  const withinPostLoginActionWindow = options.withinPostLoginActionWindow !== false;
  const actionHint = viewModel.viewerContext.isAuthenticated
    ? `<p class="final-schedule__action-hint" data-testid="action-hint">${withinPostLoginActionWindow ? 'Loaded within 2 actions after login.' : 'Loaded after 2 actions post login.'}</p>`
    : '';

  container.innerHTML = `<section class="final-schedule final-schedule--published" data-testid="published-view">
    <h2>Final Schedule</h2>
    ${actionHint}
    <ul class="final-schedule__sessions" data-testid="session-list">${renderPublishedSessions(viewModel.sessions)}</ul>
  </section>`;
}
