import { sendError, sendSuccess } from './http/responses.js';
import { parseActiveOnly } from '../models/validation/scheduleSchemas.js';

export default class ScheduleReviewController {
  constructor({ generatedScheduleModel, sessionAssignmentModel, conflictFlagModel, scheduleEditService }) {
    this.generatedScheduleModel = generatedScheduleModel;
    this.sessionAssignmentModel = sessionAssignmentModel;
    this.conflictFlagModel = conflictFlagModel;
    this.scheduleEditService = scheduleEditService;
  }

  listSchedules = (req, res) => {
    let activeOnly;

    try {
      activeOnly = parseActiveOnly(req.query.activeOnly);
    } catch (error) {
      return sendError(res, 422, error.code, error.message);
    }

    const items = this.generatedScheduleModel.list({ activeOnly });
    return sendSuccess(res, 200, { items });
  };

  getSchedule = (req, res) => {
    const schedule = this.scheduleEditService.getSchedule(req.params.scheduleId);
    if (!schedule) {
      return sendError(res, 404, 'NOT_FOUND', 'Schedule version not found.');
    }
    return sendSuccess(res, 200, schedule);
  };

  listConflicts = (req, res) => {
    const schedule = this.generatedScheduleModel.getById(req.params.scheduleId);

    if (!schedule) {
      return sendError(res, 404, 'NOT_FOUND', 'Schedule version not found.');
    }

    const items = this.conflictFlagModel.listBySchedule(schedule.scheduleId);
    return sendSuccess(res, 200, { items });
  };
}
