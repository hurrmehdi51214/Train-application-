import { Router } from 'express';

import { fetchStations } from '../db/legacyRail.js';
import { toStation } from '../db/mappers.js';
import { cachePolicy } from '../middleware/security.js';

export const referenceRouter = Router();

/**
 * Station reference data.
 *
 * The client pins this permanently, so it is served with a long max-age and an
 * ETag: a cold start on a train with no signal should not be the first time
 * someone discovers their app cannot name a station.
 */
referenceRouter.get('/stations', cachePolicy(3600), async (_req, res, next) => {
  try {
    const rows = await fetchStations();
    res.json(rows.map(toStation));
  } catch (error) {
    next(error);
  }
});
