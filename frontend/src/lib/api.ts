const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (import.meta.env.PROD && !configuredApiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is required in production");
}

const API_BASE_URL = configuredApiBaseUrl || "http://localhost:5000/api";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
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
  const { body, ...requestOptions } = options;
  const headers = new Headers(options.headers || {});
  const authToken = getStoredAuthToken();

  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      credentials: "include",
      headers,
      body: resolveRequestBody(body),
    });
  } catch {
    throw new Error(
      "Unable to reach the server. Ensure the backend is running and CORS is configured for this frontend origin.",
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { success: response.ok, message: response.statusText };

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "Request failed");
  }

  return payload as T;
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

export function setStoredAuthToken(token?: string | null) {
  // Session auth is handled by httpOnly cookies. Keep this helper for compatibility.
  void token;
}

export function getStoredAuthToken() {
  return null;
}

export { API_BASE_URL };
