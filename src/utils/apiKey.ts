const STORAGE_KEY = "ats_custom_gemini_api_key";
const EVENT_NAME = "ats-api-key-changed";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function setStoredApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error("Failed to persist custom API key:", err);
  }
}

export function removeStoredApiKey(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error("Failed to remove custom API key:", err);
  }
}

export function hasStoredApiKey(): boolean {
  return Boolean(getStoredApiKey());
}

export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••••••";
  return trimmed.slice(0, 6) + "••••••••" + trimmed.slice(-4);
}

export function getApiHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...additionalHeaders,
  };
  const key = getStoredApiKey();
  if (key) {
    headers["x-gemini-api-key"] = key;
  }
  return headers;
}

export function subscribeToApiKeyChanges(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}
