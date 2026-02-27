/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapPasswordChangePage } from '../../../src/assets/js/app.js';

function setPasswordChangeHtml() {
  document.body.innerHTML = `
    <form data-password-change-form>
      <input name="currentPassword" />
      <input name="newPassword" />
      <button type="submit">Update</button>
    </form>
    <p data-password-change-status></p>
  `;
}

describe('password-change app bootstrap', () => {
  beforeEach(() => {
    setPasswordChangeHtml();
  });

  it('returns not enhanced when password-change form is absent', () => {
    document.body.innerHTML = '<div>missing form</div>';

    const result = bootstrapPasswordChangePage({
      documentRef: document,
      fetchImpl: vi.fn()
    });

    expect(result).toEqual({
      enhanced: false
    });
  });

  it('enhances password-change page when required elements exist', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockReturnValue(null)
      },
      json: async () => ({
        status: 'updated',
        message: 'Password updated successfully.'
      })
    });

    const result = bootstrapPasswordChangePage({
      documentRef: document,
      fetchImpl
    });

    expect(result).toEqual({
      enhanced: true
    });

    const form = document.querySelector('[data-password-change-form]');
    form.querySelector('[name="currentPassword"]').value = 'StrongPass!2026';
    form.querySelector('[name="newPassword"]').value = 'NewStrongPass!2027';
    form.dispatchEvent(new Event('submit'));

    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
