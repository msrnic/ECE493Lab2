/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enhanceRegistrationForm,
  measureValidation,
  renderClientErrors,
  submitRegistrationRequest,
  validateClientRegistration
} from '../../src/assets/js/registration-form.js';

function setFormHtml() {
  document.body.innerHTML = `
    <form data-registration-form>
      <input name="fullName" />
      <p data-error-for="fullName"></p>
      <input name="email" />
      <p data-error-for="email"></p>
      <input name="password" />
      <p data-error-for="password"></p>
      <input name="confirmPassword" />
      <p data-error-for="confirmPassword"></p>
      <button type="submit">Register</button>
    </form>
    <p data-registration-status></p>
  `;
}

describe('registration-form asset', () => {
  beforeEach(() => {
    setFormHtml();
  });

  it('validates client fields', () => {
    expect(
      validateClientRegistration({
        fullName: 'User',
        email: 'user@example.com',
        password: 'StrongPass!2026',
        confirmPassword: 'StrongPass!2026'
      })
    ).toEqual([]);

    const invalid = validateClientRegistration({
      fullName: '',
      email: 'invalid',
      password: 'weak',
      confirmPassword: 'different'
    });

    expect(invalid.map((item) => item.field)).toEqual([
      'fullName',
      'email',
      'password',
      'confirmPassword'
    ]);
  });

  it('handles missing values and non-function timer inputs', () => {
    const errors = validateClientRegistration({});
    expect(errors.map((item) => item.field)).toEqual([
      'fullName',
      'email',
      'password'
    ]);

    const measured = measureValidation({}, null);
    expect(measured.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('measures validation duration and never returns negative duration', () => {
    let tick = 50;
    const nowFn = () => {
      tick += 10;
      return tick;
    };

    const result = measureValidation(
      {
        fullName: 'User',
        email: 'user@example.com',
        password: 'StrongPass!2026',
        confirmPassword: 'StrongPass!2026'
      },
      nowFn
    );

    expect(result.errors).toEqual([]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    const defaultTimerResult = measureValidation({
      fullName: 'User',
      email: 'user@example.com',
      password: 'StrongPass!2026',
      confirmPassword: 'StrongPass!2026'
    });
    expect(defaultTimerResult.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('renders field errors and clears stale values', () => {
    const form = document.querySelector('[data-registration-form]');
    form.querySelector('[data-error-for="email"]').textContent = 'stale';

    renderClientErrors(form, [{ field: 'email', message: 'Email format is invalid.' }]);

    expect(form.querySelector('[data-error-for="email"]').textContent).toBe('Email format is invalid.');
    expect(form.querySelector('[data-error-for="fullName"]').textContent).toBe('');

    renderClientErrors(form, [{ field: 'global', message: 'ignored slot' }]);
    expect(form.querySelector('[data-error-for="email"]').textContent).toBe('');
  });

  it('submits registration request and handles invalid-json response', async () => {
    await expect(submitRegistrationRequest({}, { fetchImpl: null })).rejects.toThrow(
      'fetchImpl must be provided'
    );

    const okResult = await submitRegistrationRequest(
      {
        fullName: 'User',
        email: 'user@example.com',
        password: 'StrongPass!2026',
        confirmPassword: 'StrongPass!2026'
      },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ message: 'ok' })
        })
      }
    );

    expect(okResult.ok).toBe(true);

    const invalidJsonResult = await submitRegistrationRequest(
      {
        fullName: 'User',
        email: 'user@example.com',
        password: 'StrongPass!2026',
        confirmPassword: 'StrongPass!2026'
      },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => {
            throw new Error('bad json');
          }
        })
      }
    );

    expect(invalidJsonResult.payload.code).toBe('INVALID_RESPONSE');
  });

  it('enhances form and handles validation, success, and failure branches', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          message: 'Registration successful.',
          confirmationUrl: '/api/registrations/confirm?token=abc123'
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          message: 'One or more fields are invalid.',
          errors: [{ field: 'email', message: 'Email format is invalid.' }]
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      });

    const enhanced = enhanceRegistrationForm({ documentRef: document, fetchImpl, nowFn: () => 100 });
    expect(enhanced).not.toBeNull();

    const form = enhanced.form;
    const statusNode = enhanced.statusNode;
    const submitEvent = { preventDefault() {} };

    form.querySelector('[name="fullName"]').value = '';
    form.querySelector('[name="email"]').value = 'bad';
    form.querySelector('[name="password"]').value = 'weak';
    form.querySelector('[name="confirmPassword"]').value = 'nope';

    await enhanced.onSubmit(submitEvent);

    expect(statusNode.textContent).toBe('Please fix the highlighted fields.');
    expect(fetchImpl).toHaveBeenCalledTimes(0);

    form.querySelector('[name="fullName"]').value = 'User';
    form.querySelector('[name="email"]').value = 'user@example.com';
    form.querySelector('[name="password"]').value = 'StrongPass!2026';
    form.querySelector('[name="confirmPassword"]').value = 'StrongPass!2026';

    await enhanced.onSubmit(submitEvent);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(statusNode.textContent).toContain('Registration successful.');
    expect(statusNode.querySelector('a').getAttribute('href')).toBe('/api/registrations/confirm?token=abc123');

    form.querySelector('[name="fullName"]').value = 'User';
    form.querySelector('[name="email"]').value = 'user@example.com';
    form.querySelector('[name="password"]').value = 'StrongPass!2026';
    form.querySelector('[name="confirmPassword"]').value = 'StrongPass!2026';

    await enhanced.onSubmit(submitEvent);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(form.querySelector('[data-error-for="email"]').textContent).toBe('Email format is invalid.');
    expect(statusNode.textContent).toBe('One or more fields are invalid.');

    form.querySelector('[name="fullName"]').value = 'User';
    form.querySelector('[name="email"]').value = 'user@example.com';
    await enhanced.onSubmit(submitEvent);

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(statusNode.textContent).toBe('Registration failed.');
  });

  it('returns null when document or required nodes are missing', () => {
    expect(enhanceRegistrationForm({ documentRef: null })).toBeNull();

    document.body.innerHTML = '<div>missing form</div>';
    expect(enhanceRegistrationForm({ documentRef: document })).toBeNull();
  });

  it('uses default nowFn in enhance flow when not provided', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({})
    });

    const enhanced = enhanceRegistrationForm({ documentRef: document, fetchImpl });
    enhanced.form.querySelector('[name="fullName"]').value = 'User';
    enhanced.form.querySelector('[name="email"]').value = 'user@example.com';
    enhanced.form.querySelector('[name="password"]').value = 'StrongPass!2026';
    enhanced.form.querySelector('[name="confirmPassword"]').value = 'StrongPass!2026';

    await enhanced.onSubmit({ preventDefault() {} });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(enhanced.form.dataset.validationDurationMs).toBeDefined();
    expect(enhanced.statusNode.textContent).toBe('Registration successful.');
  });
});
