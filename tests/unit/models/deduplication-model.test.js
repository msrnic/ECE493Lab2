import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDeduplicationModel } from '../../../src/models/deduplication-model.js';
import { createTempPersistencePaths } from '../../helpers/persistence-paths.js';

describe('deduplication-model', () => {
  it('detects duplicates by action sequence and idempotency key', () => {
    const paths = createTempPersistencePaths('dedup-model-');
    const model = createDeduplicationModel({
      databaseFilePath: paths.deduplicationDataFilePath
    });

    expect(
      model.checkDuplicate({
        actionSequenceId: 'action-1',
        idempotencyKey: 'idem-1'
      })
    ).toEqual({
      duplicate: false
    });

    model.markFinalized({
      actionSequenceId: 'action-1',
      idempotencyKey: 'idem-1',
      submissionId: 'sub-1'
    });

    expect(
      model.checkDuplicate({
        actionSequenceId: 'action-1',
        idempotencyKey: 'idem-new'
      })
    ).toEqual({
      duplicate: true,
      reason: 'ACTION_SEQUENCE_FINALIZED',
      submissionId: 'sub-1'
    });

    expect(
      model.checkDuplicate({
        actionSequenceId: 'action-2',
        idempotencyKey: 'idem-1'
      })
    ).toEqual({
      duplicate: true,
      reason: 'IDEMPOTENCY_REPLAY',
      submissionId: 'sub-1'
    });

    const reloaded = createDeduplicationModel({
      databaseFilePath: paths.deduplicationDataFilePath
    });
    expect(
      reloaded.checkDuplicate({
        actionSequenceId: 'action-1',
        idempotencyKey: null
      })
    ).toEqual({
      duplicate: true,
      reason: 'ACTION_SEQUENCE_FINALIZED',
      submissionId: 'sub-1'
    });
  });

  it('ignores missing idempotency keys while still allowing non-duplicate action sequences', () => {
    const paths = createTempPersistencePaths('dedup-model-no-idem-');
    const model = createDeduplicationModel({
      databaseFilePath: paths.deduplicationDataFilePath
    });

    model.markFinalized({
      actionSequenceId: 'action-1',
      idempotencyKey: null,
      submissionId: 'sub-1'
    });

    expect(
      model.checkDuplicate({
        actionSequenceId: 'action-2',
        idempotencyKey: null
      })
    ).toEqual({
      duplicate: false
    });
  });

  it('falls back to empty maps when persisted state is missing expected fields', () => {
    const paths = createTempPersistencePaths('dedup-model-fallback-');
    mkdirSync(path.dirname(paths.deduplicationDataFilePath), { recursive: true });
    writeFileSync(paths.deduplicationDataFilePath, JSON.stringify({}));

    const model = createDeduplicationModel({
      databaseFilePath: paths.deduplicationDataFilePath
    });

    expect(
      model.checkDuplicate({
        actionSequenceId: 'missing',
        idempotencyKey: 'missing'
      })
    ).toEqual({ duplicate: false });
  });
});
