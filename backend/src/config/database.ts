import mongoose from 'mongoose';
import { config } from './index.js';
import { logger, serializeError } from '../services/logger.js';

export async function connectDB(): Promise<void> {
  try {
    // Avoid request handlers hanging for 10s+ when DB is down.
    mongoose.set('bufferCommands', false);

    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    logger.info({
      msg: 'mongodb.connected',
      host: conn.connection.host,
      dbName: conn.connection.name,
    });
  } catch (error) {
    logger.error({
      msg: 'mongodb.connection_error',
      error: serializeError(error, { includeStack: true }),
    });
    throw error;
  }
}
