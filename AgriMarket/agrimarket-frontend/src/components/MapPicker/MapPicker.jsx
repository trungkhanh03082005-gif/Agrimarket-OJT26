import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./MapPicker.css";
import { getProvinceCoordinates, cleanAddressForSearch, forwardGeocode } from "../../services/addressService";

// Fix default leaflet marker icon issue in Vite/Webpack
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Helper component to center map smoothly using flyTo when coordinates change
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 15, {
        duration: 1.2,
      });
    }
  }, [center, zoom, map]);
  return null;
}

// Helper component to capture click events on map
function MapClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const MapPicker = ({ latitude, longitude, onChange, defaultAddress }) => {
  const defaultCenter = [10.8231, 106.6297]; // HCMC coordinates as default
  const [position, setPosition] = useState(null);
  const [centerCoords, setCenterCoords] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(13);
  const [isSearching, setIsSearching] = useState(false);
  const markerRef = useRef(null);
  const lastGeocodedAddressRef = useRef("");

  // Sync position and center from props
  useEffect(() => {
    if (latitude && longitude) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition([lat, lng]);
        setCenterCoords([lat, lng]);
        setMapZoom(16);
      }
    } else {
      setPosition(null);
    }
  }, [latitude, longitude]);

  // Handle marker drag-end event
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onChange(latLng.lat, latLng.lng, false);
        }
      },
    }),
    [onChange]
  );

  const handleMapClick = (lat, lng) => {
    onChange(lat, lng, false);
  };

  // Robust geocoding with 2-tier strategy (Instant local province center + cleaned Nominatim search)
  const geocodeAddressText = React.useCallback(
    async (addressToGeocode = defaultAddress, showErrors = false) => {
      if (!addressToGeocode || addressToGeocode.trim() === "" || addressToGeocode.includes("Not updated") || addressToGeocode.includes("Chưa có địa chỉ")) {
        return;
      }

      // Tier 1: Check instant local province coordinates first
      const provCoords = getProvinceCoordinates(addressToGeocode);
      if (provCoords && (!latitude || !longitude)) {
        setCenterCoords(provCoords);
        setMapZoom(12);
      }

      setIsSearching(true);

      const cleanedFull = cleanAddressForSearch(addressToGeocode);
      const cleanedParts = cleanedFull.split(",").map((p) => p.trim()).filter(Boolean);

      const queries = [];
      // 1. Cleaned full query
      if (cleanedFull) queries.push(cleanedFull);
      // 2. Raw full query
      if (addressToGeocode) queries.push(addressToGeocode);

      // 3. Fallbacks
      if (cleanedParts.length >= 3) {
        // street + district + province
        queries.push(`${cleanedParts[0]}, ${cleanedParts[cleanedParts.length - 2]}, ${cleanedParts[cleanedParts.length - 1]}`);
        // ward + district + province
        queries.push(`${cleanedParts[cleanedParts.length - 3]}, ${cleanedParts[cleanedParts.length - 2]}, ${cleanedParts[cleanedParts.length - 1]}`);
        // district + province
        queries.push(`${cleanedParts[cleanedParts.length - 2]}, ${cleanedParts[cleanedParts.length - 1]}`);
        // province
        queries.push(cleanedParts[cleanedParts.length - 1]);
      } else if (cleanedParts.length === 2) {
        queries.push(`${cleanedParts[0]}, ${cleanedParts[1]}`);
        queries.push(cleanedParts[1]);
      }

      const fallbackQueries = [...new Set(queries)].filter(Boolean);
      let success = false;

      for (const queryText of fallbackQueries) {
        try {
          const result = await forwardGeocode(queryText);
          if (result && !isNaN(result.lat) && !isNaN(result.lon)) {
            lastGeocodedAddressRef.current = addressToGeocode;
            onChange(result.lat, result.lon, true);
            setCenterCoords([result.lat, result.lon]);
            setMapZoom(16);
            success = true;
            break;
          }
        } catch (err) {
          console.warn(`Geocoding attempt for "${queryText}" failed:`, err);
        }
      }

      setIsSearching(false);

      if (!success) {
        // If full search failed but we have province coords, at least set position to province center
        if (provCoords && (!latitude || !longitude)) {
          onChange(provCoords[0], provCoords[1], true);
          setCenterCoords(provCoords);
          setMapZoom(12);
        } else if (showErrors) {
          alert("Không thể tìm thấy vị trí chính xác trên bản đồ. Bạn có thể nhấp chuột trực tiếp lên bản đồ để ghim vị trí trang trại!");
        }
      }
    },
    [defaultAddress, latitude, longitude, onChange]
  );

  // Auto-geocode debounced whenever defaultAddress changes
  useEffect(() => {
    if (!defaultAddress || defaultAddress.trim() === "" || defaultAddress.includes("Not updated") || defaultAddress.includes("Chưa có địa chỉ")) {
      return;
    }

    if (defaultAddress.trim() === lastGeocodedAddressRef.current.trim()) {
      return;
    }

    // Instant flyTo province center when province is selected/changed
    const provCoords = getProvinceCoordinates(defaultAddress);
    if (provCoords && (!latitude || !longitude)) {
      setCenterCoords(provCoords);
      setMapZoom(12);
    }

    // Debounced detailed geocoding
    const timer = setTimeout(() => {
      geocodeAddressText(defaultAddress, false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [defaultAddress, geocodeAddressText, latitude, longitude]);

  return (
    <div className="map-picker-container">
      <div className="map-picker-header">
        <span className="map-picker-title" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <MapPin size={18} /> Định vị vị trí chính xác trên bản đồ
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isSearching && (
            <span style={{ fontSize: "12px", color: "var(--admin-primary, #10b981)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Loader2 size={14} className="spin-animation" /> Đang tìm kiếm...
            </span>
          )}
          {defaultAddress && (
            <button
              type="button"
              className="map-geocode-btn"
              onClick={() => geocodeAddressText(defaultAddress, true)}
              title="Định vị nhanh dựa vào địa chỉ chữ đã nhập"
              disabled={isSearching}
            >
              Định vị theo địa chỉ đã nhập
            </button>
          )}
        </div>
      </div>

      <div className="map-wrapper-element">
        <MapContainer
          center={centerCoords}
          zoom={mapZoom}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeMapView center={centerCoords} zoom={mapZoom} />
          <MapClickHandler onClick={handleMapClick} />
          {position && (
            <Marker
              draggable={true}
              eventHandlers={eventHandlers}
              position={position}
              ref={markerRef}
            />
          )}
        </MapContainer>
      </div>
      <p className="map-picker-hint">
        {position
          ? `Tọa độ hiện tại: ${position[0].toFixed(6)}, ${position[1].toFixed(6)} (Bạn có thể nhấp chuột hoặc kéo thả ghim đỏ để chọn vị trí chính xác).`
          : "Chưa chọn vị trí trên bản đồ. Vui lòng nhập địa chỉ hoặc nhấp vào bản đồ để ghim vị trí."}
      </p>
    </div>
  );
};

export default MapPicker;
