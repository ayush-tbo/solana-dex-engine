import pino from 'pino';
import { env } from '../config/environment';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.IS_DEVELOPMENT
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: env.IS_PRODUCTION
    ? {
        env: env.NODE_ENV,
      }
    : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});
