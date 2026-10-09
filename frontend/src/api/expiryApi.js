/**
 * API Service for Engine 3: Expiry Intelligence ♻️
 */

const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const getApiUrl = (endpoint) => {
  return endpoint;
};

export async function fetchMedicineExpiryAudit(hospital = "District Government Hospital", medicine = "Amoxicillin") {
  const url = `/api/expiry/audit?hospital=${encodeURIComponent(hospital)}&medicine=${encodeURIComponent(medicine)}`;
  try {
    const res = await fetch(getApiUrl(url));
    if (!res.ok) throw new Error("Failed to fetch expiry audit");
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000${url}`);
      return await fallbackRes.json();
    }
    throw error;
  }
}

export async function fetchNetworkExpiryOverview() {
  const url = '/api/expiry/network';
  try {
    const res = await fetch(getApiUrl(url));
    if (!res.ok) throw new Error("Failed to fetch network expiry overview");
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000${url}`);
      return await fallbackRes.json();
    }
    throw error;
  }
}

export async function fetchDonationCandidates() {
  const url = '/api/expiry/candidates';
  try {
    const res = await fetch(getApiUrl(url));
    if (!res.ok) throw new Error("Failed to fetch donation candidates");
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000${url}`);
      return await fallbackRes.json();
    }
    throw error;
  }
}
