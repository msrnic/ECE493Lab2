import { describe, expect, it } from 'vitest';
import { createScanService } from '../../../src/services/scan-service.js';

describe('scan-service', () => {
  it('returns forced, filename-based, and default scan outcomes', async () => {
    const service = createScanService();
    service.setForcedResult('forced.pdf', 'failed');

    await expect(
      service.scanFile({
        originalname: 'forced.pdf'
      })
    ).resolves.toEqual({ status: 'failed' });

    service.clearForcedResults();

    await expect(
      service.scanFile({
        originalname: 'virus-manuscript.pdf'
      })
    ).resolves.toEqual({ status: 'failed' });

    await expect(
      service.scanFile({
        originalname: 'clean.pdf'
      })
    ).resolves.toEqual({ status: 'passed' });

    await expect(service.scanFile()).resolves.toEqual({ status: 'passed' });
  });

  it('supports alternate default status and ignores empty forced-result keys', async () => {
    const service = createScanService({ defaultStatus: 'pending' });
    service.setForcedResult('', 'failed');

    await expect(
      service.scanFile({
        originalname: 'no-force.pdf'
      })
    ).resolves.toEqual({ status: 'pending' });
  });
});
