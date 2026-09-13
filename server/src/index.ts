import { createServer } from 'node:http';
import express from 'express';

import { config } from './config.js';
import { checkConnectivity, shutdown } from './db/pool.js';
import { referenceRouter } from './routes/reference.js';
import { serviceRouter } from './routes/services.js';
import { ticketRouter } from './routes/tickets.js';
import { connectionRouter } from './routes/connections.js';
import { mapsRouter } from './routes/maps.js';
import { attachPositionStream } from './realtime/positions.js';
import { requestId, securityHeaders, cachePolicy, notFound, errorHandler } from './middleware/security.js';
import { rateLimit } from './middleware/rateLimit.js';

const app = express();

app.disable('x-powered-by');
// Behind a load balancer, so req.ip must come from the forwarded header - but
// only one hop, or a client can spoof its own address by sending the header.
app.set('trust proxy', 1);

app.use(requestId);
app.use(securityHeaders);
app.use(express.json({ limit: '32kb' }));
app.use(rateLimit);

app.get('/healthz', cachePolicy(0), async (_req, res) => {
  const health = await checkConnectivity();
  const ok = health.rail && health.gateway;
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', ...health });
});

app.use('/v1', referenceRouter);
app.use('/v1', serviceRouter);
app.use('/v1', ticketRouter);
app.use('/v1', connectionRouter);
app.use('/v1/maps', mapsRouter);

app.use(notFound);
app.use(errorHandler);

const server = createServer(app);
attachPositionStream(server, '/v1/stream');

server.listen(config.PORT, () => {
  console.log(`Safar gateway listening on :${config.PORT} (${config.NODE_ENV})`);
});

/**
 * Graceful shutdown: stop accepting connections, let in-flight requests finish,
 * then close the pools. A hard exit here drops someone's ticket purchase
 * mid-transaction.
 */
async function stop(signal: string) {
  console.log(`[shutdown] ${signal}`);
  server.close(async () => {
    await shutdown();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 15_000).unref();
}

process.on('SIGTERM', () => void stop('SIGTERM'));
process.on('SIGINT', () => void stop('SIGINT'));
