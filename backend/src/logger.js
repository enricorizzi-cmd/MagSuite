const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for deployment logs
const deploymentFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.json(),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
  })
);

// Create logger with multiple transports
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: deploymentFormat,
  transports: [
    // Console transport
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    
    // File transport for all logs
    new transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // File transport for errors only
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // File transport for deployment-specific logs
    new transports.File({
      filename: path.join(logsDir, 'deployment.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
      tailable: true,
      format: format.combine(
        format.timestamp(),
        format.json()
      )
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3
    })
  ]
});

// Add deployment-specific logging methods
logger.deployment = {
  info: (message, meta = {}) => logger.info(message, { ...meta, category: 'deployment' }),
  warn: (message, meta = {}) => logger.warn(message, { ...meta, category: 'deployment' }),
  error: (message, meta = {}) => logger.error(message, { ...meta, category: 'deployment' }),
  debug: (message, meta = {}) => logger.debug(message, { ...meta, category: 'deployment' })
};

logger.health = {
  info: (message, meta = {}) => logger.info(message, { ...meta, category: 'health' }),
  warn: (message, meta = {}) => logger.warn(message, { ...meta, category: 'health' }),
  error: (message, meta = {}) => logger.error(message, { ...meta, category: 'health' }),
  debug: (message, meta = {}) => logger.debug(message, { ...meta, category: 'health' })
};

logger.database = {
  info: (message, meta = {}) => logger.info(message, { ...meta, category: 'database' }),
  warn: (message, meta = {}) => logger.warn(message, { ...meta, category: 'database' }),
  error: (message, meta = {}) => logger.error(message, { ...meta, category: 'database' }),
  debug: (message, meta = {}) => logger.debug(message, { ...meta, category: 'database' })
};

module.exports = logger;
