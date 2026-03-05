import { describe, expect, it } from 'vitest';
import { createLaunchMockSchedulePayload } from '../../../src/models/final-schedule-mock-data.js';

describe('final-schedule-mock-data', () => {
  it('returns published mock schedule by default', () => {
    const payload = createLaunchMockSchedulePayload();

    expect(payload.status).toBe('published');
    expect(payload.sessions).toHaveLength(2);
    expect(payload.viewerContext.viewerRole).toBe('anonymous');
  });

  it('returns unpublished mock payload when requested', () => {
    const payload = createLaunchMockSchedulePayload({ status: 'unpublished' });

    expect(payload.status).toBe('unpublished');
    expect(payload.notice.code).toBe('SCHEDULE_UNPUBLISHED');
    expect(payload.sessions).toBeUndefined();
  });
});
