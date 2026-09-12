import { railRead } from './pool.js';

/**
 * Adapter over the operator's existing schema.
 *
 * The railway's database predates this app by decades and its shapes reflect
 * that: stations are TIPLOCs, times are stored as local wall-clock plus a
 * next-day flag, and a "service" is a schedule row joined to a daily activation.
 * All of that ugliness is contained in this file. Everything above it speaks
 * the clean domain model in src/types, so when the operator migrates a table we
 * change one adapter instead of an app.
 *
 * Every statement here is parameterised. There is no string interpolation into
 * SQL anywhere in this file, and that is not an accident.
 */

export interface StationRow {
  id: string;
  code: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  platforms: string[];
  facilities: string[];
  concourse_walk_minutes: number;
  timezone: string;
}

export async function fetchStations(): Promise<StationRow[]> {
  const { rows } = await railRead.query<StationRow>(
    `
    SELECT
      'stn-' || lower(s.crs_code)            AS id,
      s.crs_code                             AS code,
      s.station_name                         AS name,
      COALESCE(s.locality_name, s.station_name) AS city,
      s.latitude::float8                     AS lat,
      s.longitude::float8                    AS lon,
      COALESCE(
        array_agg(DISTINCT p.platform_label ORDER BY p.platform_label)
          FILTER (WHERE p.platform_label IS NOT NULL),
        '{}'
      )                                      AS platforms,
      COALESCE(f.facility_codes, '{}')       AS facilities,
      COALESCE(s.concourse_transit_minutes, 4) AS concourse_walk_minutes,
      COALESCE(s.timezone, 'Europe/London')  AS timezone
    FROM ref.station s
    LEFT JOIN ref.platform p ON p.station_id = s.station_id
    LEFT JOIN ref.station_facility f ON f.station_id = s.station_id
    WHERE s.public_service = true
      AND s.valid_to IS NULL
    GROUP BY s.station_id, f.facility_codes
    ORDER BY s.station_name
    `,
  );
  return rows;
}

export interface CallRow {
  service_id: string;
  headcode: string;
  operator: string;
  station_id: string;
  sequence: number;
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
 * One service, with its calling pattern and whatever real-time movement data
 * the control system has published for it.
 *
 * The LEFT JOIN on rt.movement is what makes this work during an outage of the
 * real-time feed: the schedule still resolves, `expected_*` falls back to
 * `scheduled_*`, and the app degrades to timetable times rather than to a blank
 * screen.
 */
export async function fetchServiceCalls(serviceId: string, serviceDate: string): Promise<CallRow[]> {
  const { rows } = await railRead.query<CallRow>(
    `
    SELECT
      a.activation_uid                                  AS service_id,
      sc.signalling_id                                  AS headcode,
      op.operator_name                                  AS operator,
      'stn-' || lower(st.crs_code)                      AS station_id,
      cp.call_sequence                                  AS sequence,
      cp.public_arrival_at                              AS scheduled_arrival,
      cp.public_departure_at                            AS scheduled_departure,
      COALESCE(mv.actual_arrival_at, mv.forecast_arrival_at, cp.public_arrival_at)     AS expected_arrival,
      COALESCE(mv.actual_departure_at, mv.forecast_departure_at, cp.public_departure_at) AS expected_departure,
      COALESCE(mv.platform_label, cp.planned_platform)  AS platform,
      COALESCE(mv.platform_confirmed, false)            AS platform_confirmed,
      COALESCE(mv.delay_minutes, 0)                     AS delay_minutes,
      COALESCE(mv.movement_status, 'SCHEDULED')         AS call_status,
      COALESCE(a.cancellation_code IS NOT NULL, false)  AS cancelled
    FROM rt.activation a
    JOIN sched.schedule sc     ON sc.schedule_uid = a.schedule_uid
    JOIN ref.operator op       ON op.operator_id = sc.operator_id
    JOIN sched.calling_point cp ON cp.schedule_uid = sc.schedule_uid
    JOIN ref.station st        ON st.tiploc = cp.tiploc
    LEFT JOIN rt.movement mv   ON mv.activation_uid = a.activation_uid
                              AND mv.call_sequence = cp.call_sequence
    WHERE a.activation_uid = $1
      AND a.service_date = $2::date
      AND cp.public_call = true
    ORDER BY cp.call_sequence
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
  windowMinutes = 120,
): Promise<DepartureRow[]> {
  const crs = stationId.replace(/^stn-/, '').toUpperCase();
  const { rows } = await railRead.query<DepartureRow>(
    `
    WITH board AS (
      SELECT a.activation_uid, cp.call_sequence
      FROM rt.activation a
      JOIN sched.calling_point cp ON cp.schedule_uid = a.schedule_uid
      JOIN ref.station st ON st.tiploc = cp.tiploc
      WHERE st.crs_code = $1
        AND cp.public_call = true
        AND a.service_date = CURRENT_DATE
        AND cp.public_departure_at BETWEEN now() - interval '10 minutes'
                                       AND now() + ($2 || ' minutes')::interval
    )
    SELECT
      a.activation_uid                              AS service_id,
      sc.signalling_id                              AS headcode,
      op.operator_name                              AS operator,
      'stn-' || lower(st.crs_code)                  AS station_id,
      cp.call_sequence                              AS sequence,
      cp.public_arrival_at                          AS scheduled_arrival,
      cp.public_departure_at                        AS scheduled_departure,
      COALESCE(mv.actual_arrival_at, mv.forecast_arrival_at, cp.public_arrival_at)     AS expected_arrival,
      COALESCE(mv.actual_departure_at, mv.forecast_departure_at, cp.public_departure_at) AS expected_departure,
      COALESCE(mv.platform_label, cp.planned_platform) AS platform,
      COALESCE(mv.platform_confirmed, false)        AS platform_confirmed,
      COALESCE(mv.delay_minutes, 0)                 AS delay_minutes,
      COALESCE(mv.movement_status, 'SCHEDULED')     AS call_status,
      COALESCE(a.cancellation_code IS NOT NULL, false) AS cancelled,
      'stn-' || lower(dest.crs_code)                AS destination_station_id
    FROM board b
    JOIN rt.activation a        ON a.activation_uid = b.activation_uid
    JOIN sched.schedule sc      ON sc.schedule_uid = a.schedule_uid
    JOIN ref.operator op        ON op.operator_id = sc.operator_id
    JOIN sched.calling_point cp ON cp.schedule_uid = sc.schedule_uid
    JOIN ref.station st         ON st.tiploc = cp.tiploc
    JOIN ref.station dest       ON dest.tiploc = sc.destination_tiploc
    LEFT JOIN rt.movement mv    ON mv.activation_uid = a.activation_uid
                               AND mv.call_sequence = cp.call_sequence
    ORDER BY expected_departure
    `,
    [crs, String(windowMinutes)],
  );
  return rows;
}

export interface FormationRow {
  coach_letter: string;
  position: number;
  travel_class: string;
  seats: number;
  amenity_codes: string[];
  occupancy: number | null;
  out_of_service: boolean;
}

/**
 * Formation and live loading. `occupancy` comes from the train's own
 * load-weighing or door-counting system and is frequently null - a unit with a
 * failed counter reports nothing rather than zero, and the app must show
 * "unknown" instead of "empty" when it does.
 */
export async function fetchFormation(serviceId: string): Promise<FormationRow[]> {
  const { rows } = await railRead.query<FormationRow>(
    `
    SELECT
      c.coach_label                       AS coach_letter,
      c.position_from_front               AS position,
      c.travel_class                      AS travel_class,
      c.seat_count                        AS seats,
      COALESCE(c.amenity_codes, '{}')     AS amenity_codes,
      l.load_factor::float8               AS occupancy,
      COALESCE(c.out_of_service, false)   AS out_of_service
    FROM rt.formation f
    JOIN rt.formation_coach c ON c.formation_id = f.formation_id
    LEFT JOIN LATERAL (
      SELECT load_factor
      FROM rt.coach_loading
      WHERE coach_id = c.coach_id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) l ON true
    WHERE f.activation_uid = $1
    ORDER BY c.position_from_front
    `,
    [serviceId],
  );
  return rows;
}

export interface PositionRow {
  service_id: string;
  lat: number;
  lon: number;
  bearing: number | null;
  speed_kph: number | null;
  next_call_sequence: number | null;
  recorded_at: Date;
  source: string;
}

export async function fetchPositions(serviceIds: string[]): Promise<PositionRow[]> {
  if (serviceIds.length === 0) return [];
  const { rows } = await railRead.query<PositionRow>(
    `
    SELECT DISTINCT ON (p.activation_uid)
      p.activation_uid      AS service_id,
      p.latitude::float8    AS lat,
      p.longitude::float8   AS lon,
      p.bearing_degrees     AS bearing,
      p.speed_kph           AS speed_kph,
      p.next_call_sequence  AS next_call_sequence,
      p.recorded_at         AS recorded_at,
      p.position_source     AS source
    FROM rt.train_position p
    WHERE p.activation_uid = ANY($1::text[])
      AND p.recorded_at > now() - interval '10 minutes'
    ORDER BY p.activation_uid, p.recorded_at DESC
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
      d.incident_ref   AS id,
      d.severity_code  AS severity,
      d.summary        AS title,
      d.description    AS detail,
      d.issued_at      AS issued_at
    FROM rt.disruption d
    JOIN rt.disruption_service ds ON ds.incident_ref = d.incident_ref
    WHERE ds.activation_uid = $1
      AND (d.cleared_at IS NULL OR d.cleared_at > now())
    ORDER BY d.issued_at DESC
    `,
    [serviceId],
  );
  return rows;
}
