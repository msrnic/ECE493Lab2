import { describe, expect, it } from 'vitest';
import { createTestServer, requestFor, saveDraft, withActor } from '../../test-utils.js';

describe('draft-controller save success', () => {
  it('saves draft snapshots and increments latest revision', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    const firstSave = await saveDraft(api, 'submission-1', { userId: 'author-1' }, {
      baseRevision: 0,
      metadata: { title: 'Draft A' },
      files: [
        {
          fileName: 'paper.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          checksum: 'file-a',
          storageKey: 'uploads/paper-a'
        }
      ]
    });

    expect(firstSave.status).toBe(200);
    expect(firstSave.body.revision).toBe(1);

    const secondSave = await saveDraft(api, 'submission-1', { userId: 'author-1' }, {
      baseRevision: 1,
      metadata: { title: 'Draft B' },
      files: []
    });

    expect(secondSave.status).toBe(200);
    expect(secondSave.body.revision).toBe(2);
    expect(secondSave.body.versionId).not.toBe(firstSave.body.versionId);

    const latest = await withActor(api.get('/api/submissions/submission-1/draft'), {
      userId: 'author-1'
    });

    expect(latest.status).toBe(200);
    expect(latest.body.revision).toBe(2);
    expect(latest.body.metadata).toEqual({ title: 'Draft B' });
  });

  it('accepts metadata and files encoded as strings', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    const response = await withActor(api.put('/api/submissions/submission-2/draft'), {
      userId: 'author-2'
    }).send({
      baseRevision: 0,
      metadata: JSON.stringify({ title: 'String metadata' }),
      files: JSON.stringify([
        {
          fileName: 'readme.txt',
          mimeType: 'text/plain',
          sizeBytes: 10,
          checksum: 'abc',
          storageKey: 'uploads/readme'
        }
      ])
    });

    expect(response.status).toBe(200);
  });

  it('rejects invalid request payloads', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    const badMetadata = await withActor(api.put('/api/submissions/submission-3/draft'), {
      userId: 'author-3'
    }).send({ baseRevision: 0, metadata: '{bad json}' });

    expect(badMetadata.status).toBe(400);

    const badFiles = await withActor(api.put('/api/submissions/submission-3/draft'), {
      userId: 'author-3'
    }).send({ baseRevision: 0, metadata: {}, files: '{not json}' });

    expect(badFiles.status).toBe(400);

    const badMetadataShape = await withActor(api.put('/api/submissions/submission-3/draft'), {
      userId: 'author-3'
    }).send({ baseRevision: 0, metadata: [] });

    expect(badMetadataShape.status).toBe(400);

    const badFilesWithValidationError = await withActor(api.put('/api/submissions/submission-3/draft'), {
      userId: 'author-3'
    }).send({
      baseRevision: 0,
      metadata: null,
      files: JSON.stringify([
        {
          fileName: 'file.bin',
          mimeType: 'application/unknown',
          sizeBytes: 10,
          checksum: 'x',
          storageKey: 'k'
        }
      ])
    });

    expect(badFilesWithValidationError.status).toBe(400);
  });
});
