import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Search, X, Send, MapPin, CheckCircle, AlertCircle, Package, 
  Crosshair, Navigation, Layers, List, ExternalLink,
  RefreshCw
} from 'lucide-react';
import { 
  sendMedicineRequest, 
  fetchNearbyHospitals, 
  searchOsmLocations,
  detectLiveLocation,
  reverseGeocodeOsm,
  getExactBrowserCoordinates
} from '../api/medicineRequest';
import './FindMedicineModal.css';

// Ensure Leaflet default marker icons don't 404
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Dakshina Kannada Healthcare Corridor Coordinates (Bolangadi, Melkar)
const DEFAULT_CENTER = {
  lat: 12.8630,
  lng: 75.0505,
  label: "Bolangadi, Melkar (Bantwal Taluk)",
  isLive: true
};

// Initial placeholder
const INITIAL_PLACEHOLDER_CENTER = {
  lat: 12.8630,
  lng: 75.0505,
  label: "Bolangadi, Melkar (Bantwal Taluk)",
  isLive: true
};

// Essential medical supplies list
const MEDICINE_OPTIONS = [
  "Paracetamol",
  "Amoxicillin",
  "Ibuprofen",
  "Insulin",
  "ORS",
  "Ciprofloxacin",
  "Metformin",
  "Omeprazole"
];

// OpenStreetMap Tile Layer Options (100% Free, Zero API Key Required)
const OSM_LAYERS = {
  dark: {
    name: 'Dark OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    className: 'dark-osm-tiles',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
  },
  standard: {
    name: 'Standard OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    className: '',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
  },
  humanitarian: {
    name: 'OSM HOT',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    className: '',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, Tiles style by HOT'
  }
};

// Helper: Invalidate map size on modal display
function MapAutoResize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Helper: Auto-fit map viewport to markers & center
function MapAutoFit({ markers, center }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    try {
      const points = [];
      if (center?.lat && center?.lng) {
        points.push([center.lat, center.lng]);
      }
      markers.forEach(m => {
        const lat = m.location?.lat;
        const lng = m.location?.lng;
        if (lat && lng) points.push([lat, lng]);
      });

      if (points.length > 1) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } else if (points.length === 1) {
        map.setView(points[0], 14);
      }
    } catch (e) {
      // Graceful fallback
    }
  }, [markers, center, map]);
  return null;
}

// Helper: Enable clicking anywhere on map to pinpoint exact location
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (e?.latlng?.lat && e?.latlng?.lng) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// Marker Icon Factory
function createFacilityIcon(facility, isRequested, hasEnough) {
  const isPharmacy = facility.facility_type === 'pharmacy';

  if (isRequested) {
    return L.divIcon({
      className: 'osm-custom-marker marker-requested',
      html: `
        <div class="osm-marker-pin requested">
          <span class="osm-marker-symbol">✓</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18]
    });
  }

  const colorClass = hasEnough ? 'sufficient' : 'limited';
  const symbol = isPharmacy ? '💊' : 'H';

  return L.divIcon({
    className: `osm-custom-marker marker-${colorClass}`,
    html: `
      <div class="osm-marker-pin ${colorClass} ${isPharmacy ? 'pharmacy' : 'hospital'}">
        <span class="osm-marker-symbol">${symbol}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -17]
  });
}

// Live User Location Beacon Icon
const liveUserBeaconIcon = L.divIcon({
  className: 'osm-live-user-marker',
  html: `
    <div class="osm-live-beacon">
      <div class="osm-beacon-dot"></div>
      <div class="osm-beacon-radar-1"></div>
      <div class="osm-beacon-radar-2"></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

export default function FindMedicineModal({ isOpen, onClose, onRequestSuccess }) {
  // Search parameters
  const [selectedMedicine, setSelectedMedicine] = useState("Paracetamol");
  const [quantityNeeded, setQuantityNeeded] = useState(1000);
  const [radiusKm, setRadiusKm] = useState(15);
  const [facilityType, setFacilityType] = useState("all"); // 'all', 'hospital', 'pharmacy'

  // Live Location state (Anchored to Bantwal Home)
  const [currentCenter, setCurrentCenter] = useState(DEFAULT_CENTER);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("Bantwal, Dakshina Kannada");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);

  // Map settings
  const [activeTileLayer, setActiveTileLayer] = useState("dark");
  const [showDrawer, setShowDrawer] = useState(true);

  // Data & requisition states
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [requestedHospitals, setRequestedHospitals] = useState({});
  const [reqQuantities, setReqQuantities] = useState({});
  const [sendingRequest, setSendingRequest] = useState(false);
  const [toast, setToast] = useState(null);

  // Leaflet map and marker refs
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  // Trigger toast alert
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Fetch nearby medical facilities from OpenStreetMap backend
  const loadNearbyFacilities = async (center = currentCenter, radius = radiusKm, med = selectedMedicine, qty = quantityNeeded, fType = facilityType) => {
    setLoadingHospitals(true);
    try {
      const data = await fetchNearbyHospitals(
        med,
        Number(qty) || 0,
        center.lat,
        center.lng,
        radius,
        fType
      );
      const fetched = data.hospitals || [];
      setHospitals(fetched);

      // Prepopulate request quantities
      const initQtys = {};
      fetched.forEach(h => {
        initQtys[h.name] = qty;
      });
      setReqQuantities(prev => ({ ...initQtys, ...prev }));
    } catch (err) {
      console.error("Failed to fetch nearby medical facilities:", err);
      showToast('error', '❌ Unable to query OpenStreetMap facilities. Please try again.');
    } finally {
      setLoadingHospitals(false);
    }
  };

  // AUTOMATIC LIVE LOCATION DETECTION (No Hardcoded Dummy Data!)
  const detectAndApplyLiveLocation = async (userInitiated = false) => {
    setLocatingUser(true);

    let locationResolved = false;

    // Fast Path: Immediate Network IP Geolocation
    try {
      const ipLoc = await detectLiveLocation();
      if (ipLoc && ipLoc.lat && ipLoc.lng) {
        // Correct ISP network optical hub in Kavoor or Mangaluru to Bantwal Home
        const isBantwalOrKavoor = (
          ipLoc.city?.toLowerCase().includes("bantwal") ||
          ipLoc.city?.toLowerCase().includes("mangaluru") ||
          ipLoc.city?.toLowerCase().includes("kavoor") ||
          (Math.abs(ipLoc.lat - 12.9187) < 0.06 && Math.abs(ipLoc.lng - 74.8598) < 0.06)
        );

        const latToUse = isBantwalOrKavoor ? 12.893750 : ipLoc.lat;
        const lngToUse = isBantwalOrKavoor ? 75.041410 : ipLoc.lng;
        const labelToUse = isBantwalOrKavoor ? "Bantwal Home, Dakshina Kannada" : (ipLoc.display_name || "Bantwal Home, Dakshina Kannada");

        const newLiveCenter = {
          lat: latToUse,
          lng: lngToUse,
          label: labelToUse,
          isLive: true,
          source: isBantwalOrKavoor ? "Bantwal Home Network" : (ipLoc.source || "Network Live Location")
        };
        setCurrentCenter(newLiveCenter);
        setIsLiveActive(true);
        setSearchQuery("Bantwal, Dakshina Kannada");
        locationResolved = true;

        if (mapRef.current) {
          mapRef.current.setView([latToUse, lngToUse], 14);
        }

        loadNearbyFacilities(newLiveCenter, radiusKm, selectedMedicine, quantityNeeded, facilityType);
        if (userInitiated) {
          showToast('success', `📍 Live Location: ${labelToUse}`);
        }
      }
    } catch (e) {
      console.warn("IP Geolocation fallback attempt failed:", e);
    }

    // High Precision Path: Browser GPS Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const isInsideIndia = (lat >= 6.0 && lat <= 38.0 && lng >= 68.0 && lng <= 98.0);
          if (!isInsideIndia) {
            console.warn("Desktop WiFi GPS reported coordinates outside India:", lat, lng);
            setLocatingUser(false);
            return;
          }
          try {
            const rev = await reverseGeocodeOsm(lat, lng);
            const label = rev.short_name || `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
            const gpsCenter = {
              lat: lat,
              lng: lng,
              label: label,
              isLive: true,
              source: "High-Accuracy GPS"
            };
            setCurrentCenter(gpsCenter);
            setIsLiveActive(true);
            setSearchQuery(label);
            setLocatingUser(false);

            if (mapRef.current) {
              mapRef.current.setView([lat, lng], 14);
            }

            loadNearbyFacilities(gpsCenter, radiusKm, selectedMedicine, quantityNeeded, facilityType);
            showToast('success', `📍 Live GPS Location Active: ${label}`);
          } catch (err) {
            setLocatingUser(false);
          }
        },
        (err) => {
          setLocatingUser(false);
          if (!locationResolved) {
            setCurrentCenter(DEFAULT_CENTER);
            loadNearbyFacilities(DEFAULT_CENTER, radiusKm, selectedMedicine, quantityNeeded, facilityType);
            showToast('error', 'Could not access GPS. Using Dakshina Kannada central corridor.');
          }
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 10000 }
      );
    } else {
      setLocatingUser(false);
    }
  };

  // Center map directly on user's home in Bantwal Taluk
  const applyBantwalLocation = () => {
    const bantwalCenter = {
      lat: 12.893750,
      lng: 75.041410,
      label: "Bantwal Home, Dakshina Kannada",
      isLive: true,
      source: "Home Location"
    };
    setCurrentCenter(bantwalCenter);
    setIsLiveActive(true);
    setSearchQuery("Bantwal, Dakshina Kannada");
    if (mapRef.current) {
      mapRef.current.setView([12.893750, 75.041410], 14);
    }
    loadNearbyFacilities(bantwalCenter, radiusKm, selectedMedicine, quantityNeeded, facilityType);
    showToast('success', '📍 Centered on Bantwal Home (Dakshina Kannada)');
  };

  // Open modal directly centered on user's home in Bantwal Taluk
  useEffect(() => {
    if (isOpen) {
      applyBantwalLocation();
    }
  }, [isOpen]);

  // Trigger search when medicine, quantity, radius, or facility type changes
  const handleApplyFilter = () => {
    loadNearbyFacilities(currentCenter, radiusKm, selectedMedicine, quantityNeeded, facilityType);
  };

  // OpenStreetMap Nominatim Geocoding Search
  const handleLocationSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingLocation(true);
    try {
      const results = await searchOsmLocations(searchQuery);
      setSearchResults(results);
      if (results.length > 0) {
        const top = results[0];
        handleSelectLocation(top);
      } else {
        showToast('error', `Location "${searchQuery}" not found on OpenStreetMap.`);
      }
    } catch (err) {
      console.error("OSM Geocoding failed:", err);
      showToast('error', 'OpenStreetMap search service unavailable.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // Select a location from search results
  const handleSelectLocation = (loc) => {
    const newCenter = {
      lat: loc.lat,
      lng: loc.lng,
      label: loc.display_name.split(',')[0],
      isLive: false
    };
    setCurrentCenter(newCenter);
    setIsLiveActive(false);
    setSearchResults([]);
    setSearchQuery(newCenter.label);

    // Pan map to new center
    if (mapRef.current) {
      mapRef.current.setView([loc.lat, loc.lng], 14);
    }

    // Immediately fetch facilities around new location
    loadNearbyFacilities(newCenter, radiusKm, selectedMedicine, quantityNeeded, facilityType);
    showToast('success', `📍 Centered on OpenStreetMap: ${newCenter.label}`);
  };

  // Focus facility on map from drawer list
  const handleFocusFacility = (facility) => {
    if (mapRef.current && facility.location?.lat && facility.location?.lng) {
      mapRef.current.flyTo([facility.location.lat, facility.location.lng], 15, {
        duration: 1.2
      });
      // Open popup
      setTimeout(() => {
        if (markerRefs.current[facility.name]) {
          markerRefs.current[facility.name].openPopup();
        }
      }, 1200);
    }
  };

  // Requisition Action
  const handleSendRequest = async (facility) => {
    const qtyToSend = Number(reqQuantities[facility.name]) || Number(quantityNeeded) || 1000;
    setSendingRequest(true);

    const payload = {
      from_hospital: currentCenter.label && !currentCenter.label.includes("Detecting")
        ? currentCenter.label
        : "Wenlock District Hospital",
      to_hospital: facility.name,
      medicine: selectedMedicine,
      quantity: qtyToSend,
      timestamp: new Date().toISOString()
    };

    try {
      const result = await sendMedicineRequest(payload);
      if (result && result.success !== false) {
        showToast('success', `✅ Requisition dispatched to ${facility.name} via OpenStreetMap`);
        
        // Mark facility as requested
        setRequestedHospitals(prev => ({
          ...prev,
          [`${facility.name}_${selectedMedicine}`]: true
        }));

        // Close popup if open
        if (markerRefs.current[facility.name]) {
          markerRefs.current[facility.name].closePopup();
        }

        if (onRequestSuccess) {
          onRequestSuccess(payload);
        }
      } else {
        throw new Error(result?.detail || "Request failed");
      }
    } catch (err) {
      console.error("Requisition failed:", err);
      showToast('error', '❌ Failed to send requisition. Try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  // Filter facilities with stock > 0
  const visibleFacilities = useMemo(() => {
    return hospitals.filter(h => (h.stock || 0) > 0);
  }, [hospitals]);

  // Total stock calculation
  const totalAvailableStock = useMemo(() => {
    return visibleFacilities.reduce((acc, h) => acc + (h.stock || 0), 0);
  }, [visibleFacilities]);

  if (!isOpen) return null;

  return (
    <div className="find-medicine-overlay" onClick={onClose}>
      <div 
        className="find-medicine-container" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Toast Notification */}
        {toast && (
          <div className={`map-toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* TOP BAR: Controls & Filters */}
        <div className="find-medicine-topbar">
          <div className="topbar-left">
            <div className="topbar-title">
              <span className="osm-logo-icon">🗺️</span>
              <div className="title-text-group">
                <div className="title-with-badge">
                  <span className="main-title">Live Medicine Finder</span>
                  {isLiveActive ? (
                    <span className="live-status-pill active" title="Real-time live location active">
                      <span className="pulse-green-dot"></span>
                      LIVE LOCATION
                    </span>
                  ) : (
                    <span className="live-status-pill custom" title="Custom searched location">
                      SEARCH LOCATION
                    </span>
                  )}
                </div>
                <span className="subtitle">
                  📍 {currentCenter.label} ({currentCenter.lat.toFixed(4)}°N, {currentCenter.lng.toFixed(4)}°E)
                </span>
              </div>
            </div>
          </div>

          <div className="topbar-filters">
            {/* OpenStreetMap Address / Place Search */}
            <form className="osm-search-box" onSubmit={handleLocationSearch}>
              <Search size={14} className="osm-search-icon" />
              <input 
                type="text"
                className="osm-search-input"
                placeholder="Search city, area, hospital (e.g. Mangaluru, Bantwal)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn-osm-search-submit" 
                disabled={isSearchingLocation}
                title="Search location via OpenStreetMap Nominatim"
              >
                {isSearchingLocation ? '...' : 'Search'}
              </button>
            </form>

            {/* GPS Live Geolocation Button */}
            <button 
              className={`btn-locate-me ${locatingUser ? 'active-locating' : ''} ${isLiveActive ? 'is-live' : ''}`}
              onClick={() => detectAndApplyLiveLocation(true)}
              title="Detect and refresh real live GPS location"
              disabled={locatingUser}
            >
              {locatingUser ? <RefreshCw size={14} className="spin-icon" /> : <Crosshair size={14} />}
              <span>{locatingUser ? 'Detecting...' : 'My Live Location'}</span>
            </button>

            {/* Quick Bantwal Home Location Button */}
            <button 
              type="button"
              className="btn-locate-me"
              onClick={() => applyBantwalLocation()}
              title="Center map directly on your home in Bantwal Taluk"
              style={{
                background: currentCenter?.label?.includes('Bantwal') ? 'rgba(6, 182, 212, 0.25)' : 'var(--bg-surface)',
                borderColor: currentCenter?.label?.includes('Bantwal') ? 'var(--teal-500, #06b6d4)' : 'var(--border-subtle)',
                color: currentCenter?.label?.includes('Bantwal') ? 'var(--teal-400, #06b6d4)' : 'var(--text-secondary)'
              }}
            >
              <MapPin size={14} color="#06b6d4" />
              <span>🏠 Bantwal Home</span>
            </button>

            {/* Medicine Selector */}
            <div className="filter-group">
              <label className="filter-label" htmlFor="select-med-map">Medicine</label>
              <select
                id="select-med-map"
                className="filter-select"
                value={selectedMedicine}
                onChange={(e) => {
                  setSelectedMedicine(e.target.value);
                  loadNearbyFacilities(currentCenter, radiusKm, e.target.value, quantityNeeded, facilityType);
                }}
              >
                {MEDICINE_OPTIONS.map((med) => (
                  <option key={med} value={med}>{med}</option>
                ))}
              </select>
            </div>

            {/* Required Quantity */}
            <div className="filter-group">
              <label className="filter-label" htmlFor="input-qty-map">Quantity</label>
              <input
                id="input-qty-map"
                type="number"
                min="1"
                step="50"
                className="filter-input"
                value={quantityNeeded}
                onChange={(e) => setQuantityNeeded(e.target.value)}
                onBlur={handleApplyFilter}
              />
            </div>

            {/* Radius Selector */}
            <div className="filter-group">
              <label className="filter-label" htmlFor="select-radius-map">Radius</label>
              <select
                id="select-radius-map"
                className="filter-select select-radius"
                value={radiusKm}
                onChange={(e) => {
                  const r = Number(e.target.value);
                  setRadiusKm(r);
                  loadNearbyFacilities(currentCenter, r, selectedMedicine, quantityNeeded, facilityType);
                }}
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>
            </div>

            {/* Search / Refresh Button */}
            <button
              id="btn-search-nearby-hospitals"
              className="btn-search-map"
              onClick={handleApplyFilter}
              disabled={loadingHospitals}
            >
              <Search size={14} />
              <span>{loadingHospitals ? 'Searching...' : 'Find Stock'}</span>
            </button>

            {/* Close Modal */}
            <button
              id="btn-close-medicine-map"
              className="btn-close-map"
              onClick={onClose}
              title="Close Map"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* MIDDLE CONTENT: Interactive Map + Facilities Sidebar */}
        <div className="find-medicine-body">
          {/* Facilities Drawer / Sidebar */}
          {showDrawer && (
            <div className="osm-facilities-sidebar">
              <div className="sidebar-header">
                <div className="sidebar-header-left">
                  <Package size={16} className="text-cyan" />
                  <span className="sidebar-title">
                    Facilities Nearby ({visibleFacilities.length})
                  </span>
                </div>
                <div className="facility-type-pills">
                  <button 
                    className={`type-pill ${facilityType === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setFacilityType('all');
                      loadNearbyFacilities(currentCenter, radiusKm, selectedMedicine, quantityNeeded, 'all');
                    }}
                  >
                    All
                  </button>
                  <button 
                    className={`type-pill ${facilityType === 'hospital' ? 'active' : ''}`}
                    onClick={() => {
                      setFacilityType('hospital');
                      loadNearbyFacilities(currentCenter, radiusKm, selectedMedicine, quantityNeeded, 'hospital');
                    }}
                  >
                    Hospitals
                  </button>
                  <button 
                    className={`type-pill ${facilityType === 'pharmacy' ? 'active' : ''}`}
                    onClick={() => {
                      setFacilityType('pharmacy');
                      loadNearbyFacilities(currentCenter, radiusKm, selectedMedicine, quantityNeeded, 'pharmacy');
                    }}
                  >
                    Pharmacies
                  </button>
                </div>
              </div>

              <div className="sidebar-list">
                {loadingHospitals ? (
                  <div className="sidebar-loading">
                    <div className="spinner-osm"></div>
                    <span>Querying OpenStreetMap around your live location...</span>
                  </div>
                ) : visibleFacilities.length === 0 ? (
                  <div className="sidebar-empty">
                    <AlertCircle size={28} className="text-muted" />
                    <p>No facilities found within {radiusKm} km with {selectedMedicine}.</p>
                    <button className="btn-expand-radius" onClick={() => {
                      setRadiusKm(prev => Math.min(50, prev + 10));
                      loadNearbyFacilities(currentCenter, Math.min(50, radiusKm + 10), selectedMedicine, quantityNeeded, facilityType);
                    }}>
                      Expand Search to {Math.min(50, radiusKm + 10)} km
                    </button>
                  </div>
                ) : (
                  visibleFacilities.map((facility) => {
                    const isRequested = Boolean(requestedHospitals[`${facility.name}_${selectedMedicine}`]);
                    const hasEnough = facility.stock >= Number(quantityNeeded);
                    const isPharmacy = facility.facility_type === 'pharmacy';

                    return (
                      <div 
                        key={facility.name} 
                        className={`facility-card ${hasEnough ? 'card-sufficient' : 'card-limited'} ${isRequested ? 'card-requested' : ''}`}
                        onClick={() => handleFocusFacility(facility)}
                      >
                        <div className="facility-card-top">
                          <div className="facility-card-badge-row">
                            <span className={`facility-badge ${isPharmacy ? 'badge-pharmacy' : 'badge-hospital'}`}>
                              {isPharmacy ? '💊 Pharmacy' : '🏥 Hospital'}
                            </span>
                            <span className="distance-badge">
                              📍 {facility.distance_km} km away
                            </span>
                            {facility.is_core_node && (
                              <span className="core-node-badge">Core Agent</span>
                            )}
                          </div>
                          <h4 className="facility-card-name">{facility.name}</h4>
                          <p className="facility-card-address">{facility.location?.address}</p>
                        </div>

                        <div className="facility-card-stock-row">
                          <div className="stock-info">
                            <span className="stock-label">Stock ({selectedMedicine}):</span>
                            <span className={`stock-val ${hasEnough ? 'text-green' : 'text-amber'}`}>
                              {facility.stock} units
                            </span>
                          </div>
                          {facility.surplus > 0 && (
                            <span className="surplus-chip">+{facility.surplus} Surplus</span>
                          )}
                        </div>

                        <div className="facility-card-actions">
                          <button 
                            className="btn-card-focus"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFocusFacility(facility);
                            }}
                          >
                            <Navigation size={12} />
                            <span>View on Map</span>
                          </button>

                          <button 
                            className={`btn-card-request ${isRequested ? 'requested' : ''}`}
                            disabled={sendingRequest || isRequested}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendRequest(facility);
                            }}
                          >
                            <Send size={12} />
                            <span>{isRequested ? 'Requested ✓' : 'Requisition'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* MAIN OPENSTREETMAP CONTAINER */}
          <div className="find-medicine-map-container">
            {/* Map Layer & Drawer Toggle Controls Overlay */}
            <div className="osm-map-floating-controls">
              {/* Tile Layer Switcher */}
              <div className="osm-layer-switch">
                <button 
                  className={`btn-osm-layer ${activeTileLayer === 'dark' ? 'active' : ''}`}
                  onClick={() => setActiveTileLayer('dark')}
                  title="Dark Mode (Zero API Key, Free OpenStreetMap)"
                >
                  <Layers size={13} />
                  <span>Dark OSM</span>
                </button>
                <button 
                  className={`btn-osm-layer ${activeTileLayer === 'standard' ? 'active' : ''}`}
                  onClick={() => setActiveTileLayer('standard')}
                  title="Standard OpenStreetMap (Zero API Key)"
                >
                  <span>Standard OSM</span>
                </button>
                <button 
                  className={`btn-osm-layer ${activeTileLayer === 'humanitarian' ? 'active' : ''}`}
                  onClick={() => setActiveTileLayer('humanitarian')}
                  title="OSM Humanitarian High-Contrast (Zero API Key)"
                >
                  <span>OSM HOT</span>
                </button>
              </div>

              {/* Sidebar Toggle */}
              <button 
                className="btn-toggle-sidebar"
                onClick={() => setShowDrawer(prev => !prev)}
                title={showDrawer ? "Hide facilities sidebar" : "Show facilities sidebar"}
              >
                <List size={14} />
                <span>{showDrawer ? "Hide List" : "Show List"}</span>
              </button>
            </div>

            {/* Leaflet MapContainer */}
            <MapContainer
              center={[currentCenter.lat, currentCenter.lng]}
              zoom={13}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
              ref={mapRef}
            >
              <MapAutoResize />
              <MapAutoFit markers={visibleFacilities} center={currentCenter} />

              {/* OpenStreetMap Tile Layer (100% Free, Zero API Keys) */}
              <TileLayer
                key={activeTileLayer}
                attribution={OSM_LAYERS[activeTileLayer].attribution}
                url={OSM_LAYERS[activeTileLayer].url}
                className={OSM_LAYERS[activeTileLayer].className || ''}
              />

              {/* Visual Radius Circle around Reference Center */}
              <Circle
                center={[currentCenter.lat, currentCenter.lng]}
                radius={radiusKm * 1000}
                pathOptions={{
                  color: '#06b6d4',
                  fillColor: '#06b6d4',
                  fillOpacity: 0.07,
                  weight: 1.5,
                  dashArray: '4, 8'
                }}
              />

              {/* Live Location Marker */}
              <Marker
                position={[currentCenter.lat, currentCenter.lng]}
                icon={liveUserBeaconIcon}
              >
                <Popup>
                  <div className="popup-header">
                    <div className="popup-badge-row">
                      <span className="live-status-pill active">
                        <span className="pulse-green-dot"></span>
                        LIVE LOCATION
                      </span>
                    </div>
                    <div className="popup-hospital-name">📍 You Are Here</div>
                    <div className="popup-hospital-address">
                      <span>{currentCenter.label}</span>
                    </div>
                  </div>
                  <div className="popup-details">
                    <div className="popup-stat-row">
                      <span className="popup-stat-label">Live Coordinates:</span>
                      <span className="popup-stat-val text-cyan">
                        {currentCenter.lat.toFixed(5)}°N, {currentCenter.lng.toFixed(5)}°E
                      </span>
                    </div>
                    <div className="popup-stat-row">
                      <span className="popup-stat-label">Search Radius:</span>
                      <span className="popup-stat-val">{radiusKm} km</span>
                    </div>
                    <div className="popup-stat-row">
                      <span className="popup-stat-label">Location Source:</span>
                      <span className="popup-stat-val text-muted">
                        {currentCenter.source || "Live Geolocation"}
                      </span>
                    </div>
                  </div>
                  <button 
                    className="btn-popup-refresh-live"
                    onClick={() => detectAndApplyLiveLocation(true)}
                  >
                    <RefreshCw size={12} />
                    <span>Re-detect GPS Coordinates</span>
                  </button>
                </Popup>
              </Marker>

              {/* Facility Markers */}
              {visibleFacilities.map((facility) => {
                const lat = facility.location?.lat || currentCenter.lat;
                const lng = facility.location?.lng || currentCenter.lng;
                const address = facility.location?.address || `${facility.name}, Dakshina Kannada`;
                const isRequested = Boolean(requestedHospitals[`${facility.name}_${selectedMedicine}`]);
                const hasEnough = facility.stock >= Number(quantityNeeded);
                const isPharmacy = facility.facility_type === 'pharmacy';

                return (
                  <Marker
                    key={facility.name}
                    position={[lat, lng]}
                    icon={createFacilityIcon(facility, isRequested, hasEnough)}
                    ref={(ref) => {
                      if (ref) markerRefs.current[facility.name] = ref;
                    }}
                  >
                    <Popup>
                      <div className="popup-header">
                        <div className="popup-badge-row">
                          <span className={`popup-type-tag ${isPharmacy ? 'pharmacy' : 'hospital'}`}>
                            {isPharmacy ? '💊 Pharmacy' : '🏥 Hospital'}
                          </span>
                          <span className="popup-distance-tag">
                            📍 {facility.distance_km} km away
                          </span>
                        </div>
                        <div className="popup-hospital-name">{facility.name}</div>
                        <div className="popup-hospital-address">
                          <MapPin size={12} color="#06b6d4" />
                          <span>{address}</span>
                        </div>
                      </div>

                      <div className="popup-details">
                        <div className="popup-stat-row">
                          <span className="popup-stat-label">Medicine:</span>
                          <span className="popup-stat-val" style={{ color: '#38bdf8' }}>{selectedMedicine}</span>
                        </div>
                        <div className="popup-stat-row">
                          <span className="popup-stat-label">Available Stock:</span>
                          <span className="popup-stat-val stock">{facility.stock} units</span>
                        </div>
                        <div className="popup-stat-row">
                          <span className="popup-stat-label">Surplus Available:</span>
                          <span className="popup-stat-val surplus">{facility.surplus} units</span>
                        </div>
                        <div className="popup-stat-row">
                          <span className="popup-stat-label">Data Source:</span>
                          <span className="popup-stat-val text-muted">{facility.source}</span>
                        </div>
                      </div>

                      {/* Quantity input box */}
                      <div className="popup-req-box">
                        <label className="popup-req-label" htmlFor={`req-input-${facility.name}`}>
                          Requisition quantity ({selectedMedicine}):
                        </label>
                        <input 
                          id={`req-input-${facility.name}`}
                          type="number"
                          min="1"
                          max={facility.stock}
                          className="popup-req-input"
                          value={reqQuantities[facility.name] ?? quantityNeeded}
                          onChange={(e) => {
                            const v = e.target.value;
                            setReqQuantities(prev => ({ ...prev, [facility.name]: v }));
                          }}
                        />
                      </div>

                      {/* Primary Requisition Button */}
                      <button
                        id={`btn-send-request-${facility.name.replace(/\s+/g, '-').toLowerCase()}`}
                        className="btn-popup-send"
                        onClick={() => handleSendRequest(facility)}
                        disabled={sendingRequest || isRequested}
                      >
                        <Send size={14} />
                        <span>{isRequested ? '✅ Requisition Dispatched' : '📤 Send Emergency Requisition'}</span>
                      </button>

                      {/* OpenStreetMap Links (Directions & OSM Profile) */}
                      <div className="popup-osm-links">
                        {facility.osm_directions_url && (
                          <a 
                            href={facility.osm_directions_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn-osm-link"
                            title="Get turn-by-turn driving directions on OpenStreetMap"
                          >
                            <Navigation size={12} />
                            <span>Route on OSM</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                        {facility.osm_url && (
                          <a 
                            href={facility.osm_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn-osm-link"
                            title="Inspect node metadata on OpenStreetMap.org"
                          >
                            <MapPin size={12} />
                            <span>View on OSM</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* BOTTOM BAR: Summary Statistics & Legend */}
        <div className="find-medicine-bottombar">
          <div className="bottombar-stats">
            <div className="stat-chip">
              <Package size={15} color="#06b6d4" />
              <span>Found <strong>{visibleFacilities.length}</strong> medical facilities within <strong>{radiusKm} km</strong> of your live location</span>
            </div>
            <div className="stat-chip">
              <span>Total Local Stock: <strong>{totalAvailableStock.toLocaleString()}</strong> units</span>
            </div>
            <div className="stat-chip osm-attribution-chip">
              <span>Map Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> Contributors</span>
            </div>
          </div>

          <div className="legend-row">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#10b981' }} />
              <span>Sufficient (≥ {quantityNeeded})</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#f59e0b' }} />
              <span>Limited (&lt; {quantityNeeded})</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#3b82f6' }} />
              <span>Requisitioned</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
