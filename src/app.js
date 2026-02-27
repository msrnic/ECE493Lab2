import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createConfirmationController } from './controllers/confirmation-controller.js';
import { createEmailDeliveryService } from './controllers/email-delivery-service.js';
import { getRegistrationPage } from './controllers/registration-page-controller.js';
import { createRegistrationController } from './controllers/registration-controller.js';
import { createInMemoryRepository } from './models/repository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function defaultSendEmail() {
  return { accepted: true };
}

export function createApp({
  repository = createInMemoryRepository(),
  sendEmail = defaultSendEmail,
  nowFn = () => new Date(),
  tokenTtlMs,
  hashPasswordFn
} = {}) {
  const app = express();
  const emailDeliveryService = createEmailDeliveryService({
    repository,
    sendEmail,
    nowFn
  });

  app.use(express.json());
  app.use('/assets', express.static(path.join(__dirname, 'assets')));

  app.get('/', (_req, res) => {
    res.status(302).redirect('/register');
  });

  app.get('/register', getRegistrationPage);
  app.post(
    '/api/registrations',
    createRegistrationController({
      repository,
      emailDeliveryService,
      nowFn,
      tokenTtlMs,
      hashPasswordFn
    })
  );
  app.get('/api/registrations/confirm', createConfirmationController({ repository, nowFn }));

  app.use((error, _req, res, _next) => {
    void error;
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error.'
    });
  });

  app.locals.repository = repository;
  app.locals.emailDeliveryService = emailDeliveryService;

  return app;
}
