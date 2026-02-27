import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createAuthController } from './controllers/auth-controller.js';
import { createConfirmationController } from './controllers/confirmation-controller.js';
import { createEmailDeliveryService } from './controllers/email-delivery-service.js';
import { getRegistrationPage } from './controllers/registration-page-controller.js';
import { createRegistrationController } from './controllers/registration-controller.js';
import { createInMemoryRepository } from './models/repository.js';
import { createAuthRoutes } from './routes/auth-routes.js';
import { renderDashboardPage } from './views/dashboard-view.js';
import { renderLoginPage } from './views/login-view.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function defaultSendEmail() {
  return { accepted: true };
}

export function createApp({
  repository = createInMemoryRepository(),
  sendEmail = defaultSendEmail,
  nowFn = () => new Date(),
  tokenTtlMs,
  hashPasswordFn,
  authSessionTtlMs,
  authNodeEnv
} = {}) {
  const app = express();
  const emailDeliveryService = createEmailDeliveryService({
    repository,
    sendEmail,
    nowFn
  });
  const authController = createAuthController({
    repository,
    nowFn,
    hashPasswordFn,
    nodeEnv: authNodeEnv,
    sessionStoreTtlMs: authSessionTtlMs
  });

  app.use(express.json());
  app.use('/assets', express.static(path.join(__dirname, 'assets')));

  app.get('/', (_req, res) => {
    res.status(302).redirect('/register');
  });

  app.get('/register', getRegistrationPage);
  app.get('/login', (_req, res) => {
    res.status(200).type('html').send(renderLoginPage());
  });
  app.get('/dashboard', (req, res) => {
    const session = authController.getAuthenticatedSession(req);
    if (!session) {
      res.status(302).redirect('/login');
      return;
    }

    res.status(200).type('html').send(renderDashboardPage({ email: session.user.email }));
  });
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
  app.use('/api/auth', createAuthRoutes({ authController }));

  app.use((error, _req, res, _next) => {
    void error;
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error.'
    });
  });

  app.locals.repository = repository;
  app.locals.emailDeliveryService = emailDeliveryService;
  app.locals.authController = authController;

  return app;
}
