import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Phone, Navigation, HeartPulse, Building2, Stethoscope } from "lucide-react";
import type { Place } from "@/services/places";

export type HospitalMapProps = {
  places: (Place & { km: number | null })[];
  userLocation: { lat: number; lng: number } | null;
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: Place) => void;
  labels: {
    call: string;
    directions: string;
    gynAvailable: string;
    phoneNotListed?: string;
  };
};

// Create crisp, SVG-based divIcons to avoid missing PNG assets in Vite
const hospitalIcon = L.divIcon({
  className: "custom-map-icon",
  html: `<div style="background-color: #b5532f; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); font-weight: bold; font-size: 14px;">H</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

const clinicIcon = L.divIcon({
  className: "custom-map-icon",
  html: `<div style="background-color: #2b7a78; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); font-weight: bold; font-size: 12px;">+</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

const userIcon = L.divIcon({
  className: "custom-map-icon",
  html: `<div style="background-color: #17252a; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 5px rgba(43, 122, 120, 0.4);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function RecenterMap({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom());
  }, [center, zoom, map]);
  return null;
}

export function HospitalMap({
  places,
  userLocation,
  selectedPlaceId,
  onSelectPlace,
  labels,
}: HospitalMapProps) {
  // Center on user location, selected place, or default to Telangana/Hyderabad
  const defaultCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : places.length > 0 && places[0]
      ? [places[0].lat, places[0].lng]
      : [17.4239, 78.5026];

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : defaultCenter;

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-3xl border-2 border-border shadow-inner">
      <MapContainer
        center={center}
        zoom={userLocation ? 11 : 9}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        <RecenterMap center={center} />

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="p-1 font-sans text-xs font-bold text-foreground">📍 You are here</div>
            </Popup>
          </Marker>
        )}

        {/* Facility Markers */}
        {places.map((place) => {
          const icon = place.type === "hospital" ? hospitalIcon : clinicIcon;
          const isSelected = selectedPlaceId === place.id;

          return (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectPlace?.(place),
              }}
            >
              <Popup>
                <div className="p-1 font-sans">
                  <p className="flex items-center gap-1 font-bold text-foreground text-sm">
                    {place.type === "hospital" ? (
                      <Building2 className="size-4 text-primary" />
                    ) : (
                      <HeartPulse className="size-4 text-accent" />
                    )}
                    {place.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {place.address || `${place.town}, ${place.district}`}
                    {place.km != null && ` · ${place.km} km`}
                  </p>
                  {(place.hasWomenHealth || place.hasGynaecology) && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-accent">
                      <Stethoscope className="size-3" /> {labels.gynAvailable}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    {place.phone ? (
                      <a
                        href={`tel:${place.phone}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground"
                      >
                        <Phone className="size-3" /> {labels.call}
                      </a>
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {labels.phoneNotListed || "Phone not listed"}
                      </span>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-primary px-2.5 py-1 text-xs font-bold text-primary"
                    >
                      <Navigation className="size-3" /> {labels.directions}
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
