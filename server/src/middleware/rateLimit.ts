import type { NextFunction, Request, Response } from 'express';

import { config } from '../config.js';

/**
 * Fixed-window limiter, in process.
 *
 * Adequate for a single instance and honest about what it is: behind more than
 * one replica this must be backed by Redis, or the effective limit multiplies
 * by the replica count. The comment is here so nobody discovers that in an
 * incident review.
 *
 * Keyed on the authenticated subject where we have one, and on the device id
 * otherwise - not on IP, because a train full of passengers on the same onboard
 * Wi-Fi shares one NAT address and would rate-limit each other.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref();

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key =
    req.principal?.subject ??
    req.header('x-device-id') ??
    req.ip ??
    'anonymous';

  const now = Date.now();
  const existing = buckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + config.RATE_LIMIT_WINDOW_MS };

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, config.RATE_LIMIT_MAX - bucket.count);
  res.setHeader('ratelimit-limit', String(config.RATE_LIMIT_MAX));
  res.setHeader('ratelimit-remaining', String(remaining));
  res.setHeader('ratelimit-reset', String(Math.ceil((bucket.resetAt - now) / 1000)));

  if (bucket.count > config.RATE_LIMIT_MAX) {
    res.setHeader('retry-after', String(Math.ceil((bucket.resetAt - now) / 1000)));
    res.status(429).json({ code: 'rate_limited', message: 'Too many requests. Try again shortly.' });
    return;
  }

  next();
}
