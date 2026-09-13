import { z } from 'zod';

/**
 * Configuration is validated once, at boot. A gateway that starts with a
 * missing database certificate and only discovers it under load at 07:40 on a
 * Monday is worse than one that refuses to start at all.
 */
const schema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  RAIL_DB_HOST: z.string().min(1),
  RAIL_DB_PORT: z.coerce.number().default(5432),
  RAIL_DB_NAME: z.string().min(1),
  RAIL_DB_USER: z.string().min(1),
  RAIL_DB_PASSWORD: z.string().default(''),
  RAIL_DB_SSL_MODE: z.enum(['disable', 'require', 'verify-full']).default('verify-full'),
  RAIL_DB_SSL_ROOT_CERT: z.string().optional(),
  RAIL_DB_MAX_CONNECTIONS: z.coerce.number().default(10),
  RAIL_DB_STATEMENT_TIMEOUT_MS: z.coerce.number().default(4000),

  GATEWAY_DB_URL: z.string().min(1),

  TICKET_SIGNING_KEY_ID: z.string().min(1),
  TICKET_SIGNING_KMS_URI: z.string().optional(),
  ED25519_PRIVATE_KEY_PEM: z.string().optional(),

  JWT_ISSUER: z.string().url(),
  JWT_AUDIENCE: z.string().min(1),
  JWT_PUBLIC_KEY_PEM: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),

  /**
   * Server-side Google Maps key, for Directions / Places / Geocoding /
   * Distance Matrix. This one is billable and cannot be restricted by bundle
   * id or referrer, so it stays here and the app reaches it only through
   * /v1/maps/*. Leaving it unset disables those routes; the app falls back to
   * its bundled vector geometry, which is a supported mode, not a failure.
   */
  GOOGLE_MAPS_SERVER_KEY: z.string().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid gateway configuration:\n${issues}`);
}

export const config = parsed.data;

if (config.NODE_ENV === 'production') {
  if (config.RAIL_DB_SSL_MODE !== 'verify-full') {
    throw new Error('RAIL_DB_SSL_MODE must be verify-full in production');
  }
  if (config.ED25519_PRIVATE_KEY_PEM) {
    throw new Error('Ticket signing keys must come from the KMS in production, not the environment');
  }
  if (!config.TICKET_SIGNING_KMS_URI) {
    throw new Error('TICKET_SIGNING_KMS_URI is required in production');
  }
}
