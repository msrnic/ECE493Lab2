export const DEFAULT_CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function createEmailConfirmationToken({
  userAccountId,
  tokenHash,
  now = new Date(),
  ttlMs = DEFAULT_CONFIRMATION_TOKEN_TTL_MS
}) {
  const createdAtMs = now.getTime();

  return {
    userAccountId,
    tokenHash,
    expiresAt: new Date(createdAtMs + ttlMs).toISOString(),
    consumedAt: null,
    createdAt: now.toISOString()
  };
}

export function isConfirmationTokenExpired(token, now = new Date()) {
  return new Date(token.expiresAt).getTime() <= now.getTime();
}

export function consumeConfirmationToken(token, now = new Date()) {
  return {
    ...token,
    consumedAt: now.toISOString()
  };
}
