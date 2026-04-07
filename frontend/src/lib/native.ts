import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Network } from "@capacitor/network";
import { Preferences } from "@capacitor/preferences";

const PREF_GROUP = "UrbanSight";
const OFFLINE_QUEUE_KEY = "offline.queue";
const CACHE_PREFIX = "cache";

let configured = false;

async function ensureConfigured() {
  if (configured) return;
  await Preferences.configure({ group: PREF_GROUP });
  configured = true;
}

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function getNetworkInfo() {
  try {
    return await Network.getStatus();
  } catch {
    return {
      connected: typeof navigator !== "undefined" ? navigator.onLine : true,
      connectionType: "unknown" as const,
    };
  }
}

export async function hapticLight() {
  if (!isNativeApp()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Non-critical UX improvement.
  }
}

export async function hapticMedium() {
  if (!isNativeApp()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // Non-critical UX improvement.
  }
}

export async function getCurrentCoordinates() {
  if (!isNativeApp()) {
    return null;
  }

  const permission = await Geolocation.requestPermissions();
  if (permission.location === "denied") {
    throw new Error(
      "Location permission denied. Enable location access to attach coordinates.",
    );
  }

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 15000,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export async function capturePhotoFile() {
  if (!isNativeApp()) {
    return null;
  }

  const photo = await Camera.getPhoto({
    source: CameraSource.Camera,
    resultType: CameraResultType.Uri,
    quality: 80,
    allowEditing: false,
  });

  if (!photo.webPath) {
    throw new Error("Unable to capture image.");
  }

  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const extension = blob.type.includes("png") ? "png" : "jpg";
  const fileName = `report-${Date.now()}.${extension}`;
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

export type OfflineMutation = {
  id: string;
  path: string;
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
  queuedAt: number;
};

export async function getOfflineQueue(): Promise<OfflineMutation[]> {
  await ensureConfigured();
  const { value } = await Preferences.get({ key: OFFLINE_QUEUE_KEY });
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as OfflineMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setOfflineQueue(queue: OfflineMutation[]) {
  await ensureConfigured();
  await Preferences.set({
    key: OFFLINE_QUEUE_KEY,
    value: JSON.stringify(queue),
  });
}

export async function queueOfflineMutation(
  mutation: Omit<OfflineMutation, "id" | "queuedAt">,
) {
  const current = await getOfflineQueue();
  current.push({
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: Date.now(),
  });
  await setOfflineQueue(current);
}

export async function cachePayload<T>(key: string, value: T) {
  await ensureConfigured();
  await Preferences.set({
    key: `${CACHE_PREFIX}.${key}`,
    value: JSON.stringify({ value, ts: Date.now() }),
  });
}

export async function readCachedPayload<T>(key: string): Promise<T | null> {
  await ensureConfigured();
  const { value } = await Preferences.get({ key: `${CACHE_PREFIX}.${key}` });
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as { value?: T };
    return parsed.value ?? null;
  } catch {
    return null;
  }
}
