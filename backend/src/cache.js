const Redis = require('ioredis');
const logger = require('./logger');

let redis = null;

// Initialize Redis connection
function initRedis() {
  if (redis) return redis;
  
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // Skip Redis initialization if no URL provided (for Render compatibility)
  if (!process.env.REDIS_URL) {
    logger.info('Redis not configured, running in no-cache mode');
    return null;
  }
  
  try {
    redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
      // Fallback to no-cache mode
      redis = null;
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    return redis;
  } catch (err) {
    logger.error('Failed to initialize Redis:', err);
    return null;
  }
}

// Cache wrapper with fallback
async function get(key) {
  const client = initRedis();
  if (!client) return null;
  
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    logger.error('Redis get error:', err);
    return null;
  }
}

async function set(key, value, ttlSeconds = 300) {
  const client = initRedis();
  if (!client) return false;
  
  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    logger.error('Redis set error:', err);
    return false;
  }
}

async function del(key) {
  const client = initRedis();
  if (!client) return false;
  
  try {
    await client.del(key);
    return true;
  } catch (err) {
    logger.error('Redis del error:', err);
    return false;
  }
}

async function exists(key) {
  const client = initRedis();
  if (!client) return false;
  
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (err) {
    logger.error('Redis exists error:', err);
    return false;
  }
}

// Cache with automatic key generation
function cacheKey(prefix, ...params) {
  return `${prefix}:${params.join(':')}`;
}

// Cache decorator for functions
function cached(prefix, ttlSeconds = 300) {
  return function(target, propertyName, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const key = cacheKey(prefix, ...args);
      const cached = await get(key);
      
      if (cached !== null) {
        return cached;
      }
      
      const result = await originalMethod.apply(this, args);
      await set(key, result, ttlSeconds);
      return result;
    };
    
    return descriptor;
  };
}

module.exports = {
  initRedis,
  get,
  set,
  del,
  exists,
  cacheKey,
  cached
};
