import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';
import { createTempPersistencePaths } from '../helpers/persistence-paths.js';

function createIsolatedApp() {
  const paths = createTempPersistencePaths('ece493-final-schedule-');
  return createApp({
    persistenceRootDirectory: paths.rootDirectory,
    databaseDirectory: paths.databaseDirectory,
    uploadsDirectory: paths.uploadsDirectory,
    repositoryFilePath: `${paths.databaseDirectory}/schedules.json`
  });
}

async function loginAs(app, { id, email, role }) {
  app.locals.repository.createUserAccount({
    id,
    fullName: `${role} user`,
    emailNormalized: email,
    passwordHash: hashPassword('StrongPass!2026'),
    role,
    lastAssignedRole: role,
    status: 'active',
    createdAt: '2026-02-01T00:00:00.000Z',
    activatedAt: '2026-02-01T00:00:00.000Z'
  });

  const loginResponse = await invokeHandler(app.locals.authController.login, {
    body: {
      email,
      password: 'StrongPass!2026'
    }
  });

  return String(loginResponse.headers['Set-Cookie']).split(';')[0];
}

describe('integration: final schedule routes', () => {
  it('serves the final schedule page shell', async () => {
    const app = createIsolatedApp();

    const pageResponse = await invokeAppRoute(app, {
      method: 'get',
      path: '/final-schedule'
    });

    expect(pageResponse.statusCode).toBe(200);
    expect(pageResponse.contentType).toBe('html');
    expect(pageResponse.text).toContain('Conference Final Schedule');
    expect(pageResponse.text).toContain('bootstrapFinalSchedulePage');
  });

  it('returns unpublished response when no published schedule exists', async () => {
    const app = createIsolatedApp();

    const response = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/final-schedule'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('unpublished');
    expect(response.body.viewerContext.viewerRole).toBe('anonymous');
    expect(response.body.notice.code).toBe('SCHEDULE_UNPUBLISHED');
  });

  it('returns published schedule and author session highlighting for authenticated authors', async () => {
    const app = createIsolatedApp();
    const cookie = await loginAs(app, {
      id: 'author-1',
      email: 'author1@example.com',
      role: 'author'
    });

    app.locals.scheduleRepository.write({
      acceptedPapers: [],
      sessionSlots: [],
      generationRuns: [],
      generatedSchedules: [
        {
          scheduleId: 'schedule-1',
          runId: 'run-1',
          versionNumber: 1,
          isActive: true,
          status: 'published',
          conferenceTimeZone: 'America/Toronto'
        }
      ],
      sessionAssignments: [
        {
          assignmentId: 'session-1',
          scheduleId: 'schedule-1',
          paperId: 'paper-1',
          title: 'Author Session',
          startTime: '2026-06-01T09:00:00.000Z',
          endTime: '2026-06-01T09:30:00.000Z',
          roomId: 'Room A',
          track: 'AI',
          authorIds: ['author-1']
        },
        {
          assignmentId: 'session-2',
          scheduleId: 'schedule-1',
          paperId: 'paper-2',
          title: 'Other Session',
          startTime: '2026-06-01T10:00:00.000Z',
          endTime: '2026-06-01T10:30:00.000Z',
          roomId: 'Room B',
          track: 'Systems',
          authorIds: ['author-2']
        }
      ],
      conflictFlags: [],
      scheduleEditConflicts: [],
      scheduleOverrideAudits: []
    });

    const response = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/final-schedule',
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('published');
    expect(response.body.viewerContext.viewerRole).toBe('author');
    expect(response.body.viewerContext.authorId).toBe('author-1');
    expect(response.body.sessions).toHaveLength(2);
    expect(response.body.sessions[0].isCurrentAuthorSession).toBe(true);
    expect(response.body.sessions[1].isCurrentAuthorSession).toBe(false);
  });
});
