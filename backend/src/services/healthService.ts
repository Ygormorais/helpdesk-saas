import mongoose from 'mongoose';
import { createClient } from 'redis';

async function pingRedis(urlRaw: string): Promise<boolean> {
  try {
    const client = createClient({ url: urlRaw, socket: { connectTimeout: 1000 } });
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch {
    return false;
  }
}

export async function getReadiness() {
  const mongoReadyState = mongoose.connection.readyState;
  const mongoConnected = mongoReadyState === 1;
  let mongoPingOk = false;

  if (mongoConnected) {
    try {
      await mongoose.connection.db?.admin().ping();
      mongoPingOk = true;
    } catch {
      mongoPingOk = false;
    }
  }

  const redisUrl = String(process.env.REDIS_URL || '').trim();
  const redisConfigured = !!redisUrl;
  const redisOk = redisConfigured ? await pingRedis(redisUrl) : true;

  const ready = mongoConnected && mongoPingOk && redisOk;

  return {
    ready,
    deps: {
      mongo: {
        readyState: mongoReadyState,
        connected: mongoConnected,
        ping: mongoPingOk,
      },
      redis: {
        configured: redisConfigured,
        ok: redisOk,
      },
    },
  };
}
