import winston from 'winston';
import config from '../config';

/**
 * Fields whose values should be redacted in log output.
 */
const REDACTED_FIELDS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'content',
  'text',
  'reason',
  'outcomeRationale',
  'rationale',
]);

const REDACTED = '[REDACTED]';

/**
 * Recursively redact sensitive fields from an object.
 */
const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (REDACTED_FIELDS.has(key.toLowerCase())) {
        redacted[key] = REDACTED;
      } else {
        redacted[key] = redact(val);
      }
    }
    return redacted;
  }
  return value;
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const cleanMeta = redact(meta as Record<string, unknown>) as Record<string, unknown>;
    const metaStr = Object.keys(cleanMeta).length ? JSON.stringify(cleanMeta) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const cleanMeta = redact(meta as Record<string, unknown>) as Record<string, unknown>;
    const metaStr = Object.keys(cleanMeta).length ? JSON.stringify(cleanMeta) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: config.nodeEnv === 'production' ? logFormat : consoleFormat,
  }),
];

if (config.nodeEnv === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    })
  );
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports,
  defaultMeta: { service: 'sentinel-backend' },
  exitOnError: false,
});

export default logger;