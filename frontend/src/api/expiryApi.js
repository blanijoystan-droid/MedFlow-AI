/**
 * API Service for Engine 3: Expiry Intelligence ♻️
 */

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
    const fallbackRes = await fetch(`http://localhost:8000${url}`);
    return await fallbackRes.json();
  }
}

export async function fetchNetworkExpiryOverview() {
  const url = '/api/expiry/network';
  try {
    const res = await fetch(getApiUrl(url));
    if (!res.ok) throw new Error("Failed to fetch network expiry overview");
    return await res.json();
  } catch (error) {
    const fallbackRes = await fetch(`http://localhost:8000${url}`);
    return await fallbackRes.json();
  }
}

export async function fetchDonationCandidates() {
  const url = '/api/expiry/candidates';
  try {
    const res = await fetch(getApiUrl(url));
    if (!res.ok) throw new Error("Failed to fetch donation candidates");
    return await res.json();
  } catch (error) {
    const fallbackRes = await fetch(`http://localhost:8000${url}`);
    return await fallbackRes.json();
  }
}
