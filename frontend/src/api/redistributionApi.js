/**
 * API Service for Engine 4: Redistribution Optimizer 🔄
 */

const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export async function fetchRedistributionRecommendation(recipient = "Rural Primary Health Centre", medicine = "Amoxicillin", quantity = null) {
  let url = `/api/redistribution/optimize?recipient=${encodeURIComponent(recipient)}&medicine=${encodeURIComponent(medicine)}`;
  if (quantity) {
    url += `&quantity=${encodeURIComponent(quantity)}`;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch redistribution recommendation");
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000${url}`);
      return await fallbackRes.json();
    }
    throw error;
  }
}

export async function fetchNetworkOpportunities() {
  const url = '/api/redistribution/opportunities';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch redistribution opportunities");
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000${url}`);
      return await fallbackRes.json();
    }
    throw error;
  }
}

export async function executeRedistribution(donor, recipient, medicine, units) {
  const url = '/api/redistribution/execute';
  const payload = { donor, recipient, medicine, units: parseInt(units, 10) };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to execute redistribution");
    }
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await fallbackRes.json();
    }
    throw error;
  }
}

export async function fetchNetworkLogistics() {
  const url = '/api/redistribution/network-logistics';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch network logistics");
    return await res.json();
  } catch (error) {
    if (isDev) {
      const fallbackRes = await fetch(`http://localhost:8000${url}`);
      return await fallbackRes.json();
    }
    throw error;
  }
}
