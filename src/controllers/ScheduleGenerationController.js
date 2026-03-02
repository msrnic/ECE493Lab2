import { sendError, sendSuccess } from './http/responses.js';
import { validateCreateScheduleRunRequest } from '../models/validation/scheduleSchemas.js';

export default class ScheduleGenerationController {
  constructor({
    repository,
    generationRunModel,
    generatedScheduleModel,
    sessionAssignmentModel,
    conflictFlagModel,
    preconditionService,
    generationEngine,
    scheduleTask = setTimeout
  }) {
    this.repository = repository;
    this.generationRunModel = generationRunModel;
    this.generatedScheduleModel = generatedScheduleModel;
    this.sessionAssignmentModel = sessionAssignmentModel;
    this.conflictFlagModel = conflictFlagModel;
    this.preconditionService = preconditionService;
    this.generationEngine = generationEngine;
    this.scheduleTask = scheduleTask;
  }

  createRun = (req, res) => {
    const validation = validateCreateScheduleRunRequest(req.body);
    if (!validation.valid) {
      return sendError(res, 422, 'VALIDATION_ERROR', validation.message);
    }

    if (this.generationRunModel.hasInProgress()) {
      return sendError(
        res,
        409,
        'GENERATION_IN_PROGRESS',
        'A generation run is already in progress. Please wait for completion.'
      );
    }

    const state = this.repository.read();
    const precondition = this.preconditionService.validate({
      acceptedPapers: state.acceptedPapers,
      sessionSlots: state.sessionSlots
    });

    if (!precondition.ok) {
      return sendError(res, 422, precondition.code, precondition.message);
    }

    const run = this.generationRunModel.createRequested({
      initiatedByUserId: req.user.userId ?? validation.data.requestedByUserId ?? 'system-admin',
      initiatedByRole: req.user.role
    });

    const startedRun = this.generationRunModel.startRun(run.runId);

    const delayMs = validation.data.simulateLongRunMs ?? 0;
    this.scheduleTask(() => {
      this.#executeRun(startedRun.runId, startedRun.initiatedByUserId);
    }, delayMs);

    return sendSuccess(res, 202, startedRun);
  };

  #executeRun(runId, userId) {
    try {
      const state = this.repository.read();
      const outcome = this.generationEngine.generate({
        acceptedPapers: state.acceptedPapers,
        sessionSlots: state.sessionSlots
      });

      const schedule = this.generatedScheduleModel.createFromRun({
        runId,
        createdByUserId: userId,
        assignmentCount: outcome.assignments.length,
        conflictCount: outcome.conflicts.length
      });

      const assignments = this.sessionAssignmentModel.createForSchedule(schedule.scheduleId, outcome.assignments);
      const conflicts = this.conflictFlagModel.createForSchedule(runId, schedule.scheduleId, outcome.conflicts);

      this.generatedScheduleModel.updateCounts(schedule.scheduleId, assignments.length, conflicts.length);
      this.generationRunModel.completeRun(runId, schedule.scheduleId);
    } catch (error) {
      this.generationRunModel.failRun(runId, error.message);
    }
  }
}
