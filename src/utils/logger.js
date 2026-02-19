const pino = require('pino');
const appConfig = require('../../config/app.config');

/**
 * Structured Logger using Pino
 * Provides production-ready logging with JSON output
 * 
 * In development, uses pino-pretty for readable output
 * In production, outputs structured JSON for log aggregation
 */
const logger = pino({
  level: appConfig.logLevel,
  transport: appConfig.nodeEnv === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;

