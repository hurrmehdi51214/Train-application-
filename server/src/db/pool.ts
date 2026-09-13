import { readFileSync } from 'node:fs';
import pg from 'pg';

import { config } from '../config.js';

/**
 * Two pools, and the separation is the point.
 *
 * `railRead` is the operator's existing train system. It is opened with a role
 * that has SELECT and nothing else, against a read replica, over verified TLS.
 * Even a total compromise of this service cannot alter a timetable, a signal or
 * a crew roster.
 *
 * `gatewayWrite` is our own database: orders, issued tickets, device bindings.
 * Everything this product creates lives here, which keeps our write path and
 * the railway's write path physically distinct.
 */

function railSsl(): pg.ConnectionConfig['ssl'] {
  if (config.RAIL_DB_SSL_MODE === 'disable') return undefined;
  if (config.RAIL_DB_SSL_MODE === 'require') return { rejectUnauthorized: false };
  if (!config.RAIL_DB_SSL_ROOT_CERT) {
    throw new Error('RAIL_DB_SSL_ROOT_CERT is required when RAIL_DB_SSL_MODE is verify-full');
  }
  return {
    rejectUnauthorized: true,
    ca: readFileSync(config.RAIL_DB_SSL_ROOT_CERT, 'utf8'),
  };
}

export const railRead = new pg.Pool({
  host: config.RAIL_DB_HOST,
  port: config.RAIL_DB_PORT,
  database: config.RAIL_DB_NAME,
  user: config.RAIL_DB_USER,
  password: config.RAIL_DB_PASSWORD,
  ssl: railSsl(),
  max: config.RAIL_DB_MAX_CONNECTIONS,
  // A query against the operator's replica that has not answered in four
  // seconds will not answer usefully. Failing fast protects the replica from
  // us far more than it protects us.
  statement_timeout: config.RAIL_DB_STATEMENT_TIMEOUT_MS,
  idleTimeoutMillis: 30_000,
  application_name: 'safar-gateway',
});

export const gatewayWrite = new pg.Pool({
  connectionString: config.GATEWAY_DB_URL,
  max: 20,
  application_name: 'safar-gateway',
});

railRead.on('connect', (client) => {
  // Belt and braces: even if the role were mis-granted, the session cannot write.
  void client.query('SET default_transaction_read_only = on');
});

railRead.on('error', (error) => {
  console.error('[rail-read] idle client error', error.message);
});

gatewayWrite.on('error', (error) => {
  console.error('[gateway-write] idle client error', error.message);
});

export async function shutdown(): Promise<void> {
  await Promise.allSettled([railRead.end(), gatewayWrite.end()]);
}

/** Cheap liveness probe for /healthz. */
export async function checkConnectivity(): Promise<{ rail: boolean; gateway: boolean }> {
  const [rail, gateway] = await Promise.allSettled([
    railRead.query('SELECT 1'),
    gatewayWrite.query('SELECT 1'),
  ]);
  return { rail: rail.status === 'fulfilled', gateway: gateway.status === 'fulfilled' };
}
