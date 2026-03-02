import { describe, expect, it } from 'vitest';

import GenerationPreconditionService from '../../../src/models/services/GenerationPreconditionService.js';

describe('US3 generation failure mapping', () => {
  it('maps missing accepted papers to NO_ACCEPTED_PAPERS', () => {
    const service = new GenerationPreconditionService();
    const result = service.validate({ acceptedPapers: [], sessionSlots: [] });

    expect(result.code).toBe('NO_ACCEPTED_PAPERS');
    expect(result.message).toMatch(/accepted paper/i);
  });
});
