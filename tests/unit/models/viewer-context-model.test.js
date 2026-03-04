import { describe, expect, it } from 'vitest';
import { isAuthorViewer, normalizeViewerContext } from '../../../src/models/viewer-context-model.js';

describe('viewer-context-model', () => {
  it('normalizes unauthenticated viewers to anonymous', () => {
    expect(normalizeViewerContext({})).toEqual({
      isAuthenticated: false,
      viewerRole: 'anonymous',
      authorId: null
    });

    expect(normalizeViewerContext({
      isAuthenticated: false,
      viewerRole: 'author',
      authorId: 'author-1'
    })).toEqual({
      isAuthenticated: false,
      viewerRole: 'anonymous',
      authorId: null
    });
  });

  it('normalizes authenticated non-author viewers to other', () => {
    expect(normalizeViewerContext({
      isAuthenticated: true,
      viewerRole: 'editor',
      authorId: 'author-1'
    })).toEqual({
      isAuthenticated: true,
      viewerRole: 'other',
      authorId: null
    });
  });

  it('requires author id for authenticated author viewers', () => {
    expect(() => normalizeViewerContext({
      isAuthenticated: true,
      viewerRole: 'author',
      authorId: ''
    })).toThrow('Author viewers require a non-empty authorId.');

    expect(normalizeViewerContext({
      isAuthenticated: true,
      viewerRole: 'author',
      authorId: ' author-99 '
    })).toEqual({
      isAuthenticated: true,
      viewerRole: 'author',
      authorId: 'author-99'
    });
  });

  it('detects author viewers', () => {
    expect(isAuthorViewer({ isAuthenticated: true, viewerRole: 'author', authorId: 'a1' })).toBe(true);
    expect(isAuthorViewer({ isAuthenticated: true, viewerRole: 'author', authorId: '' })).toBe(false);
    expect(isAuthorViewer({ isAuthenticated: true, viewerRole: 'other', authorId: null })).toBe(false);
    expect(isAuthorViewer({ isAuthenticated: false, viewerRole: 'anonymous', authorId: null })).toBe(false);
  });
});
