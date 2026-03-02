import { randomUUID } from 'node:crypto';

export default class GenerationRunModel {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.now = options.now ?? (() => new Date().toISOString());
    this.makeId = options.makeId ?? (() => randomUUID());
  }

  hasInProgress() {
    const { generationRuns } = this.repository.read();
    return generationRuns.some((run) => run.status === 'in_progress');
  }

  createRequested({ initiatedByUserId, initiatedByRole }) {
    if (initiatedByRole !== 'admin') {
      const error = new Error('Only administrators can start schedule generation.');
      error.code = 'FORBIDDEN';
      throw error;
    }

    const run = {
      runId: this.makeId(),
      initiatedByUserId,
      initiatedByRole,
      requestedAt: this.now(),
      status: 'requested'
    };

    this.repository.mutate((data) => {
      data.generationRuns.push(run);
      return data;
    });

    return run;
  }

  startRun(runId) {
    let startedRun;

    this.repository.mutate((data) => {
      const run = data.generationRuns.find((item) => item.runId === runId);
      if (!run) {
        const error = new Error('Generation run was not found.');
        error.code = 'NOT_FOUND';
        throw error;
      }
      if (run.status !== 'requested') {
        const error = new Error(`Cannot start run from status ${run.status}.`);
        error.code = 'INVALID_STATE';
        throw error;
      }

      run.status = 'in_progress';
      run.startedAt = this.now();
      run.inProgressMessage = 'Generation is currently in progress.';
      startedRun = { ...run };

      return data;
    });

    return startedRun;
  }

  failRun(runId, failureReason) {
    return this.#updateTerminal(runId, 'failed', { failureReason });
  }

  completeRun(runId, generatedScheduleId) {
    return this.#updateTerminal(runId, 'completed', { generatedScheduleId, failureReason: undefined });
  }

  getById(runId) {
    const { generationRuns } = this.repository.read();
    return generationRuns.find((run) => run.runId === runId) ?? null;
  }

  list() {
    const { generationRuns } = this.repository.read();
    return generationRuns;
  }

  #updateTerminal(runId, status, patch = {}) {
    let updated;

    this.repository.mutate((data) => {
      const run = data.generationRuns.find((item) => item.runId === runId);
      if (!run) {
        const error = new Error('Generation run was not found.');
        error.code = 'NOT_FOUND';
        throw error;
      }

      run.status = status;
      run.completedAt = this.now();
      if (Object.prototype.hasOwnProperty.call(patch, 'failureReason')) {
        if (patch.failureReason) {
          run.failureReason = patch.failureReason;
        } else {
          delete run.failureReason;
        }
      }
      if (patch.generatedScheduleId) {
        run.generatedScheduleId = patch.generatedScheduleId;
      }

      updated = { ...run };
      return data;
    });

    return updated;
  }
}
