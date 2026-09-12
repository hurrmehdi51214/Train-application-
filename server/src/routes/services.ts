import { Router } from 'express';
import { z } from 'zod';

import {
  fetchDepartureBoard,
  fetchDisruptions,
  fetchFormation,
  fetchPositions,
  fetchServiceCalls,
} from '../db/legacyRail.js';
import { toCall, toCarriage, toDisruption, toPosition } from '../db/mappers.js';
import { cachePolicy } from '../middleware/security.js';

export const serviceRouter = Router();

const serviceIdSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9:_-]+$/);
const stationIdSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9-]+$/);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

serviceRouter.get('/services/:id', cachePolicy(20), async (req, res, next) => {
  const parsed = serviceIdSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ code: 'bad_request', message: 'Invalid service id' });
    return;
  }

  try {
    const [calls, formation, disruptions] = await Promise.all([
      fetchServiceCalls(parsed.data, todayIso()),
      fetchFormation(parsed.data),
      fetchDisruptions(parsed.data),
    ]);

    if (calls.length === 0) {
      res.status(404).json({ code: 'service_not_found', message: 'No such service today' });
      return;
    }

    const first = calls[0]!;
    res.json({
      id: first.service_id,
      headcode: first.headcode,
      operator: first.operator,
      origin: first.station_id,
      destination: calls[calls.length - 1]!.station_id,
      calls: calls.map(toCall),
      carriages: formation.map(toCarriage),
      // Route geometry is our own asset, not the railway's: the operator's
      // schema carries calling points, not track alignment.
      geometry: [],
      disruptions: disruptions.map(toDisruption),
      cancelled: first.cancelled,
    });
  } catch (error) {
    next(error);
  }
});

serviceRouter.get('/stations/:stationId/departures', cachePolicy(15), async (req, res, next) => {
  const parsed = stationIdSchema.safeParse(req.params.stationId);
  if (!parsed.success) {
    res.status(400).json({ code: 'bad_request', message: 'Invalid station id' });
    return;
  }

  try {
    const rows = await fetchDepartureBoard(parsed.data);
    // Group the flat board into one entry per service.
    const byService = new Map<string, typeof rows>();
    for (const row of rows) {
      const bucket = byService.get(row.service_id) ?? [];
      bucket.push(row);
      byService.set(row.service_id, bucket);
    }

    res.json(
      Array.from(byService.values()).map((group) => {
        const first = group[0]!;
        return {
          id: first.service_id,
          headcode: first.headcode,
          operator: first.operator,
          origin: first.station_id,
          destination: first.destination_station_id,
          calls: group.map(toCall),
          carriages: [],
          geometry: [],
          disruptions: [],
          cancelled: first.cancelled,
        };
      }),
    );
  } catch (error) {
    next(error);
  }
});

serviceRouter.get('/positions', cachePolicy(0), async (req, res, next) => {
  const ids = String(req.query.services ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 25); // a client watching 25 trains at once is a bug, not a user

  if (ids.length === 0) {
    res.json([]);
    return;
  }

  const invalid = ids.find((id) => !serviceIdSchema.safeParse(id).success);
  if (invalid) {
    res.status(400).json({ code: 'bad_request', message: 'Invalid service id' });
    return;
  }

  try {
    const rows = await fetchPositions(ids);
    res.json(rows.map((row) => toPosition(row, 2)));
  } catch (error) {
    next(error);
  }
});
