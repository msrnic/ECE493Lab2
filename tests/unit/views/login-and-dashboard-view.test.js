import { describe, expect, it } from 'vitest';
import {
  renderDashboardPage,
  resolveRoleUpdateMessage
} from '../../../src/views/dashboard-view.js';
import {
  renderLoginPage,
  resolveLoginErrorMessage
} from '../../../src/views/login-view.js';

describe('login and dashboard views', () => {
  it('renders login errors for blocked, explicit, and fallback payloads', () => {
    expect(
      resolveLoginErrorMessage({
        error: 'LOGIN_TEMPORARILY_BLOCKED',
        message: 'Too many failed login attempts. Try again later.',
        retryAfterSeconds: 120
      })
    ).toBe('Too many failed login attempts. Try again later. (120s)');

    expect(
      resolveLoginErrorMessage({
        error: 'LOGIN_TEMPORARILY_BLOCKED',
        retryAfterSeconds: 10
      })
    ).toBe('Too many failed login attempts. Try again later. (10s)');

    expect(
      resolveLoginErrorMessage({
        error: 'LOGIN_TEMPORARILY_BLOCKED',
        retryAfterSeconds: 0
      })
    ).toBe('Too many failed login attempts. Try again later.');

    expect(resolveLoginErrorMessage({ message: 'Invalid email or password.' })).toBe(
      'Invalid email or password.'
    );
    expect(resolveLoginErrorMessage({ message: '   ' })).toBe('Invalid email or password.');
  });

  it('renders login page html shell', () => {
    const html = renderLoginPage();

    expect(html).toContain('data-login-form');
    expect(html).toContain('/assets/css/login.css');
    expect(html).toContain("bootstrapLoginPage");
  });

  it('renders dashboard page and escapes user email', () => {
    const html = renderDashboardPage({
      email: '<script>alert(1)</script>',
      role: 'author',
      roleUpdated: 'updated'
    });
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Current role: Author');
    expect(html).toContain('data-dashboard-role-form');
    expect(html).toContain('Role updated successfully.');
    expect(html).toContain('data-dashboard-submit-paper');
    expect(html).toContain('data-dashboard-assign-reviewers-disabled');
    expect(html).toContain('data-dashboard-reviewer-inbox-disabled');
    expect(html).toContain('href="/account/password-change"');
    expect(html).toContain('action="/logout"');
    expect(html).toContain('data-dashboard-logout');

    const fallback = renderDashboardPage({ role: 'editor', roleUpdated: 'author_required' });
    expect(fallback).toContain('unknown user');
    expect(fallback).toContain('Current role: Editor');
    expect(fallback).toContain('data-dashboard-submit-paper-disabled');
    expect(fallback).toContain('data-dashboard-assign-reviewers');
    expect(fallback).not.toContain('data-dashboard-assign-reviewers-disabled');
    expect(fallback).toContain('data-dashboard-reviewer-inbox-disabled');
    expect(fallback).toContain('Only author accounts can access paper submission');

    const reviewerDashboard = renderDashboardPage({ role: 'reviewer', roleUpdated: 'reviewer_required' });
    expect(reviewerDashboard).toContain('Current role: Reviewer');
    expect(reviewerDashboard).toContain('data-dashboard-reviewer-inbox');
    expect(reviewerDashboard).not.toContain('data-dashboard-reviewer-inbox-disabled');
    expect(reviewerDashboard).toContain('Only reviewer accounts can access invitation inbox');

    const unknownRole = renderDashboardPage({ role: ' ' });
    expect(unknownRole).toContain('Current role: Author');
    expect(unknownRole).toContain('Switch your role to editor to assign reviewers.');
  });

  it('resolves role update message variants', () => {
    expect(resolveRoleUpdateMessage('updated')).toBe('Role updated successfully.');
    expect(resolveRoleUpdateMessage('unchanged')).toBe('Role unchanged.');
    expect(resolveRoleUpdateMessage('invalid')).toBe('Invalid role selected.');
    expect(resolveRoleUpdateMessage('author_required')).toContain('Only author accounts');
    expect(resolveRoleUpdateMessage('editor_required')).toContain('Only editor accounts');
    expect(resolveRoleUpdateMessage('reviewer_required')).toContain('Only reviewer accounts');
    expect(resolveRoleUpdateMessage('unexpected')).toBe('');
  });
});
