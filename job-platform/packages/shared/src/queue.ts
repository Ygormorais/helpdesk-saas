import { Queue } from "bullmq";
import { getEnv } from "./env.js";

export type QueueConfig = {
  name: string;
  connection: {
    url: string;
  };
};

export function getQueueConfig(): QueueConfig {
  return {
    name: process.env.QUEUE_NAME || "jobs",
    connection: {
      url: getEnv("REDIS_URL")
    }
  };
}

export function makeQueue() {
  const cfg = getQueueConfig();
  return new Queue(cfg.name, {
    connection: { url: cfg.connection.url }
  });
}

export function makeDlqQueue() {
  const name = process.env.DLQ_NAME || "jobs-dlq";
  const url = getEnv("REDIS_URL");
  return new Queue(name, {
    connection: { url }
  });
}
