import { hashToken, isTokenFormatValid } from '../models/confirmation-token-service.js';
import {
  consumeConfirmationToken,
  isConfirmationTokenExpired
} from '../models/email-confirmation-token-model.js';
import { activateUserAccount } from '../models/user-account-model.js';

function shouldRedirectToLogin(req) {
  const acceptHeader = String(req?.headers?.accept ?? '').toLowerCase();
  return acceptHeader.includes('text/html');
}

export function createConfirmationController({ repository, nowFn = () => new Date() }) {
  return function confirmRegistration(req, res) {
    const token = req.query.token;

    if (!isTokenFormatValid(token)) {
      res.status(400).json({
        code: 'INVALID_CONFIRMATION_TOKEN',
        message: 'Confirmation token is invalid.'
      });
      return;
    }

    const tokenRecord = repository.findConfirmationTokenByHash(hashToken(token));
    if (!tokenRecord) {
      res.status(400).json({
        code: 'INVALID_CONFIRMATION_TOKEN',
        message: 'Confirmation token is invalid.'
      });
      return;
    }

    const now = nowFn();
    if (tokenRecord.consumedAt || isConfirmationTokenExpired(tokenRecord, now)) {
      res.status(410).json({
        code: 'CONFIRMATION_TOKEN_EXPIRED',
        message: 'Confirmation token is expired or already used.'
      });
      return;
    }

    const account = repository.findUserById(tokenRecord.userAccountId);
    if (!account) {
      res.status(400).json({
        code: 'INVALID_CONFIRMATION_TOKEN',
        message: 'Confirmation token is invalid.'
      });
      return;
    }

    const activatedAccount = activateUserAccount(account, now);
    repository.updateUserAccount(activatedAccount.id, activatedAccount);
    repository.updateConfirmationToken(tokenRecord.id, consumeConfirmationToken(tokenRecord, now));

    if (shouldRedirectToLogin(req)) {
      res.status(302).redirect('/login?confirmed=1');
      return;
    }

    res.status(200).json({
      accountId: activatedAccount.id,
      status: activatedAccount.status,
      message: 'Account confirmed successfully'
    });
  };
}
