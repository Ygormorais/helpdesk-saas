export function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getEnvOptional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length ? v : undefined;
}
