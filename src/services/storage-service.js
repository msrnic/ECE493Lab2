import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createJsonFileStore } from '../repositories/json-file-store.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createStorageService({
  uploadsDirectory = path.join(process.cwd(), 'uploads'),
  metadataFilePath = path.join(process.cwd(), 'database', 'stored-files.json'),
  keyFactory = ({ submissionId, category }) => `${submissionId}/${category}/${randomUUID()}`
} = {}) {
  const resolvedUploadsDirectory = path.resolve(uploadsDirectory);
  const store = createJsonFileStore({
    filePath: metadataFilePath,
    initialState: {
      filesByStorageKey: {}
    }
  });
  let failNextSave = false;

  function readState() {
    const state = store.read();
    return {
      filesByStorageKey: state.filesByStorageKey ?? {}
    };
  }

  function normalizeStorageKey(storageKey) {
    return String(storageKey ?? '')
      .replaceAll('\\', '/')
      .replace(/^\/+/, '')
      .trim();
  }

  function toFileBuffer(file = {}) {
    if (Buffer.isBuffer(file.buffer)) {
      return file.buffer;
    }

    if (Buffer.isBuffer(file.content)) {
      return file.content;
    }

    if (typeof file.content === 'string') {
      return Buffer.from(file.content);
    }

    if (typeof file.path === 'string' && file.path.length > 0 && existsSync(file.path)) {
      return readFileSync(file.path);
    }

    return Buffer.alloc(0);
  }

  async function saveFile({ submissionId, category, file }) {
    if (!file) {
      throw new Error('FILE_REQUIRED');
    }

    if (failNextSave) {
      failNextSave = false;
      throw new Error('STORAGE_SAVE_FAILED');
    }

    const storageKey = normalizeStorageKey(keyFactory({ submissionId, category, file }));
    if (!storageKey) {
      throw new Error('STORAGE_KEY_REQUIRED');
    }

    const absoluteFilePath = path.resolve(resolvedUploadsDirectory, storageKey);
    const uploadsRootPath = `${resolvedUploadsDirectory}${path.sep}`;
    if (!absoluteFilePath.startsWith(uploadsRootPath) && absoluteFilePath !== resolvedUploadsDirectory) {
      throw new Error('INVALID_STORAGE_KEY');
    }

    mkdirSync(path.dirname(absoluteFilePath), { recursive: true });
    writeFileSync(absoluteFilePath, toFileBuffer(file));

    const snapshot = {
      submissionId,
      category,
      originalFilename: file.originalname ?? file.name ?? 'unknown',
      mimeType: file.mimetype ?? file.type ?? 'application/octet-stream',
      sizeBytes: Number(file.size ?? 0),
      filePath: absoluteFilePath
    };

    const state = readState();
    state.filesByStorageKey[storageKey] = clone(snapshot);
    store.write(state);

    return {
      storageKey
    };
  }

  function getFile(storageKey) {
    const state = readState();
    const normalizedKey = normalizeStorageKey(storageKey);
    const file = state.filesByStorageKey[normalizedKey];
    return file ? clone(file) : null;
  }

  function setFailNextSave(value = true) {
    failNextSave = Boolean(value);
  }

  return {
    saveFile,
    getFile,
    setFailNextSave
  };
}
