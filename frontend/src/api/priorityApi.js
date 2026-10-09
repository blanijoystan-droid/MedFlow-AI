/**
 * API Service for Engine 5: Priority Engine ⚖️
 */

export async function fetchPriorityTriage(medicine = "Insulin", units = null) {
  let url = `/api/priority/triage?medicine=${encodeURIComponent(medicine)}`;
  if (units) {
    url += `&units=${encodeURIComponent(units)}`;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch priority triage");
    return await res.json();
  } catch (error) {
    const fallbackRes = await fetch(`http://localhost:8000${url}`);
    return await fallbackRes.json();
  }
}

export async function fetchHospitalPriorityEvaluation(hospital = "City General Hospital", medicine = "Insulin") {
  const url = `/api/priority/evaluate?hospital=${encodeURIComponent(hospital)}&medicine=${encodeURIComponent(medicine)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch hospital priority evaluation");
    return await res.json();
  } catch (error) {
    const fallbackRes = await fetch(`http://localhost:8000${url}`);
    return await fallbackRes.json();
  }
}

export async function fetchNetworkPriorityOverview() {
  const url = '/api/priority/overview';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch network priority overview");
    return await res.json();
  } catch (error) {
    const fallbackRes = await fetch(`http://localhost:8000${url}`);
    return await fallbackRes.json();
  }
}
