import { createClient } from 'redis';
import { logger } from './logger.js';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connecting: Promise<RedisClient | null> | null = null;

export async function getRedisClient(): Promise<RedisClient | null> {
  const url = String(process.env.REDIS_URL || '').trim();
  if (!url) return null;
  if (client) return client;
  if (connecting) return connecting;

  connecting = (async (): Promise<RedisClient | null> => {
    try {
      const c = createClient({ url });
      c.on('error', (err) => {
        logger.warn({ msg: 'redis.error', error: String((err as any)?.message || err) });
      });
      await c.connect();
      client = c;
      logger.info({ msg: 'redis.connected' });
      return client;
    } catch (err: any) {
      logger.warn({ msg: 'redis.connect_failed', error: String(err?.message || err) });
      client = null;
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}
