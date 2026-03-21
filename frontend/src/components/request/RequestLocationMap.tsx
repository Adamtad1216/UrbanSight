import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

interface RequestLocationMapProps {
  latitude: number;
  longitude: number;
  heightClassName?: string;
}

const markerIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function RequestLocationMap({
  latitude,
  longitude,
  heightClassName = "h-[280px]",
}: RequestLocationMapProps) {
  const markerPosition = useMemo<LatLngExpression>(
    () => [latitude, longitude],
    [latitude, longitude],
  );

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-border/60">
        <MapContainer
          center={markerPosition}
          zoom={14}
          className={`${heightClassName} w-full`}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={markerPosition} icon={markerIcon} />
        </MapContainer>
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </p>
    </div>
  );
}
