import {
  createEmailDeliveryJob,
  markEmailDeliveryFailure,
  markEmailDeliverySent
} from '../models/email-delivery-job-model.js';

export function createEmailDeliveryService({
  repository,
  sendEmail,
  nowFn = () => new Date(),
  maxAttempts = 2,
  backoffMs = 60 * 1000
}) {
  if (typeof sendEmail !== 'function') {
    throw new Error('sendEmail must be a function');
  }

  async function deliverRegistrationConfirmation({ userAccount, confirmationToken }) {
    const queuedJob = repository.createEmailDeliveryJob(
      createEmailDeliveryJob({ userAccountId: userAccount.id, now: nowFn() })
    );

    try {
      await sendEmail({
        to: userAccount.emailNormalized,
        template: 'registration_confirmation',
        confirmationUrl: `/api/registrations/confirm?token=${confirmationToken}`
      });

      const sentJob = markEmailDeliverySent(queuedJob, nowFn());
      repository.updateEmailDeliveryJob(sentJob.id, sentJob);
      return { emailDelivery: 'sent', job: sentJob };
    } catch (error) {
      const retryJob = markEmailDeliveryFailure(queuedJob, {
        error,
        now: nowFn(),
        maxAttempts,
        backoffMs
      });
      repository.updateEmailDeliveryJob(retryJob.id, retryJob);
      return { emailDelivery: 'queued_retry', job: retryJob };
    }
  }

  async function processDueRetries() {
    const now = nowFn();
    const dueJobs = repository.listEmailDeliveryJobsDue(now);

    for (const job of dueJobs) {
      if (job.status !== 'queued_retry') {
        continue;
      }

      try {
        await sendEmail({
          to: repository.findUserById(job.userAccountId)?.emailNormalized,
          template: job.template
        });
        const sentJob = markEmailDeliverySent(job, nowFn());
        repository.updateEmailDeliveryJob(sentJob.id, sentJob);
      } catch (error) {
        const updatedJob = markEmailDeliveryFailure(job, {
          error,
          now: nowFn(),
          maxAttempts,
          backoffMs
        });
        repository.updateEmailDeliveryJob(updatedJob.id, updatedJob);
      }
    }

    return dueJobs.length;
  }

  return {
    deliverRegistrationConfirmation,
    processDueRetries
  };
}
