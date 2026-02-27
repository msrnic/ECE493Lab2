/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
  readPasswordChangeFormValues,
  renderPasswordChangePage,
  resolvePasswordChangeErrorMessage,
  setPasswordChangeStatus
} from '../../../src/views/password-change-view.js';

describe('password-change-view', () => {
  it('resolves blocked, explicit, and fallback error messages', () => {
    expect(
      resolvePasswordChangeErrorMessage({
        code: 'TEMPORARILY_BLOCKED',
        message: 'Too many incorrect password attempts. Try again later.',
        retryAfterSeconds: 45
      })
    ).toBe('Too many incorrect password attempts. Try again later. (45s)');

    expect(
      resolvePasswordChangeErrorMessage({
        code: 'TEMPORARILY_BLOCKED',
        retryAfterSeconds: 0
      })
    ).toBe('Too many incorrect password attempts. Try again later.');

    expect(
      resolvePasswordChangeErrorMessage({
        code: 'TEMPORARILY_BLOCKED',
        retryAfterSeconds: 12
      })
    ).toBe('Too many incorrect password attempts. Try again later. (12s)');

    expect(resolvePasswordChangeErrorMessage({ message: 'Specific error.' })).toBe('Specific error.');
    expect(resolvePasswordChangeErrorMessage({ message: '   ' })).toBe('Password change failed.');
  });

  it('updates status node data attributes and ignores missing node references', () => {
    setPasswordChangeStatus(null, { type: 'error', message: 'ignored' });

    const statusNode = document.createElement('p');
    setPasswordChangeStatus(statusNode, {
      type: 'success',
      message: 'Password updated successfully.'
    });

    expect(statusNode.dataset.status).toBe('success');
    expect(statusNode.textContent).toBe('Password updated successfully.');
  });

  it('reads password values from form data and supports null forms', () => {
    expect(readPasswordChangeFormValues(null)).toEqual({
      currentPassword: '',
      newPassword: ''
    });

    document.body.innerHTML = `
      <form>
        <input name="currentPassword" value="StrongPass!2026" />
        <input name="newPassword" value="NewStrongPass!2027" />
      </form>
    `;

    const form = document.querySelector('form');
    expect(readPasswordChangeFormValues(form)).toEqual({
      currentPassword: 'StrongPass!2026',
      newPassword: 'NewStrongPass!2027'
    });

    document.body.innerHTML = `
      <form>
        <input name=\"currentPassword\" value=\"StrongPass!2026\" />
      </form>
    `;
    const partialForm = document.querySelector('form');
    expect(readPasswordChangeFormValues(partialForm)).toEqual({
      currentPassword: 'StrongPass!2026',
      newPassword: ''
    });

    document.body.innerHTML = `
      <form>
        <input name=\"newPassword\" value=\"NewStrongPass!2027\" />
      </form>
    `;
    const missingCurrentForm = document.querySelector('form');
    expect(readPasswordChangeFormValues(missingCurrentForm)).toEqual({
      currentPassword: '',
      newPassword: 'NewStrongPass!2027'
    });
  });

  it('renders password-change page html and escapes the signed-in email', () => {
    const html = renderPasswordChangePage({
      email: '<script>alert(1)</script>@example.com'
    });

    expect(html).toContain('data-password-change-form');
    expect(html).toContain('/assets/css/password-change.css');
    expect(html).toContain('bootstrapPasswordChangePage');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;@example.com');

    const fallbackHtml = renderPasswordChangePage();
    expect(fallbackHtml).toContain('unknown user');
  });
});
