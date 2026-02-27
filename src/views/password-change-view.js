function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function resolvePasswordChangeErrorMessage(payload) {
  if (payload?.code === 'TEMPORARILY_BLOCKED') {
    if (Number.isFinite(payload.retryAfterSeconds) && payload.retryAfterSeconds > 0) {
      return `${payload.message ?? 'Too many incorrect password attempts. Try again later.'} (${payload.retryAfterSeconds}s)`;
    }

    return payload.message ?? 'Too many incorrect password attempts. Try again later.';
  }

  if (typeof payload?.message === 'string' && payload.message.trim().length > 0) {
    return payload.message;
  }

  return 'Password change failed.';
}

export function setPasswordChangeStatus(statusNode, { type = 'info', message = '' } = {}) {
  if (!statusNode) {
    return;
  }

  statusNode.dataset.status = type;
  statusNode.textContent = message;
}

export function readPasswordChangeFormValues(form) {
  if (!form) {
    return {
      currentPassword: '',
      newPassword: ''
    };
  }

  const values = Object.fromEntries(new FormData(form).entries());

  return {
    currentPassword: String(values.currentPassword ?? ''),
    newPassword: String(values.newPassword ?? '')
  };
}

export function renderPasswordChangePage({ email } = {}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Change Password</title>
    <link rel="stylesheet" href="/assets/css/password-change.css" />
  </head>
  <body>
    <main class="password-change-shell">
      <h1>Change Password</h1>
      <p class="password-change-context">Signed in as ${escapeHtml(email ?? 'unknown user')}.</p>
      <form novalidate data-password-change-form>
        <label>
          Current password
          <input name="currentPassword" type="password" autocomplete="current-password" />
        </label>

        <label>
          New password
          <input name="newPassword" type="password" autocomplete="new-password" />
        </label>

        <button type="submit">Update Password</button>
      </form>
      <p class="password-change-status" aria-live="polite" data-password-change-status></p>
      <p><a href="/dashboard">Back to dashboard</a></p>
    </main>
    <script type="module">
      import { bootstrapPasswordChangePage } from '/assets/js/app.js';
      bootstrapPasswordChangePage();
    </script>
  </body>
</html>`;
}
