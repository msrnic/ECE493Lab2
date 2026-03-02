import { describe, expect, test } from 'vitest';
import { normalizeViewerContext } from '../../src/models/viewer-context-model.js';

describe('normalizeViewerContext', () => {
  test('throws for non-object input', () => {
    expect(() => normalizeViewerContext(null)).toThrow('viewerContext must be an object');
  });

  test('throws for non-boolean isAuthenticated', () => {
    expect(() =>
      normalizeViewerContext({ isAuthenticated: 'yes', viewerRole: 'anonymous', authorId: null })
    ).toThrow('viewerContext.isAuthenticated must be a boolean');
  });

  test('throws for invalid role', () => {
    expect(() =>
      normalizeViewerContext({ isAuthenticated: false, viewerRole: 'guest', authorId: null })
    ).toThrow('viewerContext.viewerRole is invalid');
  });

  test('normalizes valid anonymous viewer', () => {
    expect(
      normalizeViewerContext({ isAuthenticated: false, viewerRole: 'anonymous', authorId: null })
    ).toEqual({
      isAuthenticated: false,
      viewerRole: 'anonymous',
      authorId: null
    });
  });

  test('throws for invalid anonymous invariants', () => {
    expect(() =>
      normalizeViewerContext({ isAuthenticated: true, viewerRole: 'anonymous', authorId: null })
    ).toThrow('anonymous viewers must be unauthenticated with null authorId');
  });

  test('throws when author role is unauthenticated', () => {
    expect(() =>
      normalizeViewerContext({ isAuthenticated: false, viewerRole: 'author', authorId: 'A-1' })
    ).toThrow('author viewerRole requires authenticated context');
  });

  test('throws when author role has empty authorId', () => {
    expect(() =>
      normalizeViewerContext({ isAuthenticated: true, viewerRole: 'author', authorId: '   ' })
    ).toThrow('author viewerRole requires non-empty authorId');
  });

  test('normalizes author role with trimmed authorId', () => {
    expect(
      normalizeViewerContext({ isAuthenticated: true, viewerRole: 'author', authorId: ' A-55 ' })
    ).toEqual({
      isAuthenticated: true,
      viewerRole: 'author',
      authorId: 'A-55'
    });
  });

  test('throws for unauthenticated non-author with non-null authorId', () => {
    expect(() =>
      normalizeViewerContext({ isAuthenticated: false, viewerRole: 'other', authorId: 'A-2' })
    ).toThrow('unauthenticated non-author viewer must have null authorId');
  });

  test('normalizes non-author role and defaults undefined authorId to null', () => {
    expect(normalizeViewerContext({ isAuthenticated: true, viewerRole: 'other' })).toEqual({
      isAuthenticated: true,
      viewerRole: 'other',
      authorId: null
    });
  });
});
