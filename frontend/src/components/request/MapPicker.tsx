import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { LatLngExpression, Map as LeafletMap } from "leaflet";
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

function isWithinEthiopia(latitude: number, longitude: number) {
  return latitude >= 3 && latitude <= 15 && longitude >= 33 && longitude <= 48;
}

const markerIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({
  onSelect,
  onInvalidSelection,
}: {
  onSelect: (latitude: number, longitude: number) => void;
  onInvalidSelection: () => void;
}) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      if (!isWithinEthiopia(lat, lng)) {
        onInvalidSelection();
        return;
      }

      onSelect(lat, lng);
    },
  });

  return null;
}

function MapInstanceBridge({
  onReady,
}: {
  onReady: (map: LeafletMap) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

export function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [outOfBoundsWarning, setOutOfBoundsWarning] = useState(false);

  const markerPosition = useMemo<LatLngExpression>(
    () => [latitude, longitude],
    [latitude, longitude],
  );

  const handleInvalidSelection = () => {
    setOutOfBoundsWarning(true);
  };

  const handleValidSelection = (
    nextLatitude: number,
    nextLongitude: number,
  ) => {
    setOutOfBoundsWarning(false);
    onChange(nextLatitude, nextLongitude);
  };

  const centerToSelectedLocation = () => {
    if (!mapInstance) {
      return;
    }

    mapInstance.flyTo(
      [latitude, longitude],
      Math.max(mapInstance.getZoom(), 13),
      {
        animate: true,
        duration: 0.6,
      },
    );
  };

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
          <MapInstanceBridge onReady={setMapInstance} />
          <ClickHandler
            onSelect={handleValidSelection}
            onInvalidSelection={handleInvalidSelection}
          />
          <Marker
            position={markerPosition}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend(event) {
                const latLng = event.target.getLatLng();
                if (!isWithinEthiopia(latLng.lat, latLng.lng)) {
                  event.target.setLatLng(L.latLng(latitude, longitude));
                  mapInstance?.panTo([latitude, longitude]);
                  handleInvalidSelection();
                  return;
                }

                handleValidSelection(latLng.lat, latLng.lng);
              },
            }}
          />
        </MapContainer>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Click to place marker, then drag to adjust location in Arba Minch.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={centerToSelectedLocation}
        >
          Return to selected location
        </Button>
      </div>
      {outOfBoundsWarning && (
        <p className="text-xs text-destructive">
          Please choose a location inside Ethiopia bounds only.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Ethiopia map bounds: Latitude 3 to 15, Longitude 33 to 48.
      </p>
      <p className="text-xs font-medium text-muted-foreground">
        Selected coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </p>
    </div>
  );
}
