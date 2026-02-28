import { describe, expect, it } from 'vitest';
import {
  createDraftVersion,
  restoreDraftVersionAsLatest,
  toDraftVersionPayload,
  toDraftVersionSummary
} from '../../../src/models/draft-version-model.js';

describe('draft-version-model', () => {
  it('creates immutable versions and view models', () => {
    const version = createDraftVersion(
      {
        submissionId: 's1',
        revision: 1,
        savedByUserId: 'u1',
        metadataSnapshot: { title: 'T1' },
        fileReferences: [
          {
            fileName: 'paper.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 10,
            checksum: 'hash',
            storageKey: 'bucket/key'
          }
        ]
      },
      { idFactory: () => 'v1', now: () => '2026-01-01T00:00:00.000Z' }
    );

    expect(version.versionId).toBe('v1');
    expect(toDraftVersionSummary(version)).toEqual({
      versionId: 'v1',
      revision: 1,
      savedAt: '2026-01-01T00:00:00.000Z',
      savedByUserId: 'u1',
      restoredFromVersionId: null
    });
    expect(toDraftVersionPayload(version).metadata).toEqual({ title: 'T1' });
  });

  it('validates required fields and revision', () => {
    expect(() => createDraftVersion(null)).toThrow(/required/);
    expect(() => createDraftVersion({ savedByUserId: 'u1', revision: 1 })).toThrow(/submissionId/);
    expect(() => createDraftVersion({ submissionId: 's1', revision: 1 })).toThrow(/savedByUserId/);
    expect(() => createDraftVersion({ submissionId: 's1', savedByUserId: 'u1', revision: 0 })).toThrow(/revision/);
  });

  it('restores previous version as latest and rejects missing source', () => {
    const source = createDraftVersion(
      {
        submissionId: 's1',
        revision: 1,
        savedByUserId: 'u1',
        metadataSnapshot: { title: 'Original' },
        fileReferences: []
      },
      { idFactory: () => 'v-source', now: () => '2026-01-01T00:00:00.000Z' }
    );

    const restored = restoreDraftVersionAsLatest(
      source,
      {
        submissionId: 's1',
        revision: 2,
        savedByUserId: 'u2'
      },
      { idFactory: () => 'v2', now: () => '2026-01-01T00:01:00.000Z' }
    );

    expect(restored.versionId).toBe('v2');
    expect(restored.restoredFromVersionId).toBe('v-source');
    expect(() => restoreDraftVersionAsLatest(null, {})).toThrow(/does not exist/);
  });

  it('handles payload mapping when metadata or files are undefined', () => {
    const payload = toDraftVersionPayload({
      submissionId: 's1',
      versionId: 'v1',
      revision: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      savedByUserId: 'u1',
      restoredFromVersionId: null,
      metadataSnapshot: undefined,
      fileReferences: undefined
    });

    expect(payload.metadata).toBeUndefined();
    expect(payload.files).toBeUndefined();
  });

  it('uses default metadata and files when optional fields are omitted', () => {
    const version = createDraftVersion(
      {
        submissionId: 's2',
        revision: 1,
        savedByUserId: 'u2'
      },
      { idFactory: () => 'v-default', now: () => '2026-01-01T00:00:00.000Z' }
    );

    expect(version.metadataSnapshot).toEqual({});
    expect(version.fileReferences).toEqual([]);
  });

  it('uses default timestamp factory when now is omitted', () => {
    const version = createDraftVersion(
      {
        submissionId: 's-default-time',
        revision: 1,
        savedByUserId: 'u-default-time'
      },
      { idFactory: () => 'v-default-time' }
    );

    expect(version.versionId).toBe('v-default-time');
    expect(typeof version.createdAt).toBe('string');
  });
});
