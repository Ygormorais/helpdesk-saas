import { AsyncLocalStorage } from 'async_hooks';

export type RequestContext = {
  requestId?: string;
  tenantId?: string;
  userId?: string;
};

const als = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function getContext(): RequestContext | undefined {
  return als.getStore();
}

export function updateContext(partial: Partial<RequestContext>) {
  const ctx = als.getStore();
  if (!ctx) return;
  Object.assign(ctx, partial);
}

export function getRequestId(): string | undefined {
  return als.getStore()?.requestId;
}
