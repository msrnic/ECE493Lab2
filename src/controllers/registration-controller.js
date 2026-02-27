import { createTokenPair } from '../models/confirmation-token-service.js';
import { createEmailConfirmationToken } from '../models/email-confirmation-token-model.js';
import { isDuplicateEmail, normalizeEmail } from '../models/email-normalization.js';
import {
  getRegistrationThrottle,
  recordRegistrationAttempt
} from '../models/registration-attempt-model.js';
import { parseRegistrationSubmission, buildValidationErrorResponse } from '../models/registration-submission-model.js';
import { createPendingUserAccount, hashPassword } from '../models/user-account-model.js';
import { validateRegistrationFields } from '../models/registration-validation.js';
import { getRegistrationStatusMessage } from '../views/registration-status-view.js';

export function createRegistrationController({
  repository,
  emailDeliveryService,
  nowFn = () => new Date(),
  hashPasswordFn = hashPassword,
  tokenTtlMs,
  includeConfirmationUrl = false
}) {
  return async function createRegistration(req, res) {
    const now = nowFn();
    const submission = parseRegistrationSubmission(req.body);
    const emailNormalized = normalizeEmail(submission.email);

    const throttle = getRegistrationThrottle(repository, emailNormalized, now);
    if (throttle.blocked) {
      const blockUntil = new Date(now.getTime() + throttle.retryAfterSeconds * 1000).toISOString();
      recordRegistrationAttempt(repository, {
        emailNormalized,
        outcome: 'throttled',
        now,
        blockUntil
      });

      res
        .status(429)
        .set('Retry-After', String(throttle.retryAfterSeconds))
        .json({
          code: 'REGISTRATION_TEMPORARILY_BLOCKED',
          message: 'Too many registration attempts. Please try again later.'
        });
      return;
    }

    const errors = validateRegistrationFields(submission);
    if (errors.length > 0) {
      recordRegistrationAttempt(repository, {
        emailNormalized,
        outcome: 'validation_failed',
        now
      });
      res.status(422).json(buildValidationErrorResponse(errors));
      return;
    }

    if (isDuplicateEmail(repository, emailNormalized)) {
      recordRegistrationAttempt(repository, {
        emailNormalized,
        outcome: 'duplicate_email',
        now
      });
      res.status(409).json({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email already registered',
        actions: ['login', 'reset_password']
      });
      return;
    }

    const account = repository.createUserAccount(
      createPendingUserAccount({
        fullName: submission.fullName,
        emailNormalized,
        passwordHash: hashPasswordFn(submission.password),
        now
      })
    );

    const tokenPair = createTokenPair();
    repository.createConfirmationToken(
      createEmailConfirmationToken({
        userAccountId: account.id,
        tokenHash: tokenPair.tokenHash,
        now,
        ttlMs: tokenTtlMs
      })
    );

    const deliveryResult = await emailDeliveryService.deliverRegistrationConfirmation({
      userAccount: account,
      confirmationToken: tokenPair.token
    });

    recordRegistrationAttempt(repository, {
      emailNormalized,
      outcome: 'created_pending',
      now
    });

    const responseBody = {
      accountId: account.id,
      status: account.status,
      emailDelivery: deliveryResult.emailDelivery,
      message: getRegistrationStatusMessage(deliveryResult.emailDelivery)
    };

    if (includeConfirmationUrl) {
      responseBody.confirmationUrl = `/api/registrations/confirm?token=${tokenPair.token}`;
    }

    res.status(201).json(responseBody);
  };
}
