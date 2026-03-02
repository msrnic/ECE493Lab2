import { describe, expect, it } from 'vitest';
import {
  DECISION_ACTIONS,
  DECISION_ERROR_CODES,
  DECISION_STATUSES,
  FINAL_OUTCOMES,
  createDecisionModel,
  validateDecisionCommand
} from '../../../src/models/decision-model.js';

describe('decision-model', () => {
  it('validates command payloads for defer and final actions', () => {
    expect(validateDecisionCommand({
      action: 'DEFER',
      expectedVersion: 2
    })).toEqual({
      action: DECISION_ACTIONS.DEFER,
      expectedVersion: 2,
      finalOutcome: null
    });

    expect(validateDecisionCommand({
      action: 'FINAL',
      expectedVersion: 1,
      finalOutcome: 'accept'
    })).toEqual({
      action: DECISION_ACTIONS.FINAL,
      expectedVersion: 1,
      finalOutcome: FINAL_OUTCOMES.ACCEPT
    });

    expect(() => validateDecisionCommand()).toThrow(/decision command must be an object/);
    expect(() => validateDecisionCommand({
      action: 'invalid',
      expectedVersion: 1
    })).toThrow(/action must be DEFER or FINAL/);
    expect(() => validateDecisionCommand({
      action: 'DEFER',
      expectedVersion: 1,
      finalOutcome: 'REJECT'
    })).toThrow(/finalOutcome must not be provided/);
    expect(() => validateDecisionCommand({
      action: 'FINAL',
      expectedVersion: 1,
      finalOutcome: ''
    })).toThrow(/finalOutcome must be a non-empty string/);
    expect(() => validateDecisionCommand({
      action: 'FINAL',
      expectedVersion: 0,
      finalOutcome: 'ACCEPT'
    })).toThrow(/expectedVersion must be an integer >= 1/);
  });

  it('returns denied outcomes for unassigned, unavailable reviews, and invalid payloads', () => {
    const model = createDecisionModel();

    const deniedUnassigned = model.evaluateDecision({
      paperId: 'PAPER-1',
      command: { action: 'DEFER', expectedVersion: 1 },
      context: {
        authorized: false,
        reviewsAvailable: true,
        now: '2026-02-08T00:00:00.000Z'
      }
    });
    expect(deniedUnassigned.ok).toBe(false);
    expect(deniedUnassigned.statusCode).toBe(403);
    expect(deniedUnassigned.error.code).toBe(DECISION_ERROR_CODES.DENIED_UNASSIGNED);

    const deniedUnassignedWithMissingAction = model.evaluateDecision({
      paperId: 'PAPER-1',
      command: {},
      context: {
        authorized: false,
        reviewsAvailable: true,
        now: '2026-02-08T00:00:00.000Z'
      }
    });
    expect(deniedUnassignedWithMissingAction.actionAttempted).toBe(DECISION_ACTIONS.FINAL);

    const deniedPrecondition = model.evaluateDecision({
      paperId: 'PAPER-1',
      command: { action: 'DEFER', expectedVersion: 1 },
      context: {
        authorized: true,
        reviewsAvailable: false,
        now: '2026-02-08T00:00:00.000Z'
      }
    });
    expect(deniedPrecondition.ok).toBe(false);
    expect(deniedPrecondition.statusCode).toBe(412);
    expect(deniedPrecondition.error.code).toBe(DECISION_ERROR_CODES.DENIED_PRECONDITION);

    const deniedInvalid = model.evaluateDecision({
      paperId: 'PAPER-1',
      command: { action: 'FINAL', expectedVersion: 1, finalOutcome: 'MAYBE' },
      context: {
        authorized: true,
        reviewsAvailable: true,
        now: '2026-02-08T00:00:00.000Z'
      }
    });
    expect(deniedInvalid.ok).toBe(false);
    expect(deniedInvalid.statusCode).toBe(422);
    expect(deniedInvalid.error.code).toBe(DECISION_ERROR_CODES.DENIED_INVALID);

    const deniedMissingPaper = () => model.evaluateDecision({
      paperId: '',
      command: { action: 'DEFER', expectedVersion: 1 },
      context: {
        authorized: true,
        reviewsAvailable: true,
        now: '2026-02-08T00:00:00.000Z'
      }
    });
    expect(deniedMissingPaper).toThrow(/paperId must be a non-empty string/);
  });

  it('applies defer and final transitions and handles conflict and immutable outcomes', () => {
    const model = createDecisionModel();

    const deferResult = model.evaluateDecision({
      paperId: 'PAPER-2',
      command: {
        action: 'DEFER',
        expectedVersion: 1
      },
      context: {
        authorized: true,
        reviewsAvailable: true,
        editorId: 'editor-1',
        now: '2026-02-08T00:00:00.000Z'
      }
    });
    expect(deferResult.ok).toBe(true);
    expect(deferResult.response.decisionStatus).toBe(DECISION_STATUSES.UNDECIDED);
    model.commitDecision({
      paperId: 'PAPER-2',
      nextState: deferResult.nextState
    });
    expect(model.getDecisionState('PAPER-2').decisionVersion).toBe(2);

    const finalResult = model.evaluateDecision({
      paperId: 'PAPER-2',
      command: {
        action: 'FINAL',
        expectedVersion: 2,
        finalOutcome: 'REJECT'
      },
      context: {
        authorized: true,
        reviewsAvailable: true,
        editorId: 'editor-1',
        now: '2026-02-08T00:01:00.000Z'
      }
    });
    expect(finalResult.ok).toBe(true);
    expect(finalResult.response.finalOutcome).toBe(FINAL_OUTCOMES.REJECT);
    model.commitDecision({
      paperId: 'PAPER-2',
      nextState: finalResult.nextState
    });

    const immutable = model.evaluateDecision({
      paperId: 'PAPER-2',
      command: {
        action: 'FINAL',
        expectedVersion: 3,
        finalOutcome: 'ACCEPT'
      },
      context: {
        authorized: true,
        reviewsAvailable: true,
        editorId: 'editor-1',
        now: '2026-02-08T00:02:00.000Z'
      }
    });
    expect(immutable.ok).toBe(false);
    expect(immutable.statusCode).toBe(409);
    expect(immutable.error.code).toBe(DECISION_ERROR_CODES.DENIED_IMMUTABLE);
    expect(immutable.error.overrideWorkflowUrl).toContain('/override/papers/PAPER-2');

    const conflict = model.evaluateDecision({
      paperId: 'PAPER-2',
      command: {
        action: 'DEFER',
        expectedVersion: 1
      },
      context: {
        authorized: true,
        reviewsAvailable: true,
        editorId: 'editor-1',
        now: '2026-02-08T00:03:00.000Z'
      }
    });
    expect(conflict.ok).toBe(false);
    expect(conflict.error.code).toBe(DECISION_ERROR_CODES.DENIED_CONFLICT);
  });

  it('normalizes and validates decision states during upsert and commit', () => {
    const model = createDecisionModel({
      seedDecisions: [{
        paperId: 'PAPER-SEED',
        decisionStatus: 'UNDECIDED',
        decisionVersion: 4
      }]
    });
    expect(model.getDecisionState('PAPER-SEED').decisionVersion).toBe(4);

    model.upsertDecisionState({
      paperId: 'PAPER-3',
      decisionStatus: 'FINAL',
      finalOutcome: 'REVISE',
      finalizedByEditorId: 'editor-2',
      finalizedAt: '2026-02-08T03:00:00.000Z',
      decisionVersion: 2
    });
    expect(model.getDecisionState('PAPER-3').finalOutcome).toBe(FINAL_OUTCOMES.REVISE);

    expect(() => model.upsertDecisionState({
      paperId: 'PAPER-4',
      decisionStatus: 'FINAL',
      decisionVersion: 1
    })).toThrow(/finalOutcome must be a non-empty string/);

    expect(() => model.upsertDecisionState({
      paperId: 'PAPER-4',
      decisionStatus: 'FINAL',
      finalOutcome: 'ACCEPT',
      finalizedByEditorId: 'editor-2',
      finalizedAt: 'not-a-date',
      decisionVersion: 1
    })).toThrow(/finalizedAt must be a valid date/);

    expect(() => model.commitDecision({
      paperId: 'PAPER-5',
      nextState: {
        decisionStatus: 'INVALID',
        decisionVersion: 1
      }
    })).toThrow(/decisionStatus must be UNDECIDED or FINAL/);
  });

  it('requires editorId for successful final transitions', () => {
    const model = createDecisionModel();

    expect(() => model.evaluateDecision({
      paperId: 'PAPER-6',
      command: {
        action: 'FINAL',
        expectedVersion: 1,
        finalOutcome: 'ACCEPT'
      },
      context: {
        authorized: true,
        reviewsAvailable: true,
        now: '2026-02-08T00:00:00.000Z'
      }
    })).toThrow(/editorId must be a non-empty string/);

    const deniedWithoutNow = model.evaluateDecision({
      paperId: 'PAPER-7',
      command: {
        action: 'DEFER',
        expectedVersion: 1
      },
      context: {
        authorized: false,
        reviewsAvailable: true
      }
    });
    expect(deniedWithoutNow.ok).toBe(false);
  });
});
