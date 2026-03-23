import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Brain, MapPin, TrendingUp } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { latLngBounds } from "leaflet";
import { Circle, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { StatCard } from "@/components/dashboard/StatCard";
import { apiRequest } from "@/lib/api";
import { PredictionZone, PredictionZonesV2Response } from "@/types/analytics";

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";
const HORIZON_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
] as const;

const ZONE_COLORS: Record<"red" | "green" | "yellow", string> = {
  red: "#dc2626",
  green: "#16a34a",
  yellow: "#eab308",
};

const DEFAULT_CENTER = { lat: 6.0326, lng: 37.5518 };

type GoogleMapsApi = {
  maps: {
    Map: new (
      element: HTMLElement,
      options: {
        center: { lat: number; lng: number };
        zoom: number;
        mapTypeControl: boolean;
        streetViewControl: boolean;
        fullscreenControl: boolean;
      },
    ) => {
      fitBounds: (bounds: { isEmpty: () => boolean }, padding?: number) => void;
      setCenter: (center: { lat: number; lng: number }) => void;
      setZoom: (zoom: number) => void;
    };
    LatLngBounds: new () => {
      extend: (point: { lat: number; lng: number }) => void;
      isEmpty: () => boolean;
    };
    InfoWindow: new () => {
      setPosition: (point: { lat: number; lng: number }) => void;
      setContent: (html: string) => void;
      open: (options: { map: unknown }) => void;
      close: () => void;
    };
    Circle: new (options: {
      map: unknown;
      center: { lat: number; lng: number };
      radius: number;
      fillColor: string;
      fillOpacity: number;
      strokeColor: string;
      strokeOpacity: number;
      strokeWeight: number;
    }) => {
      addListener: (eventName: string, callback: () => void) => unknown;
      setMap: (map: unknown) => void;
    };
    event: {
      removeListener: (listener: unknown) => void;
    };
  };
};

function getGoogleMapsApi(): GoogleMapsApi | null {
  const candidate = (window as Window & { google?: unknown }).google;
  if (!candidate || typeof candidate !== "object" || !("maps" in candidate)) {
    return null;
  }

  return candidate as GoogleMapsApi;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadGoogleMaps(apiKey: string) {
  return new Promise<void>((resolve, reject) => {
    const googleApi = getGoogleMapsApi();
    if (googleApi?.maps) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(
      GOOGLE_MAPS_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Google Maps API")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google Maps API"));
    document.head.appendChild(script);
  });
}

function getZoneSummary(zones: PredictionZone[]) {
  return zones.reduce(
    (acc, zone) => {
      acc.totalIssues += zone.issueCount;
      acc.totalConnections += zone.connectionCount;

      if (zone.zone === "red") acc.red += 1;
      if (zone.zone === "green") acc.green += 1;
      if (zone.zone === "yellow") acc.yellow += 1;
      if (zone.highRisk || (zone.riskScore || 0) >= 70 || zone.anomalyFlag) {
        acc.highRisk += 1;
      }

      return acc;
    },
    {
      red: 0,
      green: 0,
      yellow: 0,
      highRisk: 0,
      totalIssues: 0,
      totalConnections: 0,
    },
  );
}

function getMapCenter(zones: PredictionZone[]) {
  if (!zones.length) {
    return DEFAULT_CENTER;
  }

  const totals = zones.reduce(
    (acc, zone) => {
      acc.lat += zone.lat;
      acc.lng += zone.lng;
      return acc;
    },
    { lat: 0, lng: 0 },
  );

  return {
    lat: totals.lat / zones.length,
    lng: totals.lng / zones.length,
  };
}

function ZoneFitBoundsController({ zones }: { zones: PredictionZone[] }) {
  const map = useMap();

  useEffect(() => {
    if (!zones.length) {
      return;
    }

    if (zones.length === 1) {
      map.setView([zones[0].lat, zones[0].lng], 14, { animate: true });
      return;
    }

    const bounds = latLngBounds(
      zones.map((zone) => [zone.lat, zone.lng] as [number, number]),
    );

    map.fitBounds(bounds, {
      padding: [24, 24],
      maxZoom: 14,
      animate: true,
    });
  }, [map, zones]);

  return null;
}

export default function LeakagePredictionPage() {
  const [zones, setZones] = useState<PredictionZone[]>([]);
  const [horizonDays, setHorizonDays] = useState<7 | 14 | 30>(7);
  const [modelVersion, setModelVersion] = useState("v2-phase1");
  const [zoneFilter, setZoneFilter] = useState<
    "all" | "red" | "green" | "yellow"
  >("all");
  const [selectedZone, setSelectedZone] = useState<PredictionZone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const googleMapsApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_MAP_API_KEY;

  useEffect(() => {
    const loadZones = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiRequest<PredictionZonesV2Response>(
          `/analytics/prediction-zones-v2?horizon=${horizonDays}`,
        );
        const nextZones = Array.isArray(response.zones) ? response.zones : [];
        setZones(nextZones);
        setModelVersion(response.meta?.modelVersion || "v2-phase1");
      } catch (requestError) {
        try {
          const fallback = await apiRequest<PredictionZone[]>(
            "/analytics/prediction-zones",
          );
          setZones(Array.isArray(fallback) ? fallback : []);
          setModelVersion("v1-compat");
        } catch {
          const message =
            requestError instanceof Error
              ? requestError.message
              : "Unable to load prediction zones";
          setError(message);
          setZones([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadZones();
  }, [horizonDays]);

  const filteredZones = useMemo(() => {
    if (zoneFilter === "all") {
      return zones;
    }

    return zones.filter((zone) => zone.zone === zoneFilter);
  }, [zoneFilter, zones]);

  useEffect(() => {
    if (selectedZone && !filteredZones.some((zone) => zone === selectedZone)) {
      setSelectedZone(null);
    }
  }, [filteredZones, selectedZone]);

  useEffect(() => {
    if (
      !mapContainerRef.current ||
      !filteredZones.length ||
      !googleMapsApiKey
    ) {
      return;
    }

    let disposed = false;
    const cleanupItems: Array<() => void> = [];

    const renderMap = async () => {
      try {
        await loadGoogleMaps(googleMapsApiKey);
        if (disposed) {
          return;
        }

        const googleApi = getGoogleMapsApi();
        if (!googleApi?.maps || !mapContainerRef.current) {
          return;
        }

        const map = new googleApi.maps.Map(mapContainerRef.current, {
          center: getMapCenter(filteredZones),
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const bounds = new googleApi.maps.LatLngBounds();
        const infoWindow = new googleApi.maps.InfoWindow();

        for (const zone of filteredZones) {
          const totalActivity = zone.issueCount + zone.connectionCount;
          const radius = Math.max(150, Math.sqrt(totalActivity) * 220);
          const color = ZONE_COLORS[zone.zone];
          const center = { lat: zone.lat, lng: zone.lng };

          const circle = new googleApi.maps.Circle({
            map,
            center,
            radius,
            fillColor: color,
            fillOpacity: 0.26,
            strokeColor: color,
            strokeOpacity: 0.95,
            strokeWeight: 2,
          });

          bounds.extend(center);

          const tooltipHtml = `<div style="font-family:Inter,sans-serif;line-height:1.35;min-width:190px">
            <div style="font-weight:600;margin-bottom:6px">${escapeHtml(zone.zone.toUpperCase())} Zone</div>
            <div>Issues: <strong>${zone.issueCount}</strong></div>
            <div>Connections: <strong>${zone.connectionCount}</strong></div>
            <div>Risk score: <strong>${Math.round(zone.riskScore || 0)}</strong></div>
            <div>Confidence: <strong>${Math.round(zone.confidence || 0)}%</strong></div>
            <div>Coordinates: ${zone.lat.toFixed(3)}, ${zone.lng.toFixed(3)}</div>
            <div style="margin-top:4px">${zone.highRisk ? "High risk trend detected" : "Stable trend"}</div>
            <div style="margin-top:4px">${escapeHtml((zone.drivers || []).slice(0, 2).join(" • ") || "No dominant drivers")}</div>
          </div>`;

          const overListener = circle.addListener("mouseover", () => {
            setSelectedZone(zone);
            infoWindow.setPosition(center);
            infoWindow.setContent(tooltipHtml);
            infoWindow.open({ map });
          });

          const outListener = circle.addListener("mouseout", () => {
            infoWindow.close();
          });

          cleanupItems.push(() => {
            googleApi.maps.event.removeListener(overListener);
            googleApi.maps.event.removeListener(outListener);
            circle.setMap(null);
          });
        }

        if (!bounds.isEmpty()) {
          if (filteredZones.length === 1) {
            map.setCenter({
              lat: filteredZones[0].lat,
              lng: filteredZones[0].lng,
            });
            map.setZoom(14);
          } else {
            map.fitBounds(bounds, 24);
          }
        }
      } catch (_renderError) {
        if (!disposed) {
          setError("Google Maps failed to load. Check your API key.");
        }
      }
    };

    renderMap();

    return () => {
      disposed = true;
      cleanupItems.forEach((clean) => clean());
    };
  }, [filteredZones, googleMapsApiKey]);

  const summary = useMemo(() => getZoneSummary(zones), [zones]);
  const topZones = useMemo(
    () =>
      [...filteredZones]
        .sort(
          (a, b) =>
            (b.riskScore || 0) - (a.riskScore || 0) ||
            b.issueCount +
              b.connectionCount -
              (a.issueCount + a.connectionCount),
        )
        .slice(0, 5),
    [filteredZones],
  );

  const mapCenter = useMemo(() => getMapCenter(filteredZones), [filteredZones]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">
          Leakage Prediction Zones
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Horizon-based hotspot analytics with risk, confidence, and driver
          explanations
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Red Hotspots"
          value={summary.red}
          icon={AlertTriangle}
          delay={0}
        />
        <StatCard
          title="Green Growth Zones"
          value={summary.green}
          icon={TrendingUp}
          delay={0.05}
        />
        <StatCard
          title="High-Risk/Anomaly"
          value={summary.highRisk}
          icon={Brain}
          delay={0.1}
        />
        <StatCard
          title="Total Tracked Zones"
          value={zones.length}
          icon={MapPin}
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-3 glass-card rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Prediction Map</h3>
            <p className="text-xs text-muted-foreground">
              Model: {modelVersion} · Horizon: {horizonDays}d
            </p>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {HORIZON_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setHorizonDays(option.value)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  horizonDays === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { key: "all", label: "All zones" },
              { key: "red", label: "Red only" },
              { key: "green", label: "Green only" },
              { key: "yellow", label: "Yellow only" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setZoneFilter(item.key as "all" | "red" | "green" | "yellow")
                }
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  zoneFilter === item.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {!googleMapsApiKey ? (
            <div className="h-[520px] w-full rounded-xl border border-border/60 overflow-hidden">
              <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={12}
                className="h-full w-full"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ZoneFitBoundsController zones={filteredZones} />

                {filteredZones.map((zone, index) => {
                  const totalActivity = zone.issueCount + zone.connectionCount;
                  const color = ZONE_COLORS[zone.zone];
                  return (
                    <Circle
                      key={`${zone.zoneId || "zone"}-${index}`}
                      center={[zone.lat, zone.lng]}
                      radius={Math.max(120, Math.sqrt(totalActivity) * 180)}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: 0.26,
                        weight: 2,
                      }}
                      eventHandlers={{
                        mouseover: () => setSelectedZone(zone),
                      }}
                    >
                      <Popup>
                        <div className="text-xs leading-relaxed">
                          <div className="font-semibold uppercase mb-1">
                            {zone.zone} Zone
                          </div>
                          <div>Issues: {zone.issueCount}</div>
                          <div>Connections: {zone.connectionCount}</div>
                          <div>
                            Risk score: {Math.round(zone.riskScore || 0)}
                          </div>
                          <div>
                            Confidence: {Math.round(zone.confidence || 0)}%
                          </div>
                          <div>
                            Coordinates: {zone.lat.toFixed(3)},{" "}
                            {zone.lng.toFixed(3)}
                          </div>
                          <div>
                            {zone.highRisk
                              ? "High risk trend detected"
                              : "Stable trend"}
                          </div>
                          <div>
                            {(zone.drivers || []).slice(0, 2).join(" • ") ||
                              "No dominant drivers"}
                          </div>
                        </div>
                      </Popup>
                    </Circle>
                  );
                })}
              </MapContainer>
            </div>
          ) : (
            <div
              ref={mapContainerRef}
              className="h-[520px] w-full rounded-xl border border-border/60 bg-muted/20"
            />
          )}

          {!googleMapsApiKey && (
            <p className="text-xs text-muted-foreground mt-3">
              Google Maps API key not found. Showing OpenStreetMap fallback.
            </p>
          )}

          {isLoading && (
            <p className="text-sm text-muted-foreground mt-3">
              Loading prediction zones...
            </p>
          )}
          {!isLoading && !filteredZones.length && !error && (
            <p className="text-sm text-muted-foreground mt-3">
              No zones match the selected horizon/filter.
            </p>
          )}
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Legend</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-600" />
                High issue risk
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-600" />
                High connection demand
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-yellow-500" />
                Mixed or moderate activity
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Selected Zone</h3>
            {selectedZone ? (
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zone Type</span>
                  <span className="font-medium uppercase">
                    {selectedZone.zone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issue Reports</span>
                  <span className="font-medium">{selectedZone.issueCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connections</span>
                  <span className="font-medium">
                    {selectedZone.connectionCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Score</span>
                  <span className="font-medium">
                    {Math.round(selectedZone.riskScore || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">
                    {Math.round(selectedZone.confidence || 0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trend/Spike</span>
                  <span className="font-medium">
                    {selectedZone.highRisk || selectedZone.anomalyFlag
                      ? "High"
                      : "Stable"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Drivers</span>
                  <p className="font-medium mt-1">
                    {(selectedZone.drivers || []).slice(0, 3).join(" • ") ||
                      "No dominant drivers"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Hover a circle on the map to inspect counts and drivers.
              </p>
            )}
          </div>

          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Top Risk Zones</h3>
            <div className="space-y-3">
              {topZones.map((zone, index) => (
                <div
                  key={`${zone.zoneId || "zone"}-${index}`}
                  className="text-xs border-b border-border/60 pb-2 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {zone.lat.toFixed(2)}, {zone.lng.toFixed(2)}
                    </span>
                    <span className="uppercase text-[10px] text-muted-foreground">
                      {zone.zone}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Issues: {zone.issueCount} · Connections:{" "}
                    {zone.connectionCount} · Risk:{" "}
                    {Math.round(zone.riskScore || 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
