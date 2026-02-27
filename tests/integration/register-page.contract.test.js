import { describe, expect, it } from 'vitest';
import {
  createHttpIntegrationContext,
  invokeHandler
} from '../helpers/http-harness.js';

describe('contract: GET /register', () => {
  it('returns html registration page', async () => {
    const { registrationPageController } = createHttpIntegrationContext();

    const response = await invokeHandler(registrationPageController);

    expect(response.statusCode).toBe(200);
    expect(response.contentType).toBe('html');
    expect(response.text).toContain('<form');
    expect(response.text).toContain('name="fullName"');
  });
});
