import { describe, expect, it } from 'vitest';
import {
  createPaperFile,
  createPaperFileBundle,
  markAvailable,
  markTemporarilyUnavailable
} from '../../../src/models/paper-file-bundle.model.js';

describe('paper-file-bundle.model', () => {
  it('validates individual files and available bundles', () => {
    const file = createPaperFile({
      fileId: 'f1',
      fileName: 'paper.pdf',
      contentType: 'application/pdf',
      sizeBytes: 10,
      checksum: 'abc'
    });

    const bundle = createPaperFileBundle({
      paperId: 'paper-1',
      files: [file],
      availabilityStatus: 'available',
      generatedAt: '2026-02-08T00:00:00.000Z'
    });

    expect(bundle.files).toHaveLength(1);
    expect(() => createPaperFile({ fileId: 'f2', fileName: 'x', contentType: 'a', sizeBytes: -1 })).toThrow(/at least 0/);
  });

  it('enforces availability transitions', () => {
    expect(() => createPaperFileBundle({
      paperId: 'paper-2',
      files: [],
      availabilityStatus: 'available'
    })).toThrow(/non-empty/);

    const unavailable = createPaperFileBundle({
      paperId: 'paper-2',
      files: [],
      availabilityStatus: 'temporarily-unavailable'
    });
    expect(unavailable.availabilityStatus).toBe('temporarily-unavailable');

    const available = markAvailable(unavailable, [{
      fileId: 'file-1',
      fileName: 'slides.pdf',
      contentType: 'application/pdf',
      sizeBytes: 3
    }], {
      generatedAt: '2026-02-08T03:00:00.000Z'
    });
    expect(available.availabilityStatus).toBe('available');

    const unavailableAgain = markTemporarilyUnavailable(available, {
      generatedAt: '2026-02-08T03:01:00.000Z'
    });
    expect(unavailableAgain.files).toEqual([]);

    const defaultNowUnavailable = markTemporarilyUnavailable(available);
    expect(defaultNowUnavailable.availabilityStatus).toBe('temporarily-unavailable');
    const defaultNowAvailable = markAvailable(defaultNowUnavailable, [{
      fileId: 'file-2',
      fileName: 'camera-ready.pdf',
      contentType: 'application/pdf',
      sizeBytes: 11
    }]);
    expect(defaultNowAvailable.availabilityStatus).toBe('available');
  });
});
