/**
 * API Service for Engine 2: Risk Engine 🚨
 */

const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const getApiUrl = (endpoint) => {
  return endpoint;
};

export async function fetchMedicineRisk(hospital = "City General Hospital", medicine = "Paracetamol", stock = null) {
  let url = `/api/risk/evaluate?hospital=${encodeURIComponent(hospital)}&medicine=${encodeURIComponent(medicine)}`;
  if (stock !== null && stock !== undefined) {
    url += `&stock=${stock}`;
  }

  try {
    const res = await fetch(getApiUrl(url));
    if (!res.ok) throw new Error("Failed to evaluate risk");
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000${url}`);
      return await fallbackRes.json();
    }
    throw error;
  }
}

export async function fetchNetworkRiskMatrix() {
  const url = '/api/risk/matrix';
  try {
    const res = await fetch(getApiUrl(url));
    if (!res.ok) throw new Error("Failed to fetch risk matrix");
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000${url}`);
      return await fallbackRes.json();
    }
    throw error;
  }
}

export async function fetchFacilityLogistics() {
  const url = '/api/risk/facilities';
  try {
    const res = await fetch(getApiUrl(url));
    if (!res.ok) throw new Error("Failed to fetch facility logistics");
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000${url}`);
      return await fallbackRes.json();
    }
    throw error;
  }
}
