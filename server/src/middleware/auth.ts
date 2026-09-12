import { createPublicKey, verify } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { config } from '../config.js';

/**
 * Access-token verification.
 *
 * Tokens are asymmetric (EdDSA) and verified locally: the gateway holds only
 * the public key, so a compromise here cannot mint tokens. Verification is done
 * by hand rather than by pulling in a JWT library, because the library surface
 * we would use is three lines and the algorithm confusion bugs those libraries
 * historically shipped all come from the parts we do not need.
 *
 * The one rule that matters: the algorithm comes from *our* configuration, never
 * from the token's own header. A token claiming `"alg": "none"` is rejected
 * before its header is even read for anything else.
 */

export interface Principal {
  subject: string;
  deviceId: string | null;
  scopes: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

interface JwtHeader {
  alg: string;
  kid?: string;
  typ?: string;
}

interface JwtPayload {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  scope?: string;
  device_id?: string;
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
}

export function verifyAccessToken(token: string): Principal {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const [headerSegment, payloadSegment, signatureSegment] = parts as [string, string, string];

  const header = decodeSegment<JwtHeader>(headerSegment);
  if (header.alg !== 'EdDSA') throw new Error('unsupported token algorithm');

  if (!config.JWT_PUBLIC_KEY_PEM) throw new Error('no token verification key configured');
  const key = createPublicKey(config.JWT_PUBLIC_KEY_PEM);

  const ok = verify(
    null,
    Buffer.from(`${headerSegment}.${payloadSegment}`, 'utf8'),
    key,
    Buffer.from(signatureSegment, 'base64url'),
  );
  if (!ok) throw new Error('bad signature');

  const payload = decodeSegment<JwtPayload>(payloadSegment);
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== config.JWT_ISSUER) throw new Error('wrong issuer');
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(config.JWT_AUDIENCE)) throw new Error('wrong audience');
  // 30s of clock skew, and no more: a longer grace window on a bearer token is
  // a longer window for a stolen one.
  if (typeof payload.exp === 'number' && payload.exp + 30 < now) throw new Error('token expired');
  if (typeof payload.nbf === 'number' && payload.nbf - 30 > now) throw new Error('token not yet valid');
  if (!payload.sub) throw new Error('token has no subject');

  return {
    subject: payload.sub,
    deviceId: payload.device_id ?? null,
    scopes: payload.scope ? payload.scope.split(' ') : [],
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ code: 'unauthenticated', message: 'Sign in to continue' });
    return;
  }
  try {
    req.principal = verifyAccessToken(header.slice(7));
    next();
  } catch {
    // Never echo the parse error: it tells an attacker which check failed.
    res.status(401).json({ code: 'unauthenticated', message: 'Your session has expired' });
  }
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.principal?.scopes.includes(scope)) {
      res.status(403).json({ code: 'forbidden', message: 'Not permitted' });
      return;
    }
    next();
  };
}
