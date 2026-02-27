import { validatePasswordPolicy } from './registration-validation.js';

export const PASSWORD_POLICY_VIOLATION_MESSAGE =
  'Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.';
export const NEW_PASSWORD_SAME_AS_CURRENT_MESSAGE =
  'New password must be different from current password.';
export const REQUIRED_PASSWORD_FIELDS_MESSAGE =
  'Current password and new password are required.';

export function validatePasswordChangeInput(
  { currentPassword, newPassword } = {},
  { policyValidator = validatePasswordPolicy } = {}
) {
  if (!currentPassword || !newPassword) {
    return {
      valid: false,
      code: 'INVALID_REQUEST',
      message: REQUIRED_PASSWORD_FIELDS_MESSAGE,
      issues: []
    };
  }

  if (currentPassword === newPassword) {
    return {
      valid: false,
      code: 'NEW_PASSWORD_SAME_AS_CURRENT',
      message: NEW_PASSWORD_SAME_AS_CURRENT_MESSAGE,
      issues: ['NEW_PASSWORD_SAME_AS_CURRENT']
    };
  }

  const issues = policyValidator(newPassword);
  if (!Array.isArray(issues)) {
    return {
      valid: false,
      code: 'PASSWORD_POLICY_VIOLATION',
      message: PASSWORD_POLICY_VIOLATION_MESSAGE,
      issues: ['PASSWORD_POLICY_VALIDATOR_ERROR']
    };
  }

  if (issues.length > 0) {
    return {
      valid: false,
      code: 'PASSWORD_POLICY_VIOLATION',
      message: PASSWORD_POLICY_VIOLATION_MESSAGE,
      issues
    };
  }

  return {
    valid: true,
    code: 'OK',
    message: 'Password change input is valid.',
    issues: []
  };
}
