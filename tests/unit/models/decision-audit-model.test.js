import { describe, expect, it } from 'vitest';
import {
  DECISION_AUDIT_OUTCOMES,
  createDecisionAuditModel
} from '../../../src/models/decision-audit-model.js';

describe('decision-audit-model', () => {
  it('records, filters, and clears audit entries', () => {
    const model = createDecisionAuditModel({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z'),
      idFactory: (() => {
        let index = 0;
        return () => `audit-${++index}`;
      })()
    });

    const entryOne = model.recordEntry({
      paperId: 'PAPER-1',
      editorId: 'editor-1',
      actionAttempted: 'DEFER',
      outcome: DECISION_AUDIT_OUTCOMES.SUCCESS_DEFER,
      reason: ''
    });
    const entryTwo = model.recordEntry({
      paperId: 'PAPER-1',
      editorId: 'editor-2',
      actionAttempted: 'FINAL',
      outcome: DECISION_AUDIT_OUTCOMES.DENIED_UNASSIGNED,
      reason: 'Not assigned'
    });

    expect(entryOne.auditId).toBe('audit-1');
    expect(entryOne.reason).toBeNull();
    expect(entryTwo.reason).toBe('Not assigned');
    expect(model.listEntries({ paperId: 'PAPER-1' })).toHaveLength(2);
    expect(model.listEntries({ editorId: 'editor-1' })).toHaveLength(1);
    expect(model.listEntries({ outcome: DECISION_AUDIT_OUTCOMES.DENIED_UNASSIGNED })).toHaveLength(1);

    model.clearEntries();
    expect(model.listEntries()).toEqual([]);
  });

  it('supports seed entries and configurable persistence failures', () => {
    const model = createDecisionAuditModel({
      seedEntries: [{
        paperId: 'PAPER-2',
        editorId: 'editor-1',
        actionAttempted: 'DEFER',
        outcome: DECISION_AUDIT_OUTCOMES.SUCCESS_DEFER,
        occurredAt: '2026-02-08T00:00:00.000Z'
      }],
      idFactory: () => 'audit-seed'
    });
    expect(model.listEntries()).toHaveLength(1);

    model.setShouldFailPersist(true);
    expect(() => model.recordEntry({
      paperId: 'PAPER-2',
      editorId: 'editor-1',
      actionAttempted: 'FINAL',
      outcome: DECISION_AUDIT_OUTCOMES.SUCCESS_FINAL
    })).toThrow(/AUDIT_WRITE_FAILED/);

    model.setShouldFailPersist((entry) => entry.outcome === DECISION_AUDIT_OUTCOMES.DENIED_INVALID);
    expect(() => model.recordEntry({
      paperId: 'PAPER-2',
      editorId: 'editor-1',
      actionAttempted: 'FINAL',
      outcome: DECISION_AUDIT_OUTCOMES.DENIED_INVALID
    })).toThrow(/AUDIT_WRITE_FAILED/);

    model.setShouldFailPersist(false);
    expect(model.recordEntry({
      paperId: 'PAPER-2',
      editorId: 'editor-1',
      actionAttempted: 'FINAL',
      outcome: DECISION_AUDIT_OUTCOMES.SUCCESS_FINAL
    }).auditId).toBe('audit-seed');
  });

  it('validates required audit fields', () => {
    const model = createDecisionAuditModel({
      idFactory: () => ''
    });

    expect(() => model.recordEntry({
      paperId: 'PAPER-3',
      editorId: 'editor-1',
      actionAttempted: 'DEFER',
      outcome: DECISION_AUDIT_OUTCOMES.SUCCESS_DEFER
    })).toThrow(/auditId must be a non-empty string/);

    const validModel = createDecisionAuditModel({
      idFactory: () => 'audit-1'
    });
    expect(() => validModel.recordEntry({
      paperId: '',
      editorId: 'editor-1',
      actionAttempted: 'DEFER',
      outcome: DECISION_AUDIT_OUTCOMES.SUCCESS_DEFER
    })).toThrow(/paperId must be a non-empty string/);
    expect(() => validModel.recordEntry({
      paperId: 'PAPER-3',
      editorId: 'editor-1',
      actionAttempted: 'UNKNOWN',
      outcome: DECISION_AUDIT_OUTCOMES.SUCCESS_DEFER
    })).toThrow(/actionAttempted must be one of/);
    expect(() => validModel.recordEntry({
      paperId: 'PAPER-3',
      editorId: 'editor-1',
      actionAttempted: 'DEFER',
      outcome: 'UNKNOWN'
    })).toThrow(/outcome must be one of/);
    expect(() => validModel.recordEntry({
      paperId: 'PAPER-3',
      editorId: 'editor-1',
      actionAttempted: 'DEFER',
      outcome: DECISION_AUDIT_OUTCOMES.SUCCESS_DEFER,
      occurredAt: 'invalid-date'
    })).toThrow(/occurredAt must be a valid date/);
  });
});
