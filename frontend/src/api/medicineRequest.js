/**
 * API Service for Inter-Hospital Medicine Requisitions & Map Queries.
 */

const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const getApiUrl = (endpoint) => {
  return endpoint;
};

export async function sendMedicineRequest(payload) {
  try {
    const res = await fetch(getApiUrl('/api/request-medicine'), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to send medicine request");
    }

    return await res.json();
  } catch (error) {
    if (isDev) {
      try {
        const resFallback = await fetch("http://localhost:8000/api/request-medicine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        return await resFallback.json();
      } catch (e) {
        throw error;
      }
    }
    throw error;
  }
}

export async function fetchNearbyHospitals(
  medicine = "Paracetamol",
  minQuantity = 0,
  lat = 12.3082,
  lng = 76.6432,
  radiusKm = 15,
  facilityType = "all"
) {
  const query = `?medicine=${encodeURIComponent(medicine)}&min_quantity=${minQuantity}&lat=${lat}&lng=${lng}&radius_km=${radiusKm}&facility_type=${facilityType}`;
  try {
    const res = await fetch(getApiUrl(`/api/nearby-hospitals${query}`));
    if (!res.ok) {
      throw new Error("Failed to fetch nearby hospitals");
    }
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000/api/nearby-hospitals${query}`);
      return await fallbackRes.json();
    }
    throw error;
  }
}

export async function searchOsmLocations(query) {
  if (!query || !query.trim()) return [];
  const qStr = encodeURIComponent(query.trim());
  try {
    const res = await fetch(getApiUrl(`/api/osm-geocode?q=${qStr}`));
    if (!res.ok) throw new Error("Geocode search failed");
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    if (isDev) {
      try {
        const fallbackRes = await fetch(`http://localhost:8000/api/osm-geocode?q=${qStr}`);
        const data = await fallbackRes.json();
        return data.results || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }
}

export async function getExactBrowserCoordinates() {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser.");
  }

  // Tier 1: Try high accuracy (GPS/WiFi triangulation) with 15s timeout and 0 cache age
  const tryPosition = (enableHighAccuracy, timeoutMs) => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        {
          enableHighAccuracy,
          timeout: timeoutMs,
          maximumAge: 0
        }
      );
    });
  };

  try {
    const pos = await tryPosition(true, 15000);
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      source: 'Device GPS (High Accuracy)'
    };
  } catch (errHigh) {
    console.warn("High accuracy geolocation timed out or failed, falling back to standard accuracy:", errHigh);
    try {
      const pos = await tryPosition(false, 10000);
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        source: 'Browser Geolocation (Standard)'
      };
    } catch (errStandard) {
      throw errStandard;
    }
  }
}

export async function detectLiveLocation() {
  try {
    const res = await fetch(getApiUrl('/api/detect-location'));
    if (!res.ok) throw new Error("Failed to detect live location");
    return await res.json();
  } catch (error) {
    if (isDev) {
      try {
        const fallbackRes = await fetch('http://localhost:8000/api/detect-location');
        return await fallbackRes.json();
      } catch (e) { }
    }
    return { success: false, lat: 12.9187, lng: 74.8598, city: "Mangaluru" };
  }
}

export async function reverseGeocodeOsm(lat, lng) {
  try {
    const res = await fetch(getApiUrl(`/api/osm-reverse-geocode?lat=${lat}&lng=${lng}`));
    if (!res.ok) throw new Error("Reverse geocode failed");
    return await res.json();
  } catch (error) {
    if (isDev) {
      try {
        const fallbackRes = await fetch(`http://localhost:8000/api/osm-reverse-geocode?lat=${lat}&lng=${lng}`);
        return await fallbackRes.json();
      } catch (e) { }
    }
    return { 
      short_name: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      display_name: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      locality: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`
    };
  }
}

export async function fetchMedicineRequests() {
  try {
    const res = await fetch(getApiUrl('/api/medicine-requests'));
    if (!res.ok) throw new Error("Failed to fetch medicine requests");
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch('http://localhost:8000/api/medicine-requests');
      return await fallbackRes.json();
    }
    throw error;
  }
}

export async function updateMedicineRequestStatus(requestId, status) {
  try {
    const res = await fetch(getApiUrl(`/api/medicine-requests/${requestId}/status`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000/api/medicine-requests/${requestId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      return await fallbackRes.json();
    }
    throw error;
  }
}
