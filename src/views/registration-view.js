function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderFieldError(errorsByField, field) {
  const error = errorsByField[field];
  if (!error) {
    return '';
  }

  return `<p class="field-error" data-error-for="${field}">${escapeHtml(error.message)}</p>`;
}

export function renderRegistrationPage({ values = {}, errors = [] } = {}) {
  const errorsByField = Object.fromEntries(errors.map((item) => [item.field, item]));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Register Account</title>
    <link rel="stylesheet" href="/assets/css/registration.css" />
  </head>
  <body>
    <main>
      <h1>Create your CMS account</h1>
      <form action="/api/registrations" method="post" novalidate data-registration-form>
        <label>
          Full name
          <input name="fullName" autocomplete="name" value="${escapeHtml(values.fullName ?? '')}" />
        </label>
        ${renderFieldError(errorsByField, 'fullName')}

        <label>
          Email
          <input name="email" type="email" autocomplete="email" value="${escapeHtml(values.email ?? '')}" />
        </label>
        ${renderFieldError(errorsByField, 'email')}

        <label>
          Password
          <input name="password" type="password" autocomplete="new-password" />
        </label>
        ${renderFieldError(errorsByField, 'password')}

        <label>
          Confirm password
          <input name="confirmPassword" type="password" autocomplete="new-password" />
        </label>
        ${renderFieldError(errorsByField, 'confirmPassword')}

        <button type="submit">Register</button>
      </form>

      <p class="registration-status" aria-live="polite" data-registration-status></p>
    </main>
    <script type="module">
      import { enhanceRegistrationForm } from '/assets/js/registration-form.js';
      enhanceRegistrationForm();
    </script>
  </body>
</html>`;
}
