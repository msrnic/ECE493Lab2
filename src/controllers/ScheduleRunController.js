import { sendError, sendSuccess } from './http/responses.js';

export default class ScheduleRunController {
  constructor({ generationRunModel, generatedScheduleModel }) {
    this.generationRunModel = generationRunModel;
    this.generatedScheduleModel = generatedScheduleModel;
  }

  getRun = (req, res) => {
    const run = this.generationRunModel.getById(req.params.runId);

    if (!run) {
      return sendError(res, 404, 'NOT_FOUND', 'Generation run not found.');
    }

    if (!run.generatedScheduleId) {
      return sendSuccess(res, 200, run);
    }

    const schedule = this.generatedScheduleModel.getById(run.generatedScheduleId);

    return sendSuccess(res, 200, {
      ...run,
      ...(schedule ? { schedule } : {})
    });
  };
}
