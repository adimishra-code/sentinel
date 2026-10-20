import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();

if (process.env.NODE_ENV === 'test') {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_must_be_at_least_32_chars_long_123456';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_must_be_at_least_32_chars_123456';
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sentinel-test';
  process.env.WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET || 'test_worker_shared_secret_min_32_chars_123456';
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  API_VERSION: z.string().default('v1'),

  // MongoDB
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required').default('redis://localhost:6379'),

  // Qdrant
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Worker
  WORKER_URL: z.string().url().default('http://localhost:8000'),
  BACKEND_URL: z.string().url().default('http://localhost:3000'),
  WORKER_SHARED_SECRET: z.string().min(32, 'WORKER_SHARED_SECRET must be at least 32 characters long'),

  // SMTP (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: z.string().default('Sentinel'),
  SMTP_FROM_EMAIL: z.string().optional(),

  // Frontend
  VITE_API_URL: z.string().optional(),
  VITE_WS_URL: z.string().optional(),
  VITE_APP_NAME: z.string().default('Sentinel'),
  FRONTEND_PORT: z.coerce.number().default(5173),

  // Worker Python
  WORKER_PORT: z.coerce.number().default(8000),
  MODEL_PROVIDER: z.string().default('gemini'),
  MODEL_NAME: z.string().default('gemini-1.5-flash'),
  GEMINI_API_KEY: z.string().optional(),
  MODEL_API_KEY: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  const zodError = error as z.ZodError;
  const issues = zodError.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
  throw new Error(`Invalid environment configuration:\n  ${issues}`);
}

interface Config {
  nodeEnv: Env['NODE_ENV'];
  port: Env['PORT'];
  logLevel: Env['LOG_LEVEL'];
  apiVersion: Env['API_VERSION'];
  mongo: { uri: Env['MONGO_URI'] };
  redis: { url: Env['REDIS_URL'] };
  qdrant: { url: Env['QDRANT_URL']; apiKey: Env['QDRANT_API_KEY'] | undefined };
  jwt: {
    secret: Env['JWT_SECRET'];
    refreshSecret: Env['JWT_REFRESH_SECRET'];
    expiresIn: Env['JWT_EXPIRES_IN'];
    refreshExpiresIn: Env['JWT_REFRESH_EXPIRES_IN'];
  };
  cors: { origin: string | string[] };
  rateLimit: { windowMs: Env['RATE_LIMIT_WINDOW_MS']; maxRequests: Env['RATE_LIMIT_MAX_REQUESTS'] };
  worker: {
    url: Env['WORKER_URL'];
    backendUrl: Env['BACKEND_URL'];
    sharedSecret: Env['WORKER_SHARED_SECRET'];
  };
  smtp: {
    host: Env['SMTP_HOST'] | undefined;
    port: Env['SMTP_PORT'];
    user: Env['SMTP_USER'] | undefined;
    pass: Env['SMTP_PASS'] | undefined;
    fromName: Env['SMTP_FROM_NAME'];
    fromEmail: Env['SMTP_FROM_EMAIL'] | undefined;
  };
  frontend: {
    apiUrl: Env['VITE_API_URL'] | undefined;
    wsUrl: Env['VITE_WS_URL'] | undefined;
    appName: Env['VITE_APP_NAME'];
    port: Env['FRONTEND_PORT'];
  };
  workerPython: {
    port: Env['WORKER_PORT'];
    modelProvider: Env['MODEL_PROVIDER'];
    modelName: Env['MODEL_NAME'];
    geminiApiKey: Env['GEMINI_API_KEY'] | undefined;
    modelApiKey: Env['MODEL_API_KEY'] | undefined;
  };
  sentryDsn: Env['SENTRY_DSN'] | undefined;
}

const config: Config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  apiVersion: env.API_VERSION,
  mongo: { uri: env.MONGO_URI },
  redis: { url: env.REDIS_URL },
  qdrant: { url: env.QDRANT_URL, apiKey: env.QDRANT_API_KEY },
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  cors: {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  worker: {
    url: env.WORKER_URL,
    backendUrl: env.BACKEND_URL,
    sharedSecret: env.WORKER_SHARED_SECRET,
  },
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    fromName: env.SMTP_FROM_NAME,
    fromEmail: env.SMTP_FROM_EMAIL,
  },
  frontend: {
    apiUrl: env.VITE_API_URL,
    wsUrl: env.VITE_WS_URL,
    appName: env.VITE_APP_NAME,
    port: env.FRONTEND_PORT,
  },
  workerPython: {
    port: env.WORKER_PORT,
    modelProvider: env.MODEL_PROVIDER,
    modelName: env.MODEL_NAME,
    geminiApiKey: env.GEMINI_API_KEY,
    modelApiKey: env.MODEL_API_KEY,
  },
  sentryDsn: env.SENTRY_DSN,
};

export default config;
