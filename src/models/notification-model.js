import { randomUUID } from 'node:crypto';

export function createNotificationModel({
  repository,
  idFactory = () => randomUUID(),
  nowFn = () => new Date(),
  defaultChannel = 'email'
} = {}) {
  function queuePasswordChangeNotification({ userId, channel = defaultChannel } = {}) {
    if (!repository || typeof repository.createSecurityNotification !== 'function') {
      return null;
    }

    if (!userId) {
      return null;
    }

    return repository.createSecurityNotification({
      id: idFactory(),
      userId,
      channel,
      status: 'queued',
      queuedAt: nowFn().toISOString()
    });
  }

  return {
    queuePasswordChangeNotification
  };
}
