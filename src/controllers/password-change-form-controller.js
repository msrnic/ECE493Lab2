import { submitPasswordChangeRequest } from '../models/password-change-api-client.js';
import {
  readPasswordChangeFormValues,
  resolvePasswordChangeErrorMessage,
  setPasswordChangeStatus
} from '../views/password-change-view.js';

const REQUIRED_MESSAGE = 'Current password and new password are required.';
const UNEXPECTED_MESSAGE = 'Password change failed. Please try again.';

export function enhancePasswordChangeForm({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!documentRef) {
    return null;
  }

  const form = documentRef.querySelector('[data-password-change-form]');
  const statusNode = documentRef.querySelector('[data-password-change-status]');

  if (!form || !statusNode) {
    return null;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setPasswordChangeStatus(statusNode, { type: 'info', message: '' });

    const { currentPassword, newPassword } = readPasswordChangeFormValues(form);

    if (!currentPassword || !newPassword) {
      setPasswordChangeStatus(statusNode, {
        type: 'error',
        message: REQUIRED_MESSAGE
      });
      return;
    }

    try {
      const result = await submitPasswordChangeRequest(
        {
          currentPassword,
          newPassword
        },
        { fetchImpl }
      );

      if (result.ok && result.payload?.status === 'updated') {
        setPasswordChangeStatus(statusNode, {
          type: 'success',
          message: result.payload.message ?? 'Password updated successfully.'
        });
        form.reset();
        return;
      }

      setPasswordChangeStatus(statusNode, {
        type: 'error',
        message: resolvePasswordChangeErrorMessage(result.payload)
      });
    } catch {
      setPasswordChangeStatus(statusNode, {
        type: 'error',
        message: UNEXPECTED_MESSAGE
      });
    }
  };

  form.addEventListener('submit', onSubmit);

  return {
    form,
    statusNode,
    onSubmit
  };
}
