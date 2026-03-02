import { describe, expect, it } from 'vitest';

import ScheduleGenerationEngine from '../../../src/models/services/ScheduleGenerationEngine.js';

const engine = new ScheduleGenerationEngine();

describe('ScheduleGenerationEngine', () => {
  it('returns no output when inputs are empty', () => {
    expect(engine.generate({ acceptedPapers: [], sessionSlots: [] })).toEqual({
      assignments: [],
      conflicts: []
    });
  });

  it('creates deterministic assignments and conflicts', () => {
    const result = engine.generate({
      acceptedPapers: [
        { paperId: 'p2', trackId: 'ml' },
        { paperId: 'p1', trackId: 'ai' }
      ],
      sessionSlots: [
        {
          sessionSlotId: 'slot-2',
          trackId: 'systems',
          startAt: '2026-01-01T10:00:00.000Z',
          capacity: 1
        },
        {
          sessionSlotId: 'slot-1',
          trackId: 'ai',
          startAt: '2026-01-01T09:00:00.000Z',
          capacity: 1
        }
      ]
    });

    expect(result.assignments[0]).toEqual({
      paperId: 'p1',
      sessionSlotId: 'slot-1',
      orderInSlot: 1
    });

    const types = result.conflicts.map((item) => item.violationType);
    expect(types).toContain('optimization_mismatch');
    expect(types).toContain('preference_mismatch');
  });

  it('flags capacity conflicts per assigned paper', () => {
    const result = engine.generate({
      acceptedPapers: [
        { paperId: 'p1', trackId: 'ai' },
        { paperId: 'p2', trackId: 'ai' }
      ],
      sessionSlots: [
        {
          sessionSlotId: 'slot-1',
          trackId: 'ai',
          startAt: '2026-01-01T09:00:00.000Z',
          capacity: 1
        }
      ]
    });

    const capacityConflicts = result.conflicts.filter((item) => item.ruleId === 'SLOT_CAPACITY');
    expect(capacityConflicts).toHaveLength(2);
  });

  it('handles unused slots without creating capacity conflicts', () => {
    const result = engine.generate({
      acceptedPapers: [{ paperId: 'p1', trackId: 'ai' }],
      sessionSlots: [
        {
          sessionSlotId: 'slot-1',
          trackId: 'ai',
          startAt: '2026-01-01T09:00:00.000Z',
          capacity: 1
        },
        {
          sessionSlotId: 'slot-2',
          trackId: 'systems',
          startAt: '2026-01-01T10:00:00.000Z',
          capacity: 5
        }
      ]
    });

    const capacityConflicts = result.conflicts.filter((item) => item.ruleId === 'SLOT_CAPACITY');
    expect(capacityConflicts).toHaveLength(0);
  });
});
