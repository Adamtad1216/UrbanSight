import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Search } from "lucide-react";
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

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
}

type SearchResult = {
  lat: string;
  lon: string;
  display_name?: string;
  name?: string;
};

const arbaminchCenter: LatLngExpression = [6.032, 37.55];

function isWithinEthiopia(latitude: number, longitude: number) {
  return latitude >= 3 && latitude <= 15 && longitude >= 33 && longitude <= 48;
}

function getSearchLabel(result: SearchResult) {
  return result.display_name || result.name || "Selected location";
}

function isSearchResult(value: unknown): value is SearchResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SearchResult>;
  return typeof candidate.lat === "string" && typeof candidate.lon === "string";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchRequestIdRef = useRef(0);
  const suppressNextSearchRef = useRef(false);

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

  const fetchSearchResults = async (
    query: string,
    signal?: AbortSignal,
  ): Promise<SearchResult[]> => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=et&addressdetails=1&email=urbanflow@example.com&viewbox=37.40,6.15,37.70,5.90&q=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: "application/json",
        },
        signal,
      },
    );

    if (!response.ok) {
      throw new Error("Unable to search the map right now.");
    }

    const rawResults = (await response.json()) as unknown[];
    return rawResults.filter(isSearchResult);
  };

  const applySearchResult = (result: SearchResult) => {
    const nextLatitude = Number.parseFloat(result.lat);
    const nextLongitude = Number.parseFloat(result.lon);

    if (
      Number.isNaN(nextLatitude) ||
      Number.isNaN(nextLongitude) ||
      !isWithinEthiopia(nextLatitude, nextLongitude)
    ) {
      setSearchError(
        "Found a result outside Ethiopia. Please search within Ethiopia only.",
      );
      return;
    }

    suppressNextSearchRef.current = true;
    setSearchQuery(getSearchLabel(result));
    setSearchResults([]);
    setShowSuggestions(false);
    setSearchError(null);
    setSearching(false);
    setOutOfBoundsWarning(false);
    onChange(nextLatitude, nextLongitude);
    mapInstance?.flyTo([nextLatitude, nextLongitude], 15, {
      animate: true,
      duration: 0.7,
    });
  };

  useEffect(() => {
    const query = searchQuery.trim();

    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return;
    }

    if (query.length < 1) {
      searchRequestIdRef.current += 1;
      setSearchResults([]);
      setShowSuggestions(false);
      setSearchError(null);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    const controller = new AbortController();
    
    setSearching(true);
    setShowSuggestions(true);
    setSearchError(null);
    
    const timeoutId = window.setTimeout(() => {
      void fetchSearchResults(query, controller.signal)
        .then((results) => {
          if (
            controller.signal.aborted ||
            requestId !== searchRequestIdRef.current
          ) {
            return;
          }

          setSearchResults(results);
          setShowSuggestions(true);
          setSearchError(null);
        })
        .catch((error) => {
          if (
            controller.signal.aborted ||
            requestId !== searchRequestIdRef.current
          ) {
            return;
          }

          setSearchResults([]);
          setShowSuggestions(true);
          setSearchError(
            error instanceof Error
              ? error.message
              : "Unable to search the map right now.",
          );
        })
        .finally(() => {
          if (
            !controller.signal.aborted &&
            requestId === searchRequestIdRef.current
          ) {
            setSearching(false);
          }
        });
    }, 300);

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        searchContainerRef.current &&
        target &&
        !searchContainerRef.current.contains(target)
      ) {
        setShowSuggestions(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [searchQuery]);

  return (
    <div className="space-y-2" ref={searchContainerRef}>
      <Label>Map Location</Label>
      <div className="relative z-[1000] flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setShowSuggestions(true);
            }}
            placeholder="Search by town, kebele, street, or landmark"
            aria-label="Search location on map"
            className="pl-9 bg-card"
            onFocus={() => {
              if (searchQuery.trim().length > 0) {
                setShowSuggestions(true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (showSuggestions && searchResults.length > 0) {
                  const idx = Math.max(0, highlightedIndex);
                  applySearchResult(searchResults[idx] || searchResults[0]);
                  return;
                }
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                if (searchResults.length > 0) {
                  setShowSuggestions(true);
                  setHighlightedIndex((i) =>
                    Math.min(i + 1, searchResults.length - 1),
                  );
                }
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                if (searchResults.length > 0) {
                  setHighlightedIndex((i) => Math.max(i - 1, 0));
                }
              }

              if (event.key === "Escape") {
                setShowSuggestions(false);
              }
            }}
          />
        </div>
        {showSuggestions && searchQuery.trim().length > 0 ? (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] w-1/2 overflow-hidden rounded-xl border border-border/70 bg-card shadow-xl">
            <div className="max-h-56 overflow-y-auto py-2">
              {searching ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Fetching results...</span>
                </div>
              ) : searchError ? (
                <div className="px-4 py-3 text-sm text-destructive">
                  {searchError}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  No locations found.
                </div>
              ) : (
                searchResults.map((result, index) => {
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <button
                      key={`${result.lat}-${result.lon}-${index}`}
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        applySearchResult(result);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/70 ${isHighlighted ? "bg-muted/60" : ""}`}
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {getSearchLabel(result)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Number.parseFloat(result.lat).toFixed(5)},{" "}
                          {Number.parseFloat(result.lon).toFixed(5)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
      <div className="relative z-0 overflow-hidden rounded-xl border border-border/60">
        <MapContainer
          center={markerPosition || arbaminchCenter}
          zoom={13}
          className="h-[500px] w-full"
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
      {searchError ? (
        <p className="text-xs text-destructive">{searchError}</p>
      ) : null}
    </div>
  );
}
