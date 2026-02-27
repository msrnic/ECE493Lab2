import { createConfirmationController } from '../../src/controllers/confirmation-controller.js';
import { createEmailDeliveryService } from '../../src/controllers/email-delivery-service.js';
import { getRegistrationPage } from '../../src/controllers/registration-page-controller.js';
import { createRegistrationController } from '../../src/controllers/registration-controller.js';
import { createInMemoryRepository } from '../../src/models/repository.js';
import { createClock, validRegistrationPayload } from './test-support.js';

export function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    text: undefined,
    contentType: undefined,
    redirectLocation: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    type(value) {
      this.contentType = value;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.text = payload;
      return this;
    },
    redirect(statusOrPath, maybePath) {
      if (typeof maybePath === 'string') {
        this.statusCode = statusOrPath;
        this.redirectLocation = maybePath;
      } else {
        this.statusCode = 302;
        this.redirectLocation = statusOrPath;
      }
      return this;
    }
  };
}

export async function invokeHandler(handler, { body, query, headers } = {}) {
  const request = {
    body,
    query: query ?? {},
    headers: headers ?? {}
  };
  const response = createMockResponse();
  await handler(request, response);
  return response;
}

export function createHttpIntegrationContext({
  start = '2026-01-01T00:00:00.000Z',
  sendEmailImpl,
  tokenTtlMs,
  hashPasswordFn
} = {}) {
  const clock = createClock(start);
  const repository = createInMemoryRepository();
  const sentEmails = [];

  const sendEmail = async (payload) => {
    sentEmails.push(payload);

    if (typeof sendEmailImpl === 'function') {
      return sendEmailImpl(payload);
    }

    return { accepted: true };
  };

  const nowFn = clock.now;
  const emailDeliveryService = createEmailDeliveryService({
    repository,
    sendEmail,
    nowFn
  });

  const registrationController = createRegistrationController({
    repository,
    emailDeliveryService,
    nowFn,
    tokenTtlMs,
    hashPasswordFn
  });

  const confirmationController = createConfirmationController({
    repository,
    nowFn
  });

  return {
    repository,
    clock,
    sentEmails,
    registrationController,
    confirmationController,
    registrationPageController: getRegistrationPage,
    validRegistrationPayload
  };
}
