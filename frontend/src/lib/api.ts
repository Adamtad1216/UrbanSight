import {
  cachePayload,
  getNetworkInfo,
  getOfflineQueue,
  isNativeApp,
  queueOfflineMutation,
  readCachedPayload,
  setOfflineQueue,
} from "@/lib/native";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (import.meta.env.PROD && !configuredApiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is required in production");
}

const API_BASE_URL = configuredApiBaseUrl || "http://localhost:5000/api";

if (isNativeApp() && /(localhost|127\.0\.0\.1)/i.test(API_BASE_URL)) {
  throw new Error(
    "Mobile build is using localhost API. Set VITE_API_BASE_URL to your deployed backend URL so mobile and web share the same data.",
  );
}

export type AuthPortal = "unified" | "citizen" | "backoffice";

const AUTH_TOKEN_STORAGE_KEY_PREFIX = "urbanflow.auth.token";
let activeAuthPortal: AuthPortal = "unified";

function getAuthTokenStorageKey(portal: AuthPortal) {
  return `${AUTH_TOKEN_STORAGE_KEY_PREFIX}.${portal}`;
}

function resolvePortal(portal?: AuthPortal) {
  return portal ?? activeAuthPortal;
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  cacheKey?: string;
  queueWhenOffline?: boolean;
}

function resolveRequestBody(body: unknown): BodyInit | undefined {
  if (body instanceof FormData) {
    return body;
  }

  if (body) {
    return JSON.stringify(body);
  }

  return undefined;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    body,
    timeoutMs = 15000,
    retries = 1,
    retryDelayMs = 800,
    cacheKey,
    queueWhenOffline = false,
    ...requestOptions
  } = options;
  const headers = new Headers(options.headers || {});
  const authToken = getStoredAuthToken();
  const method = String(requestOptions.method || "GET").toUpperCase();

  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const requestUrl = `${API_BASE_URL}${path}`;

  let response: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      response = await fetch(requestUrl, {
        ...requestOptions,
        credentials: "include",
        headers,
        body: resolveRequestBody(body),
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      break;
    } catch (error) {
      window.clearTimeout(timer);
      lastError = error;

      if (attempt < retries) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, retryDelayMs),
        );
      }
    }
  }

  if (!response) {
    const network = await getNetworkInfo();

    if (queueWhenOffline && !network.connected && method !== "GET") {
      await queueOfflineMutation({
        method,
        path,
        body,
        headers: Object.fromEntries(headers.entries()),
      });
      throw new Error(
        "No internet connection. Your action was saved and will sync automatically.",
      );
    }

    if (method === "GET" && cacheKey && isNativeApp()) {
      const cached = await readCachedPayload<T>(cacheKey);
      if (cached) return cached;
    }

    throw new Error(
      network.connected
        ? "Request timed out or failed. Please try again."
        : "You are offline and no cached data is available.",
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { success: response.ok, message: response.statusText };

  if (!response.ok || payload.success === false) {
    if (method === "GET" && cacheKey && isNativeApp()) {
      const cached = await readCachedPayload<T>(cacheKey);
      if (cached) return cached;
    }

    throw new Error(payload.message || "Request failed");
  }

  if (method === "GET" && cacheKey && isNativeApp()) {
    await cachePayload(cacheKey, payload as T);
  }

  return payload as T;
}

export async function flushOfflineMutations() {
  if (!isNativeApp()) {
    return;
  }

  const queue = await getOfflineQueue();
  if (!queue.length) {
    return;
  }

  const remaining = [...queue];

  for (const item of queue) {
    try {
      await fetch(`${API_BASE_URL}${item.path}`, {
        method: item.method,
        headers: {
          ...(item.headers || {}),
          Authorization: `Bearer ${getStoredAuthToken() || ""}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      const index = remaining.findIndex((entry) => entry.id === item.id);
      if (index >= 0) {
        remaining.splice(index, 1);
      }
    } catch {
      // Keep remaining mutations queued until next connectivity window.
    }
  }

  await setOfflineQueue(remaining);
}

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest<{ file: { url: string } }>(
    "/uploads/cloudinary",
    {
      method: "POST",
      body: formData,
    },
  );

  return response.file.url;
}

export function setActiveAuthPortal(portal: AuthPortal) {
  activeAuthPortal = portal;
}

export function setStoredAuthToken(token?: string | null, portal?: AuthPortal) {
  if (typeof window === "undefined") {
    return;
  }

  const key = getAuthTokenStorageKey(resolvePortal(portal));

  if (!token) {
    window.sessionStorage.removeItem(key);
    return;
  }

  window.sessionStorage.setItem(key, token);
}

export function getStoredAuthToken(portal?: AuthPortal) {
  if (typeof window === "undefined") {
    return null;
  }

  const key = getAuthTokenStorageKey(resolvePortal(portal));
  return window.sessionStorage.getItem(key);
}

export { API_BASE_URL };
