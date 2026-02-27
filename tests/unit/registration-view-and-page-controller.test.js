import { describe, expect, it } from 'vitest';
import { getRegistrationPage } from '../../src/controllers/registration-page-controller.js';
import { renderRegistrationPage } from '../../src/views/registration-view.js';

describe('registration-view and page controller', () => {
  it('renders registration page with escaped values and field errors', () => {
    const html = renderRegistrationPage({
      values: {
        fullName: '<script>alert(1)</script>',
        email: 'user@example.com'
      },
      errors: [{ field: 'fullName', message: 'Full name is required.' }]
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('data-error-for="fullName"');
    expect(html).toContain('/assets/js/registration-form.js');
  });

  it('renders without errors when none provided', () => {
    const html = renderRegistrationPage();
    expect(html).toContain('<form');
    expect(html).not.toContain('field-error" data-error-for="email"');
  });

  it('sends html response from page controller', () => {
    const response = {
      statusCode: 0,
      contentType: '',
      body: '',
      status(code) {
        this.statusCode = code;
        return this;
      },
      type(contentType) {
        this.contentType = contentType;
        return this;
      },
      send(body) {
        this.body = body;
        return this;
      }
    };

    getRegistrationPage({}, response);

    expect(response.statusCode).toBe(200);
    expect(response.contentType).toBe('html');
    expect(response.body).toContain('Create your CMS account');
  });
});
