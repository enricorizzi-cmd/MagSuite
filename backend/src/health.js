const db = require('./db');
const cache = require('./cache');
const logger = require('./logger');

async function checkDatabase() {
  try {
    const start = Date.now();
    await db.query('SELECT 1');
    const duration = Date.now() - start;
    return {
      status: 'healthy',
      responseTime: `${duration}ms`,
      maxConnections: process.env.PGPOOL_MAX || 20
    };
  } catch (err) {
    logger.error('Database health check failed:', err);
    return {
      status: 'unhealthy',
      error: err.message
    };
  }
}

async function checkCache() {
  try {
    // If Redis is not configured, return healthy with no-cache mode
    if (!process.env.REDIS_URL) {
      return {
        status: 'healthy',
        mode: 'no-cache',
        message: 'Redis not configured, running in no-cache mode'
      };
    }
    
    const start = Date.now();
    await cache.set('health:check', 'ok', 10);
    const cached = await cache.get('health:check');
    const duration = Date.now() - start;
    
    if (cached === 'ok') {
      await cache.del('health:check');
      return {
        status: 'healthy',
        responseTime: `${duration}ms`,
        mode: 'redis'
      };
    }
    
    return {
      status: 'unhealthy',
      error: 'Cache read/write failed'
    };
  } catch (err) {
    logger.error('Cache health check failed:', err);
    return {
      status: 'unhealthy',
      error: err.message
    };
  }
}

async function checkStorage() {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
    
    // Check if upload directory exists and is writable
    await fs.access(uploadRoot, fs.constants.W_OK);
    
    return {
      status: 'healthy',
      path: uploadRoot
    };
  } catch (err) {
    logger.error('Storage health check failed:', err);
    return {
      status: 'unhealthy',
      error: err.message
    };
  }
}

async function getSystemInfo() {
  const os = require('os');
  const process = require('process');
  
  return {
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      system: Math.round(os.totalmem() / 1024 / 1024 / 1024)
    },
    cpu: {
      loadAverage: os.loadavg(),
      cores: os.cpus().length
    },
    node: {
      version: process.version,
      platform: os.platform(),
      arch: os.arch()
    }
  };
}

module.exports = {
  checkDatabase,
  checkCache,
  checkStorage,
  getSystemInfo
};
