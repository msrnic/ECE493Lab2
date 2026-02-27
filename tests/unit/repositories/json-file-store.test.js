import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createJsonFileStore } from '../../../src/repositories/json-file-store.js';
import { createTempPersistencePaths } from '../../helpers/persistence-paths.js';

describe('json-file-store', () => {
  it('creates a missing file from initial state and clones reads/writes', () => {
    const paths = createTempPersistencePaths('json-store-create-');
    const filePath = path.join(paths.databaseDirectory, 'custom.json');
    const store = createJsonFileStore({
      filePath,
      initialState: {
        items: []
      }
    });

    const firstRead = store.read();
    expect(firstRead).toEqual({ items: [] });
    firstRead.items.push('mutated');
    expect(store.read()).toEqual({ items: [] });

    const written = store.write({ items: ['a'] });
    expect(written).toEqual({ items: ['a'] });
    written.items.push('b');
    expect(store.read()).toEqual({ items: ['a'] });
  });

  it('uses existing file contents when file already exists', () => {
    const paths = createTempPersistencePaths('json-store-existing-');
    const filePath = path.join(paths.databaseDirectory, 'existing.json');
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify({ value: 7 }));

    const store = createJsonFileStore({
      filePath,
      initialState: {
        value: 0
      }
    });

    expect(store.read()).toEqual({ value: 7 });
  });
});
