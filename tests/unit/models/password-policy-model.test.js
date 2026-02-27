import { describe, expect, it } from 'vitest';
import {
  NEW_PASSWORD_SAME_AS_CURRENT_MESSAGE,
  PASSWORD_POLICY_VIOLATION_MESSAGE,
  REQUIRED_PASSWORD_FIELDS_MESSAGE,
  validatePasswordChangeInput
} from '../../../src/models/password-policy-model.js';

describe('password-policy-model', () => {
  it('rejects missing input fields', () => {
    const result = validatePasswordChangeInput({
      currentPassword: '',
      newPassword: ''
    });

    expect(result).toEqual({
      valid: false,
      code: 'INVALID_REQUEST',
      message: REQUIRED_PASSWORD_FIELDS_MESSAGE,
      issues: []
    });
  });

  it('rejects same current and new passwords', () => {
    const result = validatePasswordChangeInput({
      currentPassword: 'StrongPass!2026',
      newPassword: 'StrongPass!2026'
    });

    expect(result).toEqual({
      valid: false,
      code: 'NEW_PASSWORD_SAME_AS_CURRENT',
      message: NEW_PASSWORD_SAME_AS_CURRENT_MESSAGE,
      issues: ['NEW_PASSWORD_SAME_AS_CURRENT']
    });
  });

  it('rejects policy validator failures and validator-shape failures', () => {
    const policyViolation = validatePasswordChangeInput(
      {
        currentPassword: 'StrongPass!2026',
        newPassword: 'weak'
      },
      {
        policyValidator: () => ['PASSWORD_TOO_SHORT']
      }
    );

    expect(policyViolation).toEqual({
      valid: false,
      code: 'PASSWORD_POLICY_VIOLATION',
      message: PASSWORD_POLICY_VIOLATION_MESSAGE,
      issues: ['PASSWORD_TOO_SHORT']
    });

    const invalidValidatorResult = validatePasswordChangeInput(
      {
        currentPassword: 'StrongPass!2026',
        newPassword: 'AnotherStrongPass!2026'
      },
      {
        policyValidator: () => null
      }
    );

    expect(invalidValidatorResult).toEqual({
      valid: false,
      code: 'PASSWORD_POLICY_VIOLATION',
      message: PASSWORD_POLICY_VIOLATION_MESSAGE,
      issues: ['PASSWORD_POLICY_VALIDATOR_ERROR']
    });
  });

  it('accepts policy-compliant new passwords', () => {
    const result = validatePasswordChangeInput({
      currentPassword: 'StrongPass!2026',
      newPassword: 'NewStrongPass!2027'
    });

    expect(result).toEqual({
      valid: true,
      code: 'OK',
      message: 'Password change input is valid.',
      issues: []
    });
  });
});
