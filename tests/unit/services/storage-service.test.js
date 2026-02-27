import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createStorageService } from '../../../src/services/storage-service.js';
import { createTempPersistencePaths } from '../../helpers/persistence-paths.js';

describe('storage-service', () => {
  it('stores and retrieves file snapshots', async () => {
    const paths = createTempPersistencePaths('storage-service-');
    const service = createStorageService({
      uploadsDirectory: paths.uploadsDirectory,
      metadataFilePath: paths.storageDataFilePath,
      keyFactory: ({ submissionId, category }) => `${submissionId}/${category}/1`
    });

    const result = await service.saveFile({
      submissionId: 'sub-1',
      category: 'manuscript',
      file: {
        originalname: 'paper.pdf',
        mimetype: 'application/pdf',
        size: 128
      }
    });

    expect(result.storageKey).toBe('sub-1/manuscript/1');
    expect(service.getFile(result.storageKey)).toEqual({
      submissionId: 'sub-1',
      category: 'manuscript',
      originalFilename: 'paper.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 128,
      filePath: path.join(paths.uploadsDirectory, 'sub-1', 'manuscript', '1')
    });
    expect(service.getFile('missing')).toBeNull();
    expect(existsSync(path.join(paths.uploadsDirectory, 'sub-1', 'manuscript', '1'))).toBe(true);
  });

  it('fails when file is missing or save failure is injected', async () => {
    const paths = createTempPersistencePaths('storage-service-failure-');
    const service = createStorageService({
      uploadsDirectory: paths.uploadsDirectory,
      metadataFilePath: paths.storageDataFilePath
    });

    await expect(
      service.saveFile({
        submissionId: 'sub-1',
        category: 'manuscript',
        file: null
      })
    ).rejects.toThrow('FILE_REQUIRED');

    service.setFailNextSave();

    await expect(
      service.saveFile({
        submissionId: 'sub-1',
        category: 'manuscript',
        file: {
          originalname: 'paper.pdf',
          mimetype: 'application/pdf',
          size: 1
        }
      })
    ).rejects.toThrow('STORAGE_SAVE_FAILED');

    const recovery = await service.saveFile({
      submissionId: 'sub-1',
      category: 'manuscript',
      file: {
        originalname: 'paper.pdf',
        mimetype: 'application/pdf',
        size: 1
      }
    });
    expect(typeof recovery.storageKey).toBe('string');

    const fallback = await service.saveFile({
      submissionId: 'sub-2',
      category: 'supplementary',
      file: {
        path: path.join(paths.rootDirectory, 'does-not-exist.txt')
      }
    });
    expect(service.getFile(fallback.storageKey)).toEqual(
      expect.objectContaining({
        originalFilename: 'unknown',
        mimeType: 'application/octet-stream',
        sizeBytes: 0
      })
    );

    const withContent = await service.saveFile({
      submissionId: 'sub-3',
      category: 'manuscript',
      file: {
        content: 'hello'
      }
    });
    expect(readFileSync(service.getFile(withContent.storageKey).filePath, 'utf8')).toBe('hello');

    const withBuffer = await service.saveFile({
      submissionId: 'sub-4',
      category: 'manuscript',
      file: {
        buffer: Buffer.from('buffer-value')
      }
    });
    expect(readFileSync(service.getFile(withBuffer.storageKey).filePath, 'utf8')).toBe('buffer-value');

    const withBinaryContent = await service.saveFile({
      submissionId: 'sub-5',
      category: 'manuscript',
      file: {
        content: Buffer.from('binary-content')
      }
    });
    expect(readFileSync(service.getFile(withBinaryContent.storageKey).filePath, 'utf8')).toBe('binary-content');

    const externalSourcePath = path.join(paths.rootDirectory, 'external-upload.txt');
    writeFileSync(externalSourcePath, 'external');
    const withPathFile = await service.saveFile({
      submissionId: 'sub-6',
      category: 'manuscript',
      file: {
        path: externalSourcePath
      }
    });
    expect(readFileSync(service.getFile(withPathFile.storageKey).filePath, 'utf8')).toBe('external');
  });

  it('rejects empty and traversal storage keys', async () => {
    const paths = createTempPersistencePaths('storage-service-key-');
    const emptyKeyService = createStorageService({
      uploadsDirectory: paths.uploadsDirectory,
      metadataFilePath: paths.storageDataFilePath,
      keyFactory: () => '   '
    });
    await expect(
      emptyKeyService.saveFile({
        submissionId: 'sub-1',
        category: 'manuscript',
        file: { size: 1 }
      })
    ).rejects.toThrow('STORAGE_KEY_REQUIRED');

    const traversalKeyService = createStorageService({
      uploadsDirectory: paths.uploadsDirectory,
      metadataFilePath: paths.storageDataFilePath,
      keyFactory: () => '../outside'
    });
    await expect(
      traversalKeyService.saveFile({
        submissionId: 'sub-1',
        category: 'manuscript',
        file: { size: 1 }
      })
    ).rejects.toThrow('INVALID_STORAGE_KEY');

    const windowsSlashService = createStorageService({
      uploadsDirectory: paths.uploadsDirectory,
      metadataFilePath: paths.storageDataFilePath,
      keyFactory: () => 'sub\\manuscript\\win'
    });
    const saved = await windowsSlashService.saveFile({
      submissionId: 'sub-2',
      category: 'manuscript',
      file: { size: 1 }
    });
    expect(saved.storageKey).toBe('sub/manuscript/win');
  });

  it('handles metadata files missing filesByStorageKey and undefined lookup keys', () => {
    const paths = createTempPersistencePaths('storage-service-fallback-');
    mkdirSync(path.dirname(paths.storageDataFilePath), { recursive: true });
    writeFileSync(paths.storageDataFilePath, JSON.stringify({}));

    const service = createStorageService({
      uploadsDirectory: paths.uploadsDirectory,
      metadataFilePath: paths.storageDataFilePath
    });

    expect(service.getFile(undefined)).toBeNull();
  });
});
