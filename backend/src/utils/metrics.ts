import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Enable default system metrics collection (heap, CPU, event loop, etc.)
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'sentinel_' });

// HTTP request duration histogram
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'sentinel_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Moderation events counter
export const moderationEventsCounter = new client.Counter({
  name: 'sentinel_moderation_events_total',
  help: 'Total count of content moderation requests',
  labelNames: ['action', 'organization'],
});

// Case operations counter
export const caseOperationsCounter = new client.Counter({
  name: 'sentinel_case_operations_total',
  help: 'Total count of case lifecycle actions',
  labelNames: ['action', 'priority'],
});

// Webhook deliveries counter
export const webhookDeliveriesCounter = new client.Counter({
  name: 'sentinel_webhook_deliveries_total',
  help: 'Total count of webhook deliveries',
  labelNames: ['status', 'event'],
});

// Active cases gauge
export const activeCasesGauge = new client.Gauge({
  name: 'sentinel_active_cases_total',
  help: 'Current number of active unresolved cases',
});

// Express middleware to measure HTTP request durations
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    
    // Normalize path to avoid high cardinality on parameterized paths
    const route = req.baseUrl || req.path || 'unknown';

    httpRequestDurationMicroseconds.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
      },
      durationInSeconds
    );
  });

  next();
};

// Route handler for /metrics endpoint
export const metricsEndpointHandler = async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
};
