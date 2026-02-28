import { describe, expect, it } from 'vitest';
import {
  createDraftFileReference,
  getAllowedDraftMimeTypes,
  normalizeDraftFileReferences
} from '../../../src/models/draft-file-reference-model.js';

describe('draft-file-reference-model', () => {
  it('creates and normalizes file references', () => {
    const file = createDraftFileReference(
      {
        fileName: '  paper   v1.pdf ',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        checksum: 'abc',
        storageKey: 's1'
      },
      { idFactory: () => 'f-1', now: () => '2026-01-01T00:00:00.000Z' }
    );

    expect(file.fileId).toBe('f-1');
    expect(file.fileName).toBe('paper v1.pdf');
  });

  it('rejects invalid input shapes and values', () => {
    expect(() => createDraftFileReference(null)).toThrow(/object/);
    expect(() =>
      createDraftFileReference({
        fileName: 10,
        mimeType: 'application/pdf',
        sizeBytes: 1,
        checksum: 'c',
        storageKey: 's'
      })
    ).toThrow(/fileName/);
    expect(() =>
      createDraftFileReference({
        fileName: '   ',
        mimeType: 'application/pdf',
        sizeBytes: 1,
        checksum: 'c',
        storageKey: 's'
      })
    ).toThrow(/fileName is required/);
    expect(() =>
      createDraftFileReference({
        fileName: 'name',
        mimeType: 'invalid/type',
        sizeBytes: 1,
        checksum: 'c',
        storageKey: 's'
      })
    ).toThrow(/mimeType/);
    expect(() =>
      createDraftFileReference({
        fileName: 'name',
        mimeType: 'application/pdf',
        sizeBytes: 0,
        checksum: 'c',
        storageKey: 's'
      })
    ).toThrow(/sizeBytes/);
    expect(() =>
      createDraftFileReference({
        fileName: 'name',
        mimeType: 'application/pdf',
        sizeBytes: 1,
        checksum: ' ',
        storageKey: 's'
      })
    ).toThrow(/checksum/);
    expect(() =>
      createDraftFileReference({
        fileName: 'name',
        mimeType: 'application/pdf',
        sizeBytes: 1,
        checksum: 'c',
        storageKey: ' '
      })
    ).toThrow(/storageKey/);
  });

  it('normalizes arrays and rejects non-array/duplicates', () => {
    expect(normalizeDraftFileReferences(null)).toEqual([]);
    expect(() => normalizeDraftFileReferences({})).toThrow(/array/);

    const duplicate = [
      {
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1,
        checksum: 'same',
        storageKey: '1'
      },
      {
        fileName: 'A.PDF',
        mimeType: 'application/pdf',
        sizeBytes: 2,
        checksum: 'same',
        storageKey: '2'
      }
    ];

    expect(() => normalizeDraftFileReferences(duplicate)).toThrow(/duplicate/);
  });

  it('exposes allowed mime types', () => {
    expect(getAllowedDraftMimeTypes()).toContain('application/pdf');
  });
});
