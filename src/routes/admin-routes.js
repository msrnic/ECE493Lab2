export function registerAdminFailureRoutes({
  app,
  adminFailureLogController,
  adminRoleAuth
} = {}) {
  app.get(
    '/api/admin/notification-failures',
    adminRoleAuth,
    adminFailureLogController.listUnresolvedFailures
  );
  app.get(
    '/api/admin/notification-failures/:failureRecordId',
    adminRoleAuth,
    adminFailureLogController.getUnresolvedFailure
  );
}
