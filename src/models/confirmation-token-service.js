import { createHash, randomBytes } from 'node:crypto';

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createTokenPair({ randomBytesFn = randomBytes, size = 24 } = {}) {
  const token = randomBytesFn(size).toString('hex');
  return {
    token,
    tokenHash: hashToken(token)
  };
}

export function isTokenFormatValid(token) {
  return typeof token === 'string' && token.trim().length >= 32;
}
