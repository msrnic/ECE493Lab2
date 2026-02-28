function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function titleCaseRole(role) {
  const normalized = String(role).trim().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function resolveRoleUpdateMessage(roleUpdated) {
  if (roleUpdated === 'updated') {
    return 'Role updated successfully.';
  }

  if (roleUpdated === 'unchanged') {
    return 'Role unchanged.';
  }

  if (roleUpdated === 'invalid') {
    return 'Invalid role selected.';
  }

  if (roleUpdated === 'author_required') {
    return 'Only author accounts can access paper submission. Change your role to author.';
  }

  if (roleUpdated === 'editor_required') {
    return 'Only editor accounts can assign reviewers. Change your role to editor.';
  }

  if (roleUpdated === 'reviewer_required') {
    return 'Only reviewer accounts can access reviewer workflows. Change your role to reviewer.';
  }

  return '';
}

function renderRoleOptions(role) {
  const normalizedRole = String(role).trim().toLowerCase();
  const options = ['author', 'editor', 'reviewer'];

  return options
    .map((option) => {
      const selected = option === normalizedRole ? ' selected' : '';
      return `<option value="${option}"${selected}>${titleCaseRole(option)}</option>`;
    })
    .join('');
}

export function renderDashboardPage({ email, role = 'author', roleUpdated } = {}) {
  const roleMessage = resolveRoleUpdateMessage(roleUpdated);
  const normalizedRole = String(role).trim().toLowerCase() || 'author';
  const submitSection = normalizedRole === 'author'
    ? '<p><a href="/submit-paper" data-dashboard-submit-paper>Submit paper</a></p>'
    : '<p data-dashboard-submit-paper-disabled>Switch your role to author to submit a paper.</p>';
  const assignmentSection = normalizedRole === 'editor'
    ? '<p><a href="/assign-reviewers" data-dashboard-assign-reviewers>Assign reviewers</a></p>'
    : '<p data-dashboard-assign-reviewers-disabled>Switch your role to editor to assign reviewers.</p>';
  const reviewerInboxSection = normalizedRole === 'reviewer'
    ? '<p><a href="/reviewer/invitations" data-dashboard-reviewer-inbox>Review invitation inbox</a></p>'
    : '<p data-dashboard-reviewer-inbox-disabled>Switch your role to reviewer to open invitation inbox.</p>';
  const reviewerPaperAccessSection = normalizedRole === 'reviewer'
    ? '<p><a href="/reviewer/papers" data-dashboard-reviewer-paper-access>Open assigned paper files</a></p>'
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dashboard</title>
  </head>
  <body>
    <main>
      <h1>Dashboard</h1>
      <p data-dashboard-user>Signed in as ${escapeHtml(email ?? 'unknown user')}.</p>
      <p data-dashboard-role>Current role: ${escapeHtml(titleCaseRole(normalizedRole))}</p>
      <form method="post" action="/account/role" data-dashboard-role-form>
        <label>
          Active role
          <select name="role" data-dashboard-role-select>
            ${renderRoleOptions(normalizedRole)}
          </select>
        </label>
        <button type="submit" data-dashboard-role-submit>Change role</button>
      </form>
      <p data-dashboard-role-status>${escapeHtml(roleMessage)}</p>
      ${submitSection}
      ${assignmentSection}
      ${reviewerInboxSection}
      ${reviewerPaperAccessSection}
      <p><a href="/account/password-change">Change password</a></p>
      <form method="post" action="/logout">
        <button type="submit" data-dashboard-logout>Log Out</button>
      </form>
    </main>
  </body>
</html>`;
}
