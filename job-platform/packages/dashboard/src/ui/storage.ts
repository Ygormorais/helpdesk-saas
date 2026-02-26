const KEY = "jp.dashboard.v1";

export type StoredConfig = {
  baseUrl: string;
  apiKey?: string;
};

export function loadConfig(): StoredConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) throw new Error("missing");
    const parsed = JSON.parse(raw) as Partial<StoredConfig>;
    if (!parsed.baseUrl || typeof parsed.baseUrl !== "string") throw new Error("bad");
    return {
      baseUrl: parsed.baseUrl,
      apiKey: typeof parsed.apiKey === "string" && parsed.apiKey.length ? parsed.apiKey : undefined
    };
  } catch {
    return {
      baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:4010",
      apiKey: import.meta.env.VITE_API_KEY
    };
  }
}

export function saveConfig(cfg: StoredConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}
