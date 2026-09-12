-- Gateway-owned schema. This is OUR database, not the railway's.
-- The operator's train system is read-only to this service; nothing here
-- writes to it. See docs/ARCHITECTURE.md.

CREATE TABLE IF NOT EXISTS ticket (
  ticket_id           text PRIMARY KEY,
  subject             text        NOT NULL,
  idempotency_key     text        NOT NULL,
  device_fingerprint  text        NOT NULL,
  service_id          text        NOT NULL,
  reference           text        NOT NULL UNIQUE,
  signature           text        NOT NULL,
  key_id              text        NOT NULL,
  barcode_seed        text        NOT NULL,
  payload             jsonb       NOT NULL,
  issued_at           timestamptz NOT NULL,
  activated_at        timestamptz,
  refunded_at         timestamptz
);

-- The guarantee behind idempotent purchase: a retry cannot create a second
-- ticket, because the second INSERT violates this index inside the transaction.
CREATE UNIQUE INDEX IF NOT EXISTS ticket_idempotency
  ON ticket (subject, idempotency_key);

CREATE INDEX IF NOT EXISTS ticket_by_subject ON ticket (subject, issued_at DESC);
CREATE INDEX IF NOT EXISTS ticket_by_service ON ticket (service_id);

CREATE TABLE IF NOT EXISTS fare (
  fare_id      text PRIMARY KEY,
  service_id   text,
  travel_class char(1)  NOT NULL CHECK (travel_class IN ('S', 'F')),
  flexibility  text     NOT NULL CHECK (flexibility IN ('advance', 'off-peak', 'anytime')),
  price_minor  integer  NOT NULL CHECK (price_minor >= 0),
  currency     char(3)  NOT NULL DEFAULT 'GBP',
  on_sale      boolean  NOT NULL DEFAULT true,
  valid_from   timestamptz NOT NULL DEFAULT now(),
  valid_to     timestamptz
);

CREATE TABLE IF NOT EXISTS device (
  device_fingerprint text PRIMARY KEY,
  subject            text        NOT NULL,
  platform           text,
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz NOT NULL DEFAULT now()
);

-- Append-only audit of ticket issuance and activation. Separate from `ticket`
-- so that a bug in the write path cannot quietly erase the history of it.
CREATE TABLE IF NOT EXISTS ticket_event (
  event_id   bigserial PRIMARY KEY,
  ticket_id  text        NOT NULL,
  event_type text        NOT NULL,
  detail     jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_event_by_ticket ON ticket_event (ticket_id, occurred_at);
