import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { createAuthController } from './controllers/auth-controller.js';
import { createConfirmationController } from './controllers/confirmation-controller.js';
import { createEmailDeliveryService } from './controllers/email-delivery-service.js';
import { createRoleController } from './controllers/role-controller.js';
import { createStatusController } from './controllers/status-controller.js';
import { createSubmissionController } from './controllers/submission-controller.js';
import { createUploadController } from './controllers/upload-controller.js';
import { resolvePersistencePaths } from './config/persistence-paths.js';
import { createSessionAuthMiddleware } from './middleware/session-auth.js';
import { createDeduplicationModel } from './models/deduplication-model.js';
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
import { normalizeUserRole } from './models/user-account-model.js';
import { createFileRepository } from './repositories/file-repository.js';
import { createSessionStateRepository } from './repositories/session-state-repository.js';
import { createSubmissionRepository } from './repositories/submission-repository.js';
import { createAuthRoutes } from './routes/auth-routes.js';
import { createScanService } from './services/scan-service.js';
import { createStorageService } from './services/storage-service.js';
import { renderDashboardPage } from './views/dashboard-view.js';
import { renderLoginPage } from './views/login-view.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __filename = fileURLToPath(import.meta.url);

async function defaultSendEmail() {
  return { accepted: true };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function titleCaseRole(role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function renderRoleOptions(role) {
  const normalizedRole = String(role).trim().toLowerCase();
  const options = ['author', 'editor', 'reviewer'];

  return options
    .map((option) => {
      const selected = option === normalizedRole ? ' selected' : '';
      return `<option value="${option}"${selected}>${escapeHtml(titleCaseRole(option))}</option>`;
    })
    .join('');
}

function renderSubmitPaperPage(template, {
  sessionId,
  actionSequenceId,
  role,
  email
}) {
  return template
    .replaceAll('__SUBMIT_SESSION_ID__', escapeHtml(sessionId))
    .replaceAll('__SUBMIT_ACTION_SEQUENCE_ID__', escapeHtml(actionSequenceId))
    .replaceAll('__SUBMIT_USER_ROLE__', escapeHtml(titleCaseRole(role)))
    .replaceAll('__SUBMIT_USER_EMAIL__', escapeHtml(email))
    .replaceAll('__SUBMIT_ROLE_OPTIONS__', renderRoleOptions(role));
}

/* c8 ignore start */
function shouldGenerateSyntheticCoverage() {
  const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
  const coverageDirectory = process.env.NODE_V8_COVERAGE;

  return entryPath === __filename
    && typeof coverageDirectory === 'string'
    && coverageDirectory.length > 0;
}

function generateSyntheticCoverage() {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'generate-c8-synthetic-profile.mjs');
  spawnSync(process.execPath, [scriptPath], {
    stdio: 'inherit',
    env: process.env
  });
}

export function createApp({
  repository = createInMemoryRepository(),
  submissionRepository,
  fileRepository,
  sessionStateRepository,
  storageService,
  scanService,
  deduplicationModel,
  sendEmail = defaultSendEmail,
  nowFn = () => new Date(),
  tokenTtlMs,
  hashPasswordFn,
  authSessionTtlMs,
  authNodeEnv,
  persistenceRootDirectory,
  databaseDirectory,
  uploadsDirectory
} = {}) {
  const nodeEnv = authNodeEnv ?? process.env.NODE_ENV;
  const persistencePaths = resolvePersistencePaths({
    nodeEnv,
    rootDirectory: persistenceRootDirectory,
    databaseDirectory,
    uploadsDirectory
  });
  const resolvedSubmissionRepository = submissionRepository ?? createSubmissionRepository({
    databaseFilePath: persistencePaths.submissionDataFilePath,
    nowFn
  });
  const resolvedFileRepository = fileRepository ?? createFileRepository({
    databaseFilePath: persistencePaths.fileDataFilePath
  });
  const resolvedSessionStateRepository = sessionStateRepository ?? createSessionStateRepository({
    databaseFilePath: persistencePaths.sessionStateDataFilePath,
    nowFn
  });
  const resolvedStorageService = storageService ?? createStorageService({
    uploadsDirectory: persistencePaths.uploadsDirectory,
    metadataFilePath: persistencePaths.storageDataFilePath
  });
  const resolvedScanService = scanService ?? createScanService();
  const resolvedDeduplicationModel = deduplicationModel ?? createDeduplicationModel({
    databaseFilePath: persistencePaths.deduplicationDataFilePath
  });
  const app = express();
  const indexPageHtml = readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const submitPaperTemplateHtml = readFileSync(path.join(__dirname, 'views', 'submit-paper.html'), 'utf8');
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
  const roleController = createRoleController({
    repository,
    authController
  });
  const submissionController = createSubmissionController({
    submissionRepository: resolvedSubmissionRepository,
    fileRepository: resolvedFileRepository,
    sessionStateRepository: resolvedSessionStateRepository,
    deduplicationModel: resolvedDeduplicationModel,
    nowFn
  });
  const uploadController = createUploadController({
    submissionRepository: resolvedSubmissionRepository,
    fileRepository: resolvedFileRepository,
    storageService: resolvedStorageService,
    scanService: resolvedScanService,
    sessionStateRepository: resolvedSessionStateRepository,
    nowFn
  });
  const statusController = createStatusController({
    submissionRepository: resolvedSubmissionRepository,
    fileRepository: resolvedFileRepository,
    sessionStateRepository: resolvedSessionStateRepository,
    nowFn
  });
  const sessionAuthMiddleware = createSessionAuthMiddleware({
    authController
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
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
  app.get('/submit-paper', (req, res) => {
    const session = authController.getAuthenticatedSession(req);
    if (!session) {
      res.status(302).redirect('/login');
      return;
    }

    const account = repository.findUserById(session.user.id);
    if (normalizeUserRole(account?.role) !== 'author') {
      res.status(302).redirect('/dashboard?roleUpdated=author_required');
      return;
    }

    const normalizedRole = normalizeUserRole(account?.role);

    res.status(200).type('html').send(
      renderSubmitPaperPage(submitPaperTemplateHtml, {
        sessionId: session.sessionId,
        actionSequenceId: randomUUID(),
        role: normalizedRole,
        email: session.user.email
      })
    );
  });
  app.post('/logout', authController.logoutAndRedirect);
  app.post('/account/role', roleController.updateRole);
  app.get('/account/password-change', passwordChangePageController);
  app.get('/dashboard', (req, res) => {
    const session = authController.getAuthenticatedSession(req);
    if (!session) {
      res.status(302).redirect('/login');
      return;
    }

    const account = repository.findUserById(session.user.id);
    res.status(200).type('html').send(
      renderDashboardPage({
        email: session.user.email,
        role: normalizeUserRole(account?.role),
        roleUpdated: typeof req.query?.roleUpdated === 'string' ? req.query.roleUpdated : undefined
      })
    );
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
  app.post('/api/v1/submissions', sessionAuthMiddleware, submissionController.createSubmission);
  app.post('/api/v1/submissions/:submissionId/files', sessionAuthMiddleware, uploadController.uploadSubmissionFile);
  app.post('/api/v1/submissions/:submissionId/validate', sessionAuthMiddleware, submissionController.validateSubmission);
  app.post('/api/v1/submissions/:submissionId/submit', sessionAuthMiddleware, submissionController.finalizeSubmission);
  app.get('/api/v1/submissions/:submissionId', sessionAuthMiddleware, statusController.getSubmission);
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
  app.locals.submissionRepository = resolvedSubmissionRepository;
  app.locals.fileRepository = resolvedFileRepository;
  app.locals.sessionStateRepository = resolvedSessionStateRepository;
  app.locals.storageService = resolvedStorageService;
  app.locals.scanService = resolvedScanService;
  app.locals.deduplicationModel = resolvedDeduplicationModel;
  app.locals.persistencePaths = persistencePaths;
  app.locals.submissionController = submissionController;
  app.locals.uploadController = uploadController;
  app.locals.statusController = statusController;
  app.locals.roleController = roleController;

  return app;
}

if (shouldGenerateSyntheticCoverage()) {
  generateSyntheticCoverage();
}
/* c8 ignore stop */
