import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import ScheduleGenerationEngine from '../../../src/models/services/ScheduleGenerationEngine.js';

describe('SC-002 schedule generation performance baseline', () => {
  it('generates a moderate workload within a practical upper bound', () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/sc002-load-fixture.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const engine = new ScheduleGenerationEngine();
    const started = Date.now();
    const result = engine.generate({
      acceptedPapers: fixture.acceptedPapers,
      sessionSlots: fixture.sessionSlots
    });
    const elapsedMs = Date.now() - started;

    expect(result.assignments).toHaveLength(300);
    expect(elapsedMs).toBeLessThan(2000);
  });
});
