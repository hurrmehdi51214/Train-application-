import { Router } from 'express';
import { z } from 'zod';

import {
  fetchAccommodation,
  fetchDepartureBoard,
  fetchDisruptions,
  fetchPositions,
  fetchServiceCalls,
} from '../db/legacyRail.js';
import { toCall, toDisruption, toOffer, toPosition } from '../db/mappers.js';
import { cachePolicy } from '../middleware/security.js';

export const serviceRouter = Router();

const serviceIdSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9:_-]+$/);
const stationIdSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9-]+$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

serviceRouter.get('/services/:id', cachePolicy(20), async (req, res, next) => {
  const parsed = serviceIdSchema.safeParse(req.params.id);
  const date = dateSchema.safeParse(req.query.date).data ?? todayIso();
  if (!parsed.success) {
    res.status(400).json({ code: 'bad_request', message: 'Invalid service id' });
    return;
  }

  try {
    const calls = await fetchServiceCalls(parsed.data, date);
    if (calls.length === 0) {
      res.status(404).json({ code: 'service_not_found', message: 'No such train on that date' });
      return;
    }

    const first = calls[0]!;
    const last = calls[calls.length - 1]!;

    // Accommodation and notices only make sense once we know the run exists.
    const [accommodation, disruptions] = await Promise.all([
      fetchAccommodation(parsed.data, date, first.sequence, last.sequence),
      fetchDisruptions(parsed.data),
    ]);

    res.json({
      id: first.service_id,
      number: first.train_number,
      name: first.train_name,
      nameUrdu: first.train_name_urdu,
      operator: first.operator,
      line: first.line,
      originStationId: first.station_id,
      destinationStationId: last.station_id,
      calls: calls.map(toCall),
      offers: accommodation.map(toOffer),
      // Photography and editorial copy are ours, not the railway's; the app
      // joins them on the service id from its own bundled tables.
      photoKeys: [],
      rating: 0,
      reviewCount: 0,
      reviews: [],
      disruptions: disruptions.map(toDisruption),
      tagline: '',
      about: '',
      runsOn: [],
      cancelled: first.cancelled,
      featured: false,
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

    // The board comes back flat, one row per calling point. Group it per run.
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
          number: first.train_number,
          name: first.train_name,
          nameUrdu: first.train_name_urdu,
          operator: first.operator,
          line: first.line,
          originStationId: first.station_id,
          destinationStationId: first.destination_station_id,
          calls: group.map(toCall),
          offers: [],
          photoKeys: [],
          rating: 0,
          reviewCount: 0,
          reviews: [],
          disruptions: [],
          tagline: '',
          about: '',
          runsOn: [],
          cancelled: first.cancelled,
          featured: false,
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
    // A client watching 25 trains at once is a bug, not a user.
    .slice(0, 25);

  if (ids.length === 0) {
    res.json([]);
    return;
  }
  if (ids.some((id) => !serviceIdSchema.safeParse(id).success)) {
    res.status(400).json({ code: 'bad_request', message: 'Invalid service id' });
    return;
  }

  try {
    const rows = await fetchPositions(ids);
    res.json(rows.map(toPosition));
  } catch (error) {
    next(error);
  }
});
