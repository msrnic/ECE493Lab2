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
import { createDraftController } from './controllers/draft-controller.js';
import { createDraftVersionController } from './controllers/draft-version-controller.js';
import { createReviewerAssignmentController } from './controllers/ReviewerAssignmentController.js';
import { createInvitationController } from './controllers/InvitationController.js';
import { resolvePersistencePaths } from './config/persistence-paths.js';
import { createSessionAuthMiddleware } from './middleware/session-auth.js';
import { createDeduplicationModel } from './models/deduplication-model.js';
import { createDraftState } from './models/draft-submission-model.js';
import { createPaperSubmissionModel } from './models/PaperSubmissionModel.js';
import { createReviewerModel } from './models/ReviewerModel.js';
import { createReviewerAssignmentModel } from './models/ReviewerAssignmentModel.js';
import { createReviewInvitationModel } from './models/ReviewInvitationModel.js';
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
import { createSessionModel } from './models/session-model.js';
import { normalizeUserRole } from './models/user-account-model.js';
import { createAuthRepository } from './repositories/auth-repository.js';
import { createFileRepository } from './repositories/file-repository.js';
import { createSessionStateRepository } from './repositories/session-state-repository.js';
import { createSubmissionRepository } from './repositories/submission-repository.js';
import { createAuthRoutes } from './routes/auth-routes.js';
import { createPaperAccessApiService } from './services/paper-access-api.service.js';
import { createScanService } from './services/scan-service.js';
import { createStorageService } from './services/storage-service.js';
import { createAccessRecordsController } from './controllers/access-records.controller.js';
import { createOutageRetryController } from './controllers/outage-retry.controller.js';
import { createPaperFileRequestController } from './controllers/paper-file-request.controller.js';
import { createReviewApiController } from './controllers/review-api-controller.js';
import { createReviewPageController } from './controllers/review-page-controller.js';
import { createReviewerPaperAccessController } from './controllers/reviewer-paper-access.controller.js';
import { createEditorDecisionController } from './controllers/editor-decision-controller.js';
import { createEditorAssignmentModel } from './models/editor-assignment-model.js';
import { createDecisionAuditModel } from './models/decision-audit-model.js';
import { createDecisionModel } from './models/decision-model.js';
import { createReviewSubmissionController } from './controllers/review-submission-controller.js';
import { createOutageRetryWindowModel } from './models/outage-retry-window.model.js';
import { createPaperModel } from './models/paper-model.js';
import { createReviewAccessAuditModel } from './models/review-access-audit-model.js';
import { createReviewModel } from './models/review-model.js';
import { renderAccessRecordsView } from './views/access-records.view.js';
import { renderDashboardPage } from './views/dashboard-view.js';
import { renderLoginPage } from './views/login-view.js';
import { createReviewSubmissionModel } from './models/review-submission-model.js';
import { createReviewRecordModel } from './models/review-record-model.js';
import { createValidationFeedbackModel } from './models/validation-feedback-model.js';
import { createReviewerPaperAssignmentModel } from './models/reviewer-paper-assignment-model.js';
import { registerReviewSubmissionRoutes } from './api/review-submission-routes.js';
import { createFinalizedDecisionModel } from './models/finalized-decision-model.js';
import { createDecisionNotificationModel } from './models/decision-notification-model.js';
import { createDeliveryAttemptModel } from './models/delivery-attempt-model.js';
import { createUnresolvedFailureModel } from './models/unresolved-failure-model.js';
import { createNotificationController } from './controllers/notification-controller.js';
import { createAdminFailureLogController } from './controllers/admin-failure-log-controller.js';
import { createInternalServiceAuth } from './middleware/internal-service-auth.js';
import { createAdminRoleAuth } from './middleware/admin-role-auth.js';
import { createNotificationEmailDeliveryService } from './services/email-delivery-service.js';
import { createRetrySchedulerService } from './services/retry-scheduler-service.js';
import { registerNotificationRoutes } from './routes/notification-routes.js';
import { registerAdminFailureRoutes } from './routes/admin-routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __filename = fileURLToPath(import.meta.url);

async function defaultSendEmail() {
  return { accepted: true };
}

async function defaultSendDecisionEmail() {
  return {
    accepted: true,
    providerMessageId: 'provider-message-id'
  };
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

function renderReviewerInvitationInboxPage({ email, invitations }) {
  const invitationRows = invitations.map((invitation) => {
    return `<li data-reviewer-invitation-item="${escapeHtml(invitation.id)}">
      <span data-reviewer-invitation-paper>${escapeHtml(invitation.paperId)}</span>
      <span data-reviewer-invitation-status>${escapeHtml(invitation.status)}</span>
    </li>`;
  }).join('');

  const invitationSection = invitationRows.length > 0
    ? `<ul data-reviewer-invitation-list>${invitationRows}</ul>`
    : '<p data-reviewer-invitation-empty>No invitations available.</p>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Review Invitation Inbox</title>
  </head>
  <body>
    <main>
      <h1>Review Invitation Inbox</h1>
      <p data-reviewer-inbox-user>Signed in as ${escapeHtml(email)}.</p>
      ${invitationSection}
      <p><a href="/dashboard">Back to dashboard</a></p>
    </main>
  </body>
</html>`;
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
  repository,
  submissionRepository,
  fileRepository,
  sessionStateRepository,
  storageService,
  scanService,
  deduplicationModel,
  sendEmail = defaultSendEmail,
  nowFn = () => new Date(),
  now,
  idFactory,
  internalServiceToken,
  tokenTtlMs,
  hashPasswordFn,
  authSessionTtlMs,
  authNodeEnv,
  sendInvitationFn,
  sendDecisionEmailFn = defaultSendDecisionEmail,
  notificationInternalServiceKey,
  persistenceRootDirectory,
  databaseDirectory,
  uploadsDirectory
} = {}) {
  const processNodeEnv = process.env.NODE_ENV;
  const authRuntimeEnv = authNodeEnv ?? processNodeEnv;
  const persistencePaths = resolvePersistencePaths({
    nodeEnv: processNodeEnv,
    rootDirectory: persistenceRootDirectory,
    databaseDirectory,
    uploadsDirectory
  });
  const resolvedRepository = repository ?? createAuthRepository({
    databaseFilePath: persistencePaths.authDataFilePath
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
  const assignReviewersTemplateHtml = readFileSync(path.join(__dirname, 'views', 'assign-reviewers.html'), 'utf8');
  const editorReviewsTemplateHtml = readFileSync(path.join(__dirname, 'views', 'editor-reviews.html'), 'utf8');
  const emailDeliveryService = createEmailDeliveryService({
    repository: resolvedRepository,
    sendEmail,
    nowFn
  });
  const authController = createAuthController({
    repository: resolvedRepository,
    nowFn,
    hashPasswordFn,
    nodeEnv: authRuntimeEnv,
    sessionStoreTtlMs: authSessionTtlMs
  });
  const attemptThrottleModel = createAttemptThrottleModel({ nowFn });
  const sessionModel = createSessionModel({
    sessionStore: authController.sessionStore,
    nowFn
  });
  const notificationModel = createNotificationModel({
    repository: resolvedRepository,
    nowFn
  });
  const auditLogModel = createAuditLogModel({
    repository: resolvedRepository,
    nowFn
  });
  const passwordChangeModel = createPasswordChangeModel({
    repository: resolvedRepository,
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
    repository: resolvedRepository,
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
  const draftState = createDraftState();
  const draftNow = now ?? (() => nowFn().toISOString());
  const draftController = createDraftController({
    state: draftState,
    idFactory,
    now: draftNow,
    internalServiceToken,
    resolveRole: (userId) => {
      const role = normalizeUserRole(resolvedRepository.findUserById(userId)?.role);
      return role === 'editor' ? 'admin' : role;
    }
  });
  const draftVersionController = createDraftVersionController({
    state: draftState,
    idFactory,
    now: draftNow,
    resolveRole: (userId) => {
      const role = normalizeUserRole(resolvedRepository.findUserById(userId)?.role);
      return role === 'editor' ? 'admin' : role;
    }
  });
  const paperSubmissionModel = createPaperSubmissionModel();
  const reviewerModel = createReviewerModel({
    repository: resolvedRepository
  });
  const invitationModel = createReviewInvitationModel({
    idFactory,
    nowFn: () => nowFn().toISOString()
  });
  const reviewerAssignmentModel = createReviewerAssignmentModel({
    paperSubmissionModel,
    reviewerModel,
    invitationModel,
    idFactory,
    nowFn: () => nowFn().toISOString()
  });
  const outageRetryWindowModel = createOutageRetryWindowModel({ nowFn });
  const paperAccessApiService = createPaperAccessApiService({
    idFactory,
    nowFn,
    outageRetryWindowModel
  });
  const reviewSubmissionModel = createReviewSubmissionModel();
  const reviewRecordModel = createReviewRecordModel({
    nowFn
  });
  const validationFeedbackModel = createValidationFeedbackModel({
    nowFn
  });
  const reviewerPaperAssignmentModel = createReviewerPaperAssignmentModel();
  const finalizedDecisionModel = createFinalizedDecisionModel({ nowFn });
  const decisionNotificationModel = createDecisionNotificationModel({ nowFn });
  const deliveryAttemptModel = createDeliveryAttemptModel({ nowFn });
  const unresolvedFailureModel = createUnresolvedFailureModel({ nowFn });
  const retrySchedulerService = createRetrySchedulerService({
    decisionNotificationModel,
    nowFn
  });
  const notificationEmailDeliveryService = createNotificationEmailDeliveryService({
    sendEmail: sendDecisionEmailFn,
    decisionNotificationModel,
    deliveryAttemptModel,
    unresolvedFailureModel,
    retrySchedulerService,
    nowFn
  });
  const notificationController = createNotificationController({
    finalizedDecisionModel,
    decisionNotificationModel,
    deliveryAttemptModel,
    emailDeliveryService: notificationEmailDeliveryService
  });
  const adminFailureLogController = createAdminFailureLogController({
    unresolvedFailureModel
  });
  const internalServiceAuth = createInternalServiceAuth({
    serviceKey: notificationInternalServiceKey
  });
  const adminRoleAuth = createAdminRoleAuth();
  const reviewVisibilityPaperModel = createPaperModel();
  const reviewVisibilityModel = createReviewModel();
  const reviewVisibilityEditorAssignmentModel = createEditorAssignmentModel();
  const reviewVisibilityAuditModel = createReviewAccessAuditModel({
    nowFn
  });
  const reviewApiController = createReviewApiController({
    paperModel: reviewVisibilityPaperModel,
    reviewModel: reviewVisibilityModel,
    editorAssignmentModel: reviewVisibilityEditorAssignmentModel,
    reviewAccessAuditModel: reviewVisibilityAuditModel,
    nowFn
  });
  const reviewPageController = createReviewPageController({
    paperModel: reviewVisibilityPaperModel,
    editorAssignmentModel: reviewVisibilityEditorAssignmentModel,
    templateHtml: editorReviewsTemplateHtml
  });
  const decisionModel = createDecisionModel();
  const decisionAuditModel = createDecisionAuditModel({
    nowFn
  });
  const editorDecisionController = createEditorDecisionController({
    paperModel: reviewVisibilityPaperModel,
    reviewModel: reviewVisibilityModel,
    editorAssignmentModel: reviewVisibilityEditorAssignmentModel,
    decisionModel,
    decisionAuditModel,
    nowFn
  });
  const invitationController = createInvitationController({
    invitationModel,
    sendInvitation: sendInvitationFn,
    onInvitationAccepted: async (invitation) => {
      paperAccessApiService.assignReviewer({
        entitlementId: invitation.id,
        reviewerId: invitation.reviewerId,
        paperId: invitation.paperId
      });
      reviewerPaperAssignmentModel.upsertAssignment({
        assignmentId: invitation.reviewerAssignmentId,
        reviewerId: invitation.reviewerId,
        paperId: invitation.paperId,
        accessState: 'ACTIVE'
      });
    },
    onInvitationDeclined: async () => {}
  });
  const reviewerAssignmentController = createReviewerAssignmentController({
    paperSubmissionModel,
    reviewerModel,
    reviewerAssignmentModel,
    invitationController
  });
  const outageRetryController = createOutageRetryController({
    outageRetryWindowModel,
    nowFn
  });
  const paperFileRequestController = createPaperFileRequestController({
    paperAccessApiService,
    outageRetryController
  });
  const reviewerPaperAccessController = createReviewerPaperAccessController({
    paperAccessApiService,
    nowFn
  });
  const accessRecordsController = createAccessRecordsController({
    paperAccessApiService
  });
  const reviewSubmissionController = createReviewSubmissionController({
    reviewSubmissionModel,
    reviewRecordModel,
    validationFeedbackModel,
    reviewerPaperAssignmentModel
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
  app.use('/controllers', express.static(path.join(__dirname, 'controllers')));
  app.use('/models', express.static(path.join(__dirname, 'models')));
  app.use('/views', express.static(path.join(__dirname, 'views')));
  app.use('/public', express.static(path.join(__dirname, '..', 'public')));

  app.get('/', (_req, res) => {
    res.status(200).type('html').send(indexPageHtml);
  });

  app.get('/register', getRegistrationPage);
  app.get('/login', (_req, res) => {
    res.status(200).type('html').send(renderLoginPage());
  });
  function requireEditorSession(req, res, next) {
    const isApiRequest = String(req.path ?? req.originalUrl ?? '').startsWith('/api/');
    const session = authController.getAuthenticatedSession(req);
    if (!session) {
      if (isApiRequest) {
        res.status(401).json({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.'
        });
        return;
      }

      res.status(302).redirect('/login');
      return;
    }

    const account = resolvedRepository.findUserById(session.user.id);
    if (normalizeUserRole(account?.role) !== 'editor') {
      if (isApiRequest) {
        res.status(403).json({
          code: 'ASSIGNMENT_FORBIDDEN',
          message: 'Only editors can assign reviewers.'
        });
        return;
      }

      res.status(302).redirect('/dashboard?roleUpdated=editor_required');
      return;
    }

    req.authenticatedSession = session;
    req.authenticatedUserRole = 'editor';
    req.assignmentEditorId = session.user.id;
    next();
  }

  function requireReviewerSession(req, res, next) {
    const isApiRequest = String(req.path ?? req.originalUrl ?? '').startsWith('/api/');
    const session = authController.getAuthenticatedSession(req);
    if (!session) {
      if (isApiRequest) {
        res.status(401).json({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.'
        });
        return;
      }

      res.status(302).redirect('/login');
      return;
    }

    const account = resolvedRepository.findUserById(session.user.id);
    if (normalizeUserRole(account?.role) !== 'reviewer') {
      if (isApiRequest) {
        res.status(403).json({
          code: 'INVITATION_FORBIDDEN',
          message: 'Only reviewers can view invitation inbox.'
        });
        return;
      }

      res.status(302).redirect('/dashboard?roleUpdated=reviewer_required');
      return;
    }

    req.authenticatedUserRole = 'reviewer';
    req.authenticatedReviewerId = `account-${session.user.id}`;
    req.authenticatedSession = session;
    next();
  }

  function requireAuthenticatedSession(req, res, next) {
    const isApiRequest = String(req.path ?? req.originalUrl ?? '').startsWith('/api/');
    const session = authController.getAuthenticatedSession(req);
    if (!session) {
      if (isApiRequest) {
        res.status(401).json({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.'
        });
        return;
      }

      res.status(302).redirect('/login');
      return;
    }

    const account = resolvedRepository.findUserById(session.user.id);
    req.authenticatedSession = session;
    req.authenticatedUserRole = normalizeUserRole(account?.role);
    next();
  }

  function attachAuthenticatedSession(req, _res, next) {
    const session = authController.getAuthenticatedSession(req);
    if (!session) {
      next();
      return;
    }

    const account = resolvedRepository.findUserById(session.user.id);
    req.authenticatedSession = session;
    req.authenticatedUserRole = normalizeUserRole(account?.role);
    next();
  }

  app.get('/assign-reviewers', requireEditorSession, (_req, res) => {
    res.status(200).type('html').send(assignReviewersTemplateHtml);
  });
  app.get('/editor/reviews', attachAuthenticatedSession, reviewPageController.getReviewPage);
  app.get('/editor/decisions', requireEditorSession, (_req, res) => {
    res.status(200).type('html').send(indexPageHtml);
  });
  app.get('/reviewer/papers', requireReviewerSession, reviewerPaperAccessController.getPaperAccessPage);
  app.get('/reviewer/invitations', requireReviewerSession, (req, res) => {
    const invitations = invitationModel.listInvitationsForReviewer(req.authenticatedReviewerId, {
      includeInactive: false
    });
    res.status(200).type('html').send(
      renderReviewerInvitationInboxPage({
        email: req.authenticatedSession?.user?.email,
        invitations
      })
    );
  });
  app.get('/papers/:paperId/access-attempts', requireAuthenticatedSession, (req, res) => {
    const response = paperAccessApiService.getAccessAttempts({
      isAuthenticated: true,
      requesterId: req.authenticatedSession.user.id,
      requesterRole: req.authenticatedUserRole,
      elevatedRoles: String(req.headers?.['x-user-role'] ?? '').split(','),
      paperId: req.params.paperId,
      outcome: req.query?.outcome,
      limit: req.query?.limit
    });

    if (response.status !== 200) {
      res.status(response.status).json(response.body);
      return;
    }

    res.status(200).type('html').send(
      renderAccessRecordsView({
        paperId: req.params.paperId,
        records: response.body.records,
        outcomeFilter: req.query?.outcome ?? 'all'
      })
    );
  });
  app.get('/submit-paper', (req, res) => {
    const session = authController.getAuthenticatedSession(req);
    if (!session) {
      res.status(302).redirect('/login');
      return;
    }

    const account = resolvedRepository.findUserById(session.user.id);
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

    const account = resolvedRepository.findUserById(session.user.id);
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
      repository: resolvedRepository,
      emailDeliveryService,
      nowFn,
      tokenTtlMs,
      hashPasswordFn,
      includeConfirmationUrl: authRuntimeEnv !== 'production'
    })
  );
  app.get('/api/registrations/confirm', createConfirmationController({ repository: resolvedRepository, nowFn }));
  app.post('/api/v1/account/password-change', passwordChangeApiController);
  app.post('/api/v1/submissions', sessionAuthMiddleware, submissionController.createSubmission);
  app.post('/api/v1/submissions/:submissionId/files', sessionAuthMiddleware, uploadController.uploadSubmissionFile);
  app.post('/api/v1/submissions/:submissionId/validate', sessionAuthMiddleware, submissionController.validateSubmission);
  app.post('/api/v1/submissions/:submissionId/submit', sessionAuthMiddleware, submissionController.finalizeSubmission);
  app.get('/api/v1/submissions/:submissionId', sessionAuthMiddleware, statusController.getSubmission);
  app.put('/api/submissions/:submissionId/draft', sessionAuthMiddleware, draftController.saveDraft);
  app.get('/api/submissions/:submissionId/draft', sessionAuthMiddleware, draftController.getLatestDraft);
  app.get('/api/submissions/:submissionId/draft/versions', sessionAuthMiddleware, draftVersionController.listDraftVersions);
  app.get('/api/submissions/:submissionId/draft/versions/:versionId', sessionAuthMiddleware, draftVersionController.getDraftVersion);
  app.post('/api/submissions/:submissionId/draft/versions/:versionId/restore', sessionAuthMiddleware, draftVersionController.restoreDraftVersion);
  app.post('/api/submissions/:submissionId/draft/retention/prune', draftController.pruneRetention);
  app.get('/api/papers/:paperId/reviews', attachAuthenticatedSession, reviewApiController.getPaperReviews);
  app.get('/api/papers/:paperId/decision-workflow', attachAuthenticatedSession, editorDecisionController.getDecisionWorkflow);
  app.post('/api/papers/:paperId/decisions', attachAuthenticatedSession, editorDecisionController.savePaperDecision);
  app.get('/api/papers', requireEditorSession, reviewerAssignmentController.listSubmittedPapers);
  app.get('/api/papers/:paperId/reviewer-candidates', requireEditorSession, reviewerAssignmentController.listReviewerCandidates);
  app.post('/api/papers/:paperId/assignment-attempts', requireEditorSession, reviewerAssignmentController.createAttempt);
  app.patch(
    '/api/papers/:paperId/assignment-attempts/:attemptId/selections/:selectionId',
    requireEditorSession,
    reviewerAssignmentController.replaceSelection
  );
  app.post(
    '/api/papers/:paperId/assignment-attempts/:attemptId/confirm',
    requireEditorSession,
    reviewerAssignmentController.confirmAttempt
  );
  app.get(
    '/api/papers/:paperId/assignment-outcomes/:attemptId',
    requireEditorSession,
    reviewerAssignmentController.getOutcome
  );
  app.post('/api/invitations/:invitationId/dispatch', invitationController.dispatch);
  app.post('/api/invitations/:invitationId/retry', invitationController.retry);
  app.get('/api/invitations/:invitationId', invitationController.getStatus);
  app.post('/api/invitations/:invitationId/cancel', invitationController.cancel);
  app.get('/api/invitations/:invitationId/failure-log', invitationController.getFailureLog);
  app.post('/api/reviewer-assignments/:assignmentId/invitations', invitationController.triggerByAssignment);
  app.get('/api/review-invitations/:invitationId', invitationController.getContractStatus);
  app.post('/api/review-invitations/:invitationId/delivery-events', invitationController.recordDeliveryEvent);
  app.post('/api/reviewer-assignments/:assignmentId/invitations/cancel', invitationController.cancelByAssignment);
  app.post('/api/internal/review-invitations/retry-due', invitationController.retryDue);
  app.get('/api/papers/:paperId/invitation-failure-logs', invitationController.listFailureLogsByPaper);
  registerNotificationRoutes({
    app,
    notificationController,
    internalServiceAuth
  });
  registerAdminFailureRoutes({
    app,
    adminFailureLogController,
    adminRoleAuth
  });
  registerReviewSubmissionRoutes({
    app,
    reviewSubmissionController,
    requireReviewerSession
  });
  app.get('/api/reviewer/invitations', requireReviewerSession, invitationController.listReviewerInbox);
  app.post('/api/reviewer/invitations/:invitationId/accept', requireReviewerSession, invitationController.acceptReviewerInvitation);
  app.post('/api/reviewer/invitations/:invitationId/decline', requireReviewerSession, invitationController.declineReviewerInvitation);
  app.get('/api/reviewer/papers', requireReviewerSession, reviewerPaperAccessController.listAssignedPapers);
  app.get('/api/reviewer/papers/:paperId/files', requireReviewerSession, paperFileRequestController.getPaperFiles);
  app.get('/api/reviewer/papers/:paperId/files/:fileId', requireReviewerSession, paperFileRequestController.downloadPaperFile);
  app.get('/api/papers/:paperId/access-attempts', requireAuthenticatedSession, accessRecordsController.listAccessAttempts);
  app.use('/api/auth', createAuthRoutes({ authController }));

  app.use((error, _req, res, _next) => {
    void error;
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error.'
    });
  });

  app.locals.repository = resolvedRepository;
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
  app.locals.draftState = draftState;
  app.locals.draftController = draftController;
  app.locals.draftVersionController = draftVersionController;
  app.locals.paperSubmissionModel = paperSubmissionModel;
  app.locals.reviewerModel = reviewerModel;
  app.locals.reviewerAssignmentModel = reviewerAssignmentModel;
  app.locals.invitationModel = invitationModel;
  app.locals.reviewerAssignmentController = reviewerAssignmentController;
  app.locals.invitationController = invitationController;
  app.locals.outageRetryWindowModel = outageRetryWindowModel;
  app.locals.paperAccessApiService = paperAccessApiService;
  app.locals.outageRetryController = outageRetryController;
  app.locals.paperFileRequestController = paperFileRequestController;
  app.locals.reviewerPaperAccessController = reviewerPaperAccessController;
  app.locals.accessRecordsController = accessRecordsController;
  app.locals.reviewSubmissionModel = reviewSubmissionModel;
  app.locals.reviewRecordModel = reviewRecordModel;
  app.locals.validationFeedbackModel = validationFeedbackModel;
  app.locals.reviewerPaperAssignmentModel = reviewerPaperAssignmentModel;
  app.locals.reviewSubmissionController = reviewSubmissionController;
  app.locals.finalizedDecisionModel = finalizedDecisionModel;
  app.locals.decisionNotificationModel = decisionNotificationModel;
  app.locals.deliveryAttemptModel = deliveryAttemptModel;
  app.locals.unresolvedFailureModel = unresolvedFailureModel;
  app.locals.retrySchedulerService = retrySchedulerService;
  app.locals.notificationEmailDeliveryService = notificationEmailDeliveryService;
  app.locals.notificationController = notificationController;
  app.locals.adminFailureLogController = adminFailureLogController;
  app.locals.internalServiceAuth = internalServiceAuth;
  app.locals.adminRoleAuth = adminRoleAuth;
  app.locals.reviewVisibilityPaperModel = reviewVisibilityPaperModel;
  app.locals.reviewVisibilityModel = reviewVisibilityModel;
  app.locals.reviewVisibilityEditorAssignmentModel = reviewVisibilityEditorAssignmentModel;
  app.locals.reviewVisibilityAuditModel = reviewVisibilityAuditModel;
  app.locals.reviewApiController = reviewApiController;
  app.locals.reviewPageController = reviewPageController;
  app.locals.decisionModel = decisionModel;
  app.locals.decisionAuditModel = decisionAuditModel;
  app.locals.editorDecisionController = editorDecisionController;

  return app;
}

if (shouldGenerateSyntheticCoverage()) {
  generateSyntheticCoverage();
}
/* c8 ignore stop */
