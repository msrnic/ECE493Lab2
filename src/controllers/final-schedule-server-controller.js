import { normalizeUserRole } from '../models/user-account-model.js';

const DEFAULT_NOTICE_MESSAGE = 'The final conference schedule has not been published yet.';

function toViewerContext({ authController, repository, req }) {
  const session = authController.getAuthenticatedSession(req);

  if (!session) {
    return {
      isAuthenticated: false,
      viewerRole: 'anonymous',
      authorId: null
    };
  }

  const account = repository.findUserById(session.user.id);
  const role = normalizeUserRole(account?.role);

  if (role === 'author') {
    return {
      isAuthenticated: true,
      viewerRole: 'author',
      authorId: session.user.id
    };
  }

  return {
    isAuthenticated: true,
    viewerRole: 'other',
    authorId: null
  };
}

function findPublishedSchedule(data) {
  const schedules = Array.isArray(data.generatedSchedules) ? data.generatedSchedules : [];
  const published = schedules.filter((schedule) => schedule.status === 'published');

  if (published.length === 0) {
    return null;
  }

  const active = published.find((schedule) => schedule.isActive === true);
  return active ?? published[published.length - 1];
}

function mapSessions(data, scheduleId, viewerContext) {
  const assignments = Array.isArray(data.sessionAssignments)
    ? data.sessionAssignments.filter((assignment) => assignment.scheduleId === scheduleId)
    : [];

  return assignments
    .map((assignment) => {
      const authorIds = Array.isArray(assignment.authorIds)
        ? assignment.authorIds.filter((authorId) => typeof authorId === 'string' && authorId.trim().length > 0)
        : [];

      return {
        sessionId: assignment.assignmentId,
        title: assignment.title ?? assignment.paperId ?? 'Untitled Session',
        startTimeUtc: assignment.startTime,
        endTimeUtc: assignment.endTime,
        room: assignment.roomId ?? 'TBD',
        track: assignment.track ?? '',
        authorIds,
        isCurrentAuthorSession: viewerContext.viewerRole === 'author' && authorIds.includes(viewerContext.authorId)
      };
    })
    .sort((left, right) => Date.parse(left.startTimeUtc) - Date.parse(right.startTimeUtc));
}

export function createFinalScheduleServerController({
  authController,
  repository,
  scheduleRepository,
  nowFn = () => new Date()
} = {}) {
  function getFinalSchedule(req, res) {
    const viewerContext = toViewerContext({ authController, repository, req });
    const data = scheduleRepository.read();
    const published = findPublishedSchedule(data);

    if (!published) {
      return res.status(200).json({
        status: 'unpublished',
        generatedAt: nowFn().toISOString(),
        viewerContext,
        notice: {
          code: 'SCHEDULE_UNPUBLISHED',
          message: DEFAULT_NOTICE_MESSAGE
        }
      });
    }

    return res.status(200).json({
      status: 'published',
      conferenceTimeZone: published.conferenceTimeZone ?? 'America/Toronto',
      generatedAt: nowFn().toISOString(),
      viewerContext,
      sessions: mapSessions(data, published.scheduleId, viewerContext)
    });
  }

  return {
    getFinalSchedule
  };
}
