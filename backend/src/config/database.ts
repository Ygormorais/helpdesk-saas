import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDB(): Promise<void> {
  try {
    // Avoid request handlers hanging for 10s+ when DB is down.
    mongoose.set('bufferCommands', false);

    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${(error as Error).message}`);
    throw error;
  }
}
