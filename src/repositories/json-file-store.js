import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function createJsonFileStore({ filePath, initialState }) {
  const resolvedFilePath = path.resolve(filePath);
  const normalizedInitialState = clone(initialState);

  mkdirSync(path.dirname(resolvedFilePath), { recursive: true });
  if (!existsSync(resolvedFilePath)) {
    writeJson(resolvedFilePath, normalizedInitialState);
  }

  function read() {
    return clone(readJson(resolvedFilePath));
  }

  function write(nextState) {
    const normalized = clone(nextState);
    writeJson(resolvedFilePath, normalized);
    return clone(normalized);
  }

  return {
    filePath: resolvedFilePath,
    read,
    write
  };
}
