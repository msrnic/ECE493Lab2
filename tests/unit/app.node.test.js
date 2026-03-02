/**
 * @vitest-environment node
 */

import { describe, expect, test } from 'vitest';

describe('app module without document global', () => {
  test('module import succeeds when document is undefined', async () => {
    const originalDocument = globalThis.document;
    delete globalThis.document;

    const module = await import('../../src/assets/js/app.js');

    expect(module.bootstrapFinalScheduleApp).toBeTypeOf('function');
    expect(module.registerFinalScheduleOnLoad).toBeTypeOf('function');

    if (originalDocument !== undefined) {
      globalThis.document = originalDocument;
    }
  });

  test('bootstrap and register are no-ops without document ref', async () => {
    const module = await import('../../src/assets/js/app.js');
    await expect(module.bootstrapFinalScheduleApp({ documentRef: null })).resolves.toBeNull();
    expect(() => module.registerFinalScheduleOnLoad({ documentRef: null })).not.toThrow();
  });
});
