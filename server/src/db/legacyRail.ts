import { railRead } from './pool.js';

/**
 * Adapter over Pakistan Railways' existing systems.
 *
 * Two of them, in practice: the reservation system (PRITS) that owns trains,
 * coaches, quotas and fares, and the control office application that owns where
 * trains actually are. Their schemas predate this app by decades and it shows -
 * trains are numbered by direction (5UP and 6DN are the same service on
 * different days), accommodation is sold by class *and* berth type, and the
 * fare table is keyed on a distance slab rather than a price.
 *
 * All of that stays in this file. Everything above it speaks the clean domain
 * model in `src/types`, so when the operator migrates a table we change one
 * adapter instead of an app.
 *
 * Every statement here is parameterised. There is no string interpolation into
 * SQL anywhere in this file, and that is not an accident.
 */

export interface StationRow {
  id: string;
  code: string;
  name: string;
  name_urdu: string;
  city: string;
  province: string;
  lat: number;
  lon: number;
  line: string;
  platforms: number;
  facilities: string[];
  concourse_walk_minutes: number;
}

export async function fetchStations(): Promise<StationRow[]> {
  const { rows } = await railRead.query<StationRow>(
    `
    SELECT
      'stn-' || lower(s.station_code)          AS id,
      s.station_code                           AS code,
      s.station_name                           AS name,
      COALESCE(s.station_name_ur, '')          AS name_urdu,
      s.city_name                              AS city,
      s.province_name                          AS province,
      s.latitude::float8                       AS lat,
      s.longitude::float8                      AS lon,
      COALESCE(s.main_line_code, 'ML-1')       AS line,
      COALESCE(p.platform_count, 2)            AS platforms,
      COALESCE(f.facility_codes, '{}')         AS facilities,
      COALESCE(s.concourse_transit_minutes, 4) AS concourse_walk_minutes
    FROM ref.station s
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS platform_count
      FROM ref.platform
      WHERE station_id = s.station_id
    ) p ON true
    LEFT JOIN ref.station_facility f ON f.station_id = s.station_id
    WHERE s.passenger_halt = true
      AND s.withdrawn_on IS NULL
    ORDER BY s.station_name
    `,
  );
  return rows;
}

export interface CallRow {
  service_id: string;
  train_number: string;
  train_name: string;
  train_name_urdu: string;
  operator: string;
  line: string;
  station_id: string;
  sequence: number;
  distance_km: number;
  halt_minutes: number;
  scheduled_arrival: Date | null;
  scheduled_departure: Date | null;
  expected_arrival: Date | null;
  expected_departure: Date | null;
  platform: string | null;
  platform_confirmed: boolean;
  delay_minutes: number;
  call_status: string;
  cancelled: boolean;
}

/**
 * One train's calling pattern for one date, with whatever the control office
 * has published against it.
 *
 * The LEFT JOIN onto `ctrl.movement` is what keeps this working during a
 * control-system outage: the schedule still resolves, `expected_*` falls back
 * to `scheduled_*`, and the app degrades to timetable times rather than to a
 * blank screen. On this network that is not a rare edge case.
 */
export async function fetchServiceCalls(serviceId: string, serviceDate: string): Promise<CallRow[]> {
  const { rows } = await railRead.query<CallRow>(
    `
    SELECT
      r.run_uid                                         AS service_id,
      t.train_number                                    AS train_number,
      t.train_name                                      AS train_name,
      COALESCE(t.train_name_ur, '')                     AS train_name_urdu,
      COALESCE(op.operator_name, 'Pakistan Railways')   AS operator,
      COALESCE(t.main_line_code, 'ML-1')                AS line,
      'stn-' || lower(st.station_code)                  AS station_id,
      sch.stop_sequence                                 AS sequence,
      sch.distance_from_origin_km                       AS distance_km,
      COALESCE(sch.halt_minutes, 0)                     AS halt_minutes,
      sch.scheduled_arrival_at                          AS scheduled_arrival,
      sch.scheduled_departure_at                        AS scheduled_departure,
      COALESCE(mv.actual_arrival_at, mv.forecast_arrival_at, sch.scheduled_arrival_at)       AS expected_arrival,
      COALESCE(mv.actual_departure_at, mv.forecast_departure_at, sch.scheduled_departure_at) AS expected_departure,
      COALESCE(mv.platform_label, sch.planned_platform) AS platform,
      COALESCE(mv.platform_confirmed, false)            AS platform_confirmed,
      COALESCE(mv.late_minutes, 0)                      AS delay_minutes,
      COALESCE(mv.movement_status, 'SCHEDULED')         AS call_status,
      (r.cancellation_reason IS NOT NULL)               AS cancelled
    FROM ctrl.train_run r
    JOIN sched.train t        ON t.train_id = r.train_id
    LEFT JOIN ref.operator op ON op.operator_id = t.operator_id
    JOIN sched.schedule_stop sch ON sch.train_id = t.train_id
    JOIN ref.station st       ON st.station_id = sch.station_id
    LEFT JOIN ctrl.movement mv ON mv.run_uid = r.run_uid
                              AND mv.stop_sequence = sch.stop_sequence
    WHERE r.run_uid = $1
      AND r.service_date = $2::date
      AND sch.passenger_stop = true
    ORDER BY sch.stop_sequence
    `,
    [serviceId, serviceDate],
  );
  return rows;
}

export interface DepartureRow extends CallRow {
  destination_station_id: string;
}

/** Public departure board for a station, for the next `windowMinutes`. */
export async function fetchDepartureBoard(
  stationId: string,
  windowMinutes = 180,
): Promise<DepartureRow[]> {
  const code = stationId.replace(/^stn-/, '').toUpperCase();
  const { rows } = await railRead.query<DepartureRow>(
    `
    WITH board AS (
      SELECT r.run_uid
      FROM ctrl.train_run r
      JOIN sched.schedule_stop sch ON sch.train_id = r.train_id
      JOIN ref.station st ON st.station_id = sch.station_id
      WHERE st.station_code = $1
        AND sch.passenger_stop = true
        AND r.service_date BETWEEN CURRENT_DATE - 1 AND CURRENT_DATE + 1
        AND sch.scheduled_departure_at BETWEEN now() - interval '20 minutes'
                                           AND now() + ($2 || ' minutes')::interval
    )
    SELECT
      r.run_uid                                         AS service_id,
      t.train_number                                    AS train_number,
      t.train_name                                      AS train_name,
      COALESCE(t.train_name_ur, '')                     AS train_name_urdu,
      COALESCE(op.operator_name, 'Pakistan Railways')   AS operator,
      COALESCE(t.main_line_code, 'ML-1')                AS line,
      'stn-' || lower(st.station_code)                  AS station_id,
      sch.stop_sequence                                 AS sequence,
      sch.distance_from_origin_km                       AS distance_km,
      COALESCE(sch.halt_minutes, 0)                     AS halt_minutes,
      sch.scheduled_arrival_at                          AS scheduled_arrival,
      sch.scheduled_departure_at                        AS scheduled_departure,
      COALESCE(mv.actual_arrival_at, mv.forecast_arrival_at, sch.scheduled_arrival_at)       AS expected_arrival,
      COALESCE(mv.actual_departure_at, mv.forecast_departure_at, sch.scheduled_departure_at) AS expected_departure,
      COALESCE(mv.platform_label, sch.planned_platform) AS platform,
      COALESCE(mv.platform_confirmed, false)            AS platform_confirmed,
      COALESCE(mv.late_minutes, 0)                      AS delay_minutes,
      COALESCE(mv.movement_status, 'SCHEDULED')         AS call_status,
      (r.cancellation_reason IS NOT NULL)               AS cancelled,
      'stn-' || lower(dest.station_code)                AS destination_station_id
    FROM board b
    JOIN ctrl.train_run r      ON r.run_uid = b.run_uid
    JOIN sched.train t         ON t.train_id = r.train_id
    LEFT JOIN ref.operator op  ON op.operator_id = t.operator_id
    JOIN sched.schedule_stop sch ON sch.train_id = t.train_id
    JOIN ref.station st        ON st.station_id = sch.station_id
    JOIN ref.station dest      ON dest.station_id = t.destination_station_id
    LEFT JOIN ctrl.movement mv ON mv.run_uid = r.run_uid
                              AND mv.stop_sequence = sch.stop_sequence
    ORDER BY expected_departure
    `,
    [code, String(windowMinutes)],
  );
  return rows;
}

export interface AccommodationRow {
  travel_class: string;
  coach_labels: string[];
  berth_types: string[];
  amenity_codes: string[];
  capacity: number;
  sold: number;
  /** Fare for the booked leg, in paisa, from the operator's own slab table. */
  fare_minor: number;
}

/**
 * What is actually left on a train, between two stations.
 *
 * Availability on this network is per-leg, not per-train: a berth sold Karachi
 * to Multan is free again from Multan to Rawalpindi, and quoting whole-train
 * availability would both under-sell the train and lie to the passenger. The
 * `tsrange` overlap below is what makes that correct.
 */
export async function fetchAccommodation(
  serviceId: string,
  serviceDate: string,
  fromSequence: number,
  toSequence: number,
): Promise<AccommodationRow[]> {
  const { rows } = await railRead.query<AccommodationRow>(
    `
    SELECT
      c.travel_class                                           AS travel_class,
      array_agg(DISTINCT c.coach_label ORDER BY c.coach_label)  AS coach_labels,
      array_agg(DISTINCT b.berth_type)                          AS berth_types,
      COALESCE(max(c.amenity_codes), '{}')                      AS amenity_codes,
      count(b.berth_id)::int                                    AS capacity,
      count(occ.berth_id)::int                                  AS sold,
      COALESCE(max(f.fare_paisa), 0)::int                       AS fare_minor
    FROM ctrl.train_run r
    JOIN rake.formation fm   ON fm.run_uid = r.run_uid
    JOIN rake.coach c        ON c.formation_id = fm.formation_id
    JOIN rake.berth b        ON b.coach_id = c.coach_id
    LEFT JOIN res.allocation occ
           ON occ.berth_id = b.berth_id
          AND occ.run_uid = r.run_uid
          AND occ.status IN ('CONFIRMED', 'HELD')
          -- A berth only blocks the legs it is actually occupied for.
          AND int4range(occ.from_sequence, occ.to_sequence)
              && int4range($3::int, $4::int)
    LEFT JOIN fare.slab f
           ON f.travel_class = c.travel_class
          AND f.train_category = (SELECT train_category FROM sched.train WHERE train_id = r.train_id)
          AND f.distance_km_from <= (
                SELECT abs(a.distance_from_origin_km - d.distance_from_origin_km)
                FROM sched.schedule_stop a, sched.schedule_stop d
                WHERE a.train_id = r.train_id AND a.stop_sequence = $3::int
                  AND d.train_id = r.train_id AND d.stop_sequence = $4::int
              )
          AND f.distance_km_to >= (
                SELECT abs(a.distance_from_origin_km - d.distance_from_origin_km)
                FROM sched.schedule_stop a, sched.schedule_stop d
                WHERE a.train_id = r.train_id AND a.stop_sequence = $3::int
                  AND d.train_id = r.train_id AND d.stop_sequence = $4::int
              )
    WHERE r.run_uid = $1
      AND r.service_date = $2::date
      AND c.out_of_service = false
    GROUP BY c.travel_class
    `,
    [serviceId, serviceDate, fromSequence, toSequence],
  );
  return rows;
}

export interface PositionRow {
  service_id: string;
  lat: number;
  lon: number;
  bearing: number | null;
  speed_kph: number | null;
  next_stop_sequence: number | null;
  total_stops: number;
  recorded_at: Date;
  source: string;
}

export async function fetchPositions(serviceIds: string[]): Promise<PositionRow[]> {
  if (serviceIds.length === 0) return [];
  const { rows } = await railRead.query<PositionRow>(
    `
    SELECT DISTINCT ON (p.run_uid)
      p.run_uid             AS service_id,
      p.latitude::float8    AS lat,
      p.longitude::float8   AS lon,
      p.bearing_degrees     AS bearing,
      p.speed_kph           AS speed_kph,
      p.next_stop_sequence  AS next_stop_sequence,
      (SELECT count(*)::int FROM sched.schedule_stop s
        JOIN ctrl.train_run r2 ON r2.train_id = s.train_id
       WHERE r2.run_uid = p.run_uid AND s.passenger_stop = true) AS total_stops,
      p.recorded_at         AS recorded_at,
      p.position_source     AS source
    FROM ctrl.train_position p
    WHERE p.run_uid = ANY($1::text[])
      -- A position older than ten minutes is worse than none: the client can
      -- dead-reckon from the timetable, but it cannot know a fix is stale.
      AND p.recorded_at > now() - interval '10 minutes'
    ORDER BY p.run_uid, p.recorded_at DESC
    `,
    [serviceIds],
  );
  return rows;
}

export interface DisruptionRow {
  id: string;
  severity: string;
  title: string;
  detail: string;
  issued_at: Date;
}

export async function fetchDisruptions(serviceId: string): Promise<DisruptionRow[]> {
  const { rows } = await railRead.query<DisruptionRow>(
    `
    SELECT
      d.notice_ref     AS id,
      d.severity_code  AS severity,
      d.headline       AS title,
      d.body           AS detail,
      d.issued_at      AS issued_at
    FROM ctrl.service_notice d
    JOIN ctrl.service_notice_run nr ON nr.notice_ref = d.notice_ref
    WHERE nr.run_uid = $1
      AND (d.cleared_at IS NULL OR d.cleared_at > now())
    ORDER BY d.issued_at DESC
    `,
    [serviceId],
  );
  return rows;
}
