import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import express from 'express';
import { createAuthController } from './controllers/auth-controller.js';
import { createConfirmationController } from './controllers/confirmation-controller.js';
import { createEmailDeliveryService } from './controllers/email-delivery-service.js';
import {
  createPasswordChangeApiController,
  createPasswordChangePageController
} from './controllers/password-change-controller.js';
import { getRegistrationPage } from './controllers/registration-page-controller.js';
import { createRegistrationController } from './controllers/registration-controller.js';
import { createAuditLogModel } from './models/audit-log-model.js';
import { createAttemptThrottleModel } from './models/attempt-throttle-model.js';
import { createNotificationModel } from './models/notification-model.js';
import { createPasswordChangeModel } from './models/password-change-model.js';
import { createInMemoryRepository } from './models/repository.js';
import { createSessionModel } from './models/session-model.js';
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
  const nodeEnv = authNodeEnv ?? process.env.NODE_ENV;
  const app = express();
  const indexPageHtml = readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const emailDeliveryService = createEmailDeliveryService({
    repository,
    sendEmail,
    nowFn
  });
  const authController = createAuthController({
    repository,
    nowFn,
    hashPasswordFn,
    nodeEnv,
    sessionStoreTtlMs: authSessionTtlMs
  });
  const attemptThrottleModel = createAttemptThrottleModel({ nowFn });
  const sessionModel = createSessionModel({
    sessionStore: authController.sessionStore,
    nowFn
  });
  const notificationModel = createNotificationModel({
    repository,
    nowFn
  });
  const auditLogModel = createAuditLogModel({
    repository,
    nowFn
  });
  const passwordChangeModel = createPasswordChangeModel({
    repository,
    nowFn,
    hashPasswordFn,
    attemptThrottleModel,
    sessionModel,
    notificationModel,
    auditLogModel
  });
  const passwordChangeApiController = createPasswordChangeApiController({
    authController,
    passwordChangeModel
  });
  const passwordChangePageController = createPasswordChangePageController({
    authController
  });

  app.use(express.json());
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
  app.use('/controllers', express.static(path.join(__dirname, 'controllers')));
  app.use('/models', express.static(path.join(__dirname, 'models')));
  app.use('/views', express.static(path.join(__dirname, 'views')));

  app.get('/', (_req, res) => {
    res.status(200).type('html').send(indexPageHtml);
  });

  app.get('/register', getRegistrationPage);
  app.get('/login', (_req, res) => {
    res.status(200).type('html').send(renderLoginPage());
  });
  app.post('/logout', authController.logoutAndRedirect);
  app.get('/account/password-change', passwordChangePageController);
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
      hashPasswordFn,
      includeConfirmationUrl: nodeEnv !== 'production'
    })
  );
  app.get('/api/registrations/confirm', createConfirmationController({ repository, nowFn }));
  app.post('/api/v1/account/password-change', passwordChangeApiController);
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
  app.locals.passwordChangeModel = passwordChangeModel;
  app.locals.attemptThrottleModel = attemptThrottleModel;
  app.locals.notificationModel = notificationModel;
  app.locals.auditLogModel = auditLogModel;

  return app;
}
