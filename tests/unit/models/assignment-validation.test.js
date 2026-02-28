import { describe, expect, it } from 'vitest';
import {
  collectBlockingSelectionIds,
  hasAvailabilityConflict,
  hasCoiConflict,
  validateUniqueReviewers
} from '../../../src/models/AssignmentValidation.js';

describe('AssignmentValidation', () => {
  it('detects availability and COI conflicts', () => {
    expect(hasAvailabilityConflict({ availabilityStatus: 'unavailable' })).toBe(true);
    expect(hasAvailabilityConflict({ availabilityStatus: 'available' })).toBe(false);
    expect(hasCoiConflict({ coiFlag: true })).toBe(true);
    expect(hasCoiConflict({ coiFlag: false })).toBe(false);
  });

  it('validates reviewer uniqueness and required ids', () => {
    expect(() => validateUniqueReviewers([])).toThrow(/at least one reviewer/);
    expect(() => validateUniqueReviewers([{ reviewerId: '' }])).toThrow(/reviewerId is required/);
    expect(() => validateUniqueReviewers([{ reviewerId: 'r1' }, { reviewerId: 'r1' }])).toThrow(
      /must be unique/
    );
    expect(() => validateUniqueReviewers([{ reviewerId: 'r1' }, { reviewerId: 'r2' }])).not.toThrow();
  });

  it('collects blocking selection ids and handles empty input', () => {
    expect(collectBlockingSelectionIds()).toEqual([]);
    expect(
      collectBlockingSelectionIds([
        { selectionId: 's1', status: 'eligible' },
        { selectionId: 's2', status: 'needs_replacement' }
      ])
    ).toEqual(['s2']);
  });
});
