import { Router } from 'express';
import { z } from 'zod';

import { cachePolicy } from '../middleware/security.js';

export const connectionRouter = Router();

const stationIdSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9-]+$/);

/**
 * Last-mile connections.
 *
 * These do not come from the railway's database - they come from the local
 * authority's GTFS-Realtime feed and the micromobility operators' GBFS feeds.
 * Normalising them here, rather than in the app, means the phone speaks one
 * protocol and a new city is a server deploy rather than an app release.
 *
 * `loadConnections` is the integration seam: implement it against whichever
 * feeds the region publishes.
 */
export async function loadConnections(_stationId: string): Promise<unknown[]> {
  // Wire up the regional GTFS-RT / GBFS clients here.
  return [];
}

connectionRouter.get('/stations/:stationId/connections', cachePolicy(30), async (req, res, next) => {
  const parsed = stationIdSchema.safeParse(req.params.stationId);
  if (!parsed.success) {
    res.status(400).json({ code: 'bad_request', message: 'Invalid station id' });
    return;
  }
  try {
    res.json(await loadConnections(parsed.data));
  } catch (error) {
    next(error);
  }
});
