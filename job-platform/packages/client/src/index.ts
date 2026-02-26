import createFetchClient from "openapi-fetch";
import type { components, paths } from "./schema.js";

export type { paths } from "./schema.js";
export type { components } from "./schema.js";

export type Job = components["schemas"]["Job"];
export type JobStatus = components["schemas"]["JobStatus"];
export type JobType = components["schemas"]["JobType"];

export type ClientOptions = {
  baseUrl: string;
  apiKey?: string;
};

export function makeClient(opts: ClientOptions) {
  const { baseUrl, apiKey } = opts;
  const client = createFetchClient<paths>({ baseUrl });

  function authHeaders(): Record<string, string> {
    if (!apiKey) return {};
    return { "x-api-key": apiKey };
  }

  return {
    raw: client,

    async listJobs(params?: { limit?: number; cursor?: string; status?: JobStatus; type?: JobType }) {
      return client.GET("/jobs", { params: { query: params }, headers: authHeaders() });
    },

    async createJob(body: paths["/jobs"]["post"]["requestBody"]["content"]["application/json"], idempotencyKey?: string) {
      const headers: Record<string, string> = { ...authHeaders() };
      if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
      return client.POST("/jobs", { body, headers });
    },

    async getJob(id: string) {
      return client.GET("/jobs/{id}", { params: { path: { id } }, headers: authHeaders() });
    },

    async cancelJob(id: string) {
      return client.POST("/jobs/{id}/cancel", { params: { path: { id } }, headers: authHeaders() });
    },

    async retryJob(id: string) {
      return client.POST("/jobs/{id}/retry", { params: { path: { id } }, headers: authHeaders() });
    },

    async getJobArtifact(id: string) {
      return client.GET("/jobs/{id}/artifact", { params: { path: { id } }, headers: authHeaders() });
    },

    async getQueueStats() {
      return client.GET("/queue", { headers: authHeaders() });
    },

    async listDlqJobs(params?: { start?: number; end?: number }) {
      return client.GET("/dlq/jobs", { params: { query: params }, headers: authHeaders() });
    }
  };
}
