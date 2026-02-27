function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderDashboardPage({ email } = {}) {
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
      <p><a href="/account/password-change">Change password</a></p>
      <form method="post" action="/logout">
        <button type="submit" data-dashboard-logout>Log Out</button>
      </form>
    </main>
  </body>
</html>`;
}
