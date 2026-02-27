export function resolveLoginErrorMessage(payload) {
  if (payload?.error === 'LOGIN_TEMPORARILY_BLOCKED') {
    if (Number.isFinite(payload.retryAfterSeconds) && payload.retryAfterSeconds > 0) {
      return `${payload.message ?? 'Too many failed login attempts. Try again later.'} (${payload.retryAfterSeconds}s)`;
    }

    return payload.message ?? 'Too many failed login attempts. Try again later.';
  }

  if (typeof payload?.message === 'string' && payload.message.trim().length > 0) {
    return payload.message;
  }

  return 'Invalid email or password.';
}

export function renderLoginPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Log In</title>
    <link rel="stylesheet" href="/assets/css/login.css" />
  </head>
  <body>
    <main class="login-shell">
      <h1>Log in to your CMS account</h1>
      <form novalidate data-login-form>
        <label>
          Email
          <input name="email" type="email" autocomplete="email" />
        </label>

        <label>
          Password
          <input name="password" type="password" autocomplete="current-password" />
        </label>

        <button type="submit">Log In</button>
      </form>
      <p class="login-status" aria-live="polite" data-login-status></p>
    </main>
    <script type="module">
      import { bootstrapLoginPage } from '/assets/js/app.js';
      bootstrapLoginPage();
    </script>
  </body>
</html>`;
}
