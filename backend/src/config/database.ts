import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDB(): Promise<void> {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${(error as Error).message}`);
    throw error;
  }
}
