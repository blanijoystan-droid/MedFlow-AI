/**
 * API Service for Engine 1: Demand Forecast Engine 📈
 */

const getApiUrl = (endpoint) => {
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return endpoint;
  }
  return endpoint;
};

export async function fetchDemandForecast(
  hospital = "City General Hospital", 
  medicine = "Paracetamol", 
  horizon = 14, 
  season = null
) {
  let url = `/api/forecast?hospital=${encodeURIComponent(hospital)}&medicine=${encodeURIComponent(medicine)}&horizon=${horizon}`;
  if (season) {
    url += `&season=${encodeURIComponent(season)}`;
  }

  try {
    const res = await fetch(getApiUrl(url));
    if (!res.ok) throw new Error("Failed to fetch demand forecast");
    return await res.json();
  } catch (error) {
    const fallbackRes = await fetch(`http://localhost:8000${url}`);
    return await fallbackRes.json();
  }
}

export async function fetchForecastAlerts(horizon = 14) {
  const url = `/api/forecast/alerts?horizon=${horizon}`;
  try {
    const res = await fetch(getApiUrl(url));
    if (!res.ok) throw new Error("Failed to fetch forecast alerts");
    return await res.json();
  } catch (error) {
    const fallbackRes = await fetch(`http://localhost:8000${url}`);
    return await fallbackRes.json();
  }
}

export async function fetchSeasonalProfiles() {
  const url = '/api/forecast/seasons';
  try {
    const res = await fetch(getApiUrl(url));
    if (!res.ok) throw new Error("Failed to fetch seasonal profiles");
    return await res.json();
  } catch (error) {
    const fallbackRes = await fetch(`http://localhost:8000${url}`);
    return await fallbackRes.json();
  }
}
