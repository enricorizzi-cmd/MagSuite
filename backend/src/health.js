const db = require('./db');
const cache = require('./cache');
const logger = require('./logger');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const process = require('process');

async function checkDatabase() {
  try {
    const start = Date.now();
    const result = await db.query('SELECT 1, version(), current_database(), current_user');
    const duration = Date.now() - start;
    
    // Additional database checks
    const dbInfo = result.rows[0];
    const connectionCount = await db.query('SELECT count(*) FROM pg_stat_activity WHERE state = $1', ['active']);
    
    return {
      status: 'healthy',
      responseTime: `${duration}ms`,
      maxConnections: process.env.PGPOOL_MAX || 20,
      activeConnections: parseInt(connectionCount.rows[0].count),
      database: {
        version: dbInfo.version,
        name: dbInfo.current_database,
        user: dbInfo.current_user
      },
      connectionPool: {
        max: process.env.PGPOOL_MAX || 20,
        idleTimeout: process.env.PG_IDLE_TIMEOUT_MS || 0,
        connectionTimeout: process.env.PG_CONNECTION_TIMEOUT_MS || 10000
      }
    };
  } catch (err) {
    logger.error('Database health check failed:', err);
    return {
      status: 'unhealthy',
      error: err.message,
      code: err.code,
      severity: err.code === 'ECONNREFUSED' ? 'critical' : 'warning',
      suggestions: getDatabaseSuggestions(err)
    };
  }
}

function getDatabaseSuggestions(err) {
  const suggestions = [];
  
  if (err.code === 'ECONNREFUSED') {
    suggestions.push('Database server is not running or not accessible');
    suggestions.push('Check DATABASE_URL environment variable');
  } else if (err.code === 'ENOTFOUND') {
    suggestions.push('Database hostname cannot be resolved');
    suggestions.push('Check network connectivity and DNS settings');
  } else if (err.code === 'ETIMEDOUT') {
    suggestions.push('Database connection timeout');
    suggestions.push('Check network latency and database server load');
  } else if (err.code === '28P01') {
    suggestions.push('Authentication failed');
    suggestions.push('Check database credentials in DATABASE_URL');
  } else if (err.code === '3D000') {
    suggestions.push('Database does not exist');
    suggestions.push('Create the database or check DATABASE_URL');
  }
  
  return suggestions;
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
    // Use environment variable for upload directory, fallback to relative path
    const uploadRoot = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
    
    // Create upload directory if it doesn't exist
    try {
      await fsp.access(uploadRoot, fs.constants.W_OK);
    } catch (accessErr) {
      // Directory doesn't exist, create it
      await fsp.mkdir(uploadRoot, { recursive: true });
      logger.info('Created upload directory:', uploadRoot);
    }

    // Check disk space
    await fsp.stat(uploadRoot);
    const tempFile = path.join(
      uploadRoot,
      `.health-check-temp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );

    try {
      await fsp.writeFile(tempFile, 'health-check');
      try {
        await fsp.unlink(tempFile);
      } catch (unlinkErr) {
        if (unlinkErr.code !== 'ENOENT') {
          throw unlinkErr;
        }
      }
    } catch (writeErr) {
      throw new Error(`Cannot write to upload directory: ${writeErr.message}`);
    }
    
    return {
      status: 'healthy',
      path: uploadRoot,
      writable: true,
      message: 'Upload directory ready'
    };
  } catch (err) {
    logger.error('Storage health check failed:', err);
    return {
      status: 'unhealthy',
      error: err.message,
      severity: 'critical',
      suggestions: [
        'Check file system permissions',
        'Ensure upload directory exists and is writable',
        'Check available disk space'
      ]
    };
  }
}

async function getSystemInfo() {
  return {
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      system: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    cpu: {
      loadAverage: os.loadavg(),
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown'
    },
    node: {
      version: process.version,
      platform: os.platform(),
      arch: os.arch(),
      pid: process.pid
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasRedisUrl: !!process.env.REDIS_URL
    }
  };
}

async function checkEnvironmentVariables() {
  const required = [
    'DATABASE_URL',
    'ACCESS_SECRET', 
    'REFRESH_SECRET',
    'API_KEY'
  ];
  
  const optional = [
    'REDIS_URL',
    'SSO_SECRET',
    'FILE_ENCRYPTION_KEY',
    'CORS_ORIGIN',
    'SUPABASE_CA_CERT',
    'VAPID_PUBLIC',
    'VAPID_PRIVATE',
    'SENTRY_DSN'
  ];
  
  const missing = [];
  const present = [];
  
  for (const varName of required) {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  }
  
  for (const varName of optional) {
    if (process.env[varName]) {
      present.push(varName);
    }
  }
  
  return {
    status: missing.length === 0 ? 'healthy' : 'unhealthy',
    required: {
      present,
      missing
    },
    optional: optional.filter(v => process.env[v]),
    severity: missing.length > 0 ? 'critical' : 'ok'
  };
}

module.exports = {
  checkDatabase,
  checkCache,
  checkStorage,
  getSystemInfo,
  checkEnvironmentVariables
};

