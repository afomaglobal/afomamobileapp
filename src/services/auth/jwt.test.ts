import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decodeJwtPayload, isJwtExpired, resolveFullAccess } from './jwt';

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function fakeJwt(payload: Record<string, unknown>): string {
  return `header.${base64UrlJson(payload)}.signature`;
}

describe('jwt helpers', () => {
  it('decodeJwtPayload rejects malformed tokens', () => {
    assert.equal(decodeJwtPayload(''), null);
    assert.equal(decodeJwtPayload('only-one-part'), null);
    assert.equal(decodeJwtPayload('a.b.c'), null);
  });

  it('isJwtExpired detects expired exp claim', () => {
    const expired = fakeJwt({ exp: Math.floor(Date.now() / 1000) - 60 });
    assert.equal(isJwtExpired(decodeJwtPayload(expired)), true);
  });

  it('isJwtExpired treats missing exp as not expired', () => {
    const token = fakeJwt({ sub: 'user' });
    assert.equal(isJwtExpired(decodeJwtPayload(token)), false);
  });

  it('resolveFullAccess reads fullAccess claim', () => {
    const token = fakeJwt({ fullAccess: true });
    assert.equal(resolveFullAccess(token), true);
  });
});
