import { describe, expect, it } from 'vitest';
import { renderTemporaryUnavailableView } from '../../../src/views/temporary-unavailable.view.js';

describe('temporary-unavailable.view', () => {
  it('renders outage and throttled payload variants', () => {
    const outage = renderTemporaryUnavailableView();
    expect(outage.outcome).toBe('temporarily-unavailable');
    expect(outage.immediateRetryAllowed).toBe(true);

    const throttled = renderTemporaryUnavailableView({ retryAfterSeconds: 3 });
    expect(throttled.outcome).toBe('throttled');
    expect(throttled.retryAfterSeconds).toBe(3);
  });
});
