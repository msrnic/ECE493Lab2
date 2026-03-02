export default class ScheduleEditController {
  constructor({ scheduleEditService }) {
    this.scheduleEditService = scheduleEditService;
  }

  saveAttempt = (req, res) => {
    const result = this.scheduleEditService.attemptSave({
      scheduleId: req.params.scheduleId,
      expectedVersion: req.body?.expectedVersion,
      changes: req.body?.changes,
      editorId: req.user?.userId
    });

    return res.status(result.status).json(result.body);
  };

  overrideSave = (req, res) => {
    const result = this.scheduleEditService.attemptOverrideSave({
      scheduleId: req.params.scheduleId,
      expectedVersion: req.body?.expectedVersion,
      decisionToken: req.body?.decisionToken,
      reason: req.body?.reason,
      affectedConflictIds: req.body?.affectedConflictIds,
      changes: req.body?.changes,
      editorId: req.user?.userId
    });

    return res.status(result.status).json(result.body);
  };

  publishAttempt = (req, res) => {
    const result = this.scheduleEditService.attemptPublish({
      scheduleId: req.params.scheduleId,
      expectedVersion: req.body?.expectedVersion
    });

    return res.status(result.status).json(result.body);
  };
}
