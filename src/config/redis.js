/**
 * Dedicated Production Redis Configuration & Socket.io Adapter Integration
 *
 * Environment variables configured:
 * - REDIS_URL (Full connection string e.g. redis://user:pass@host:port)
 * - REDIS_HOST (Host fallback, default: localhost)
 * - REDIS_PORT (Port fallback, default: 6379)
 * - REDIS_USERNAME (Optional)
 * - REDIS_PASSWORD (Optional)
 */

const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

let mainClient = null;
let pubClient = null;
let subClient = null;

function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;
  const username = process.env.REDIS_USERNAME;
  const password = process.env.REDIS_PASSWORD;

  if (redisUrl) {
    return { url: redisUrl };
  }

  if (host) {
    return {
      socket: {
        host: host || 'localhost',
        port: parseInt(port || '6379', 10),
      },
      username: username || undefined,
      password: password || undefined,
    };
  }

  return null;
}

/**
 * Creates and connects a standalone Redis client instance.
 * Returns null if no Redis environment configuration is supplied.
 */
async function getRedisClient() {
  if (mainClient && mainClient.isOpen) {
    return mainClient;
  }

  const config = getRedisConfig();
  if (!config) {
    return null;
  }

  try {
    mainClient = createClient(config);
    mainClient.on('error', (err) => {
      console.warn('[Redis Client Warning]:', err.message);
    });
    await mainClient.connect();
    console.log('[Redis] Standalone client connected successfully.');
    return mainClient;
  } catch (err) {
    console.warn('[Redis Error] Failed to initialize Redis client:', err.message);
    return null;
  }
}

/**
 * Initializes and attaches the Socket.io Redis Adapter for horizontal scaling.
 * Falls back to default in-memory Socket.io adapter if connection fails or config is absent.
 */
async function setupRedisAdapter(io) {
  const config = getRedisConfig();
  if (!config) {
    console.log('[Redis Adapter] No REDIS_URL or REDIS_HOST specified. Socket.io running in single-instance mode.');
    return false;
  }

  try {
    pubClient = createClient(config);
    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      console.warn('[Redis PubClient Warning]:', err.message);
    });

    subClient.on('error', (err) => {
      console.warn('[Redis SubClient Warning]:', err.message);
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Redis Adapter] Socket.io Redis adapter connected successfully for multi-instance sync.');
    return true;
  } catch (err) {
    console.warn('[Redis Adapter Fallback] Failed to connect Redis adapter. Running in local memory fallback mode:', err.message);
    return false;
  }
}

/**
 * Cleanly disconnects all active Redis clients during shutdown.
 */
async function closeRedisConnections() {
  const closeTasks = [];
  if (mainClient && mainClient.isOpen) closeTasks.push(mainClient.disconnect());
  if (pubClient && pubClient.isOpen) closeTasks.push(pubClient.disconnect());
  if (subClient && subClient.isOpen) closeTasks.push(subClient.disconnect());

  if (closeTasks.length > 0) {
    await Promise.allSettled(closeTasks);
    console.log('[Redis] All Redis connection clients closed.');
  }
}

module.exports = {
  getRedisClient,
  setupRedisAdapter,
  closeRedisConnections,
};
