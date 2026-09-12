import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { config } from '../config.js';

/** Correlation id, echoed back so a passenger's support ticket maps to a log line. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = req.header('x-request-id') ?? randomUUID();
  res.setHeader('x-request-id', id);
  res.locals.requestId = id;
  next();
}

/**
 * Response headers. This service returns JSON to a mobile client, so the header
 * set is small and deliberate rather than a copied-in wall of directives: no
 * sniffing, no framing, no referrer, and HSTS once we are actually on TLS.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('cross-origin-resource-policy', 'same-site');
  res.setHeader('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
  if (config.NODE_ENV === 'production') {
    res.setHeader('strict-transport-security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
}

/**
 * Caching rules. Timetable data is worth caching for seconds; anything holding
 * a ticket or a passenger name must never be stored by an intermediary.
 */
export function cachePolicy(seconds: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('cache-control', seconds > 0 ? `private, max-age=${seconds}` : 'no-store');
    next();
  };
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ code: 'not_found', message: 'No such resource' });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const id = res.locals.requestId as string | undefined;
  console.error(`[error] request=${id ?? '-'}`, error);

  if (res.headersSent) return;

  // Internal detail stays in the log. The client gets the correlation id and
  // something it can say to a member of staff.
  res.status(500).json({
    code: 'internal_error',
    message: 'Something went wrong at our end.',
    requestId: id,
  });
}
