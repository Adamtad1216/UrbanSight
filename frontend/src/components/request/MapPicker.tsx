import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { Label } from "@/components/ui/label";

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
}

const arbaminchCenter: LatLngExpression = [6.032, 37.55];

const markerIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const markerPosition = useMemo<LatLngExpression>(
    () => [latitude, longitude],
    [latitude, longitude],
  );

  return (
    <div className="space-y-2">
      <Label>Map Location</Label>
      <div className="overflow-hidden rounded-xl border border-border/60">
        <MapContainer
          center={markerPosition || arbaminchCenter}
          zoom={13}
          className="h-[320px] w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onSelect={onChange} />
          <Marker
            position={markerPosition}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend(event) {
                const latLng = event.target.getLatLng();
                onChange(latLng.lat, latLng.lng);
              },
            }}
          />
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Click to place marker, then drag to adjust location in Arba Minch.
      </p>
      <p className="text-xs font-medium text-muted-foreground">
        Selected coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </p>
    </div>
  );
}
