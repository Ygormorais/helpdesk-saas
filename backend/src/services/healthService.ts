import mongoose from 'mongoose';
import net from 'net';

async function pingRedis(urlRaw: string): Promise<boolean> {
  try {
    const u = new URL(urlRaw);
    const host = u.hostname;
    const port = u.port ? parseInt(u.port, 10) : 6379;

    return await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port });
      const timer = setTimeout(() => {
        try {
          socket.destroy();
        } catch {
          // ignore
        }
        resolve(false);
      }, 500);

      socket.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });

      socket.on('connect', () => {
        socket.write('*1\r\n$4\r\nPING\r\n');
      });

      let buf = '';
      socket.on('data', (d) => {
        buf += d.toString('utf8');
        if (buf.includes('PONG')) {
          clearTimeout(timer);
          try {
            socket.end();
          } catch {
            // ignore
          }
          resolve(true);
        }
      });
    });
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
