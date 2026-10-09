import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, Truck, ShieldCheck, CheckCircle2, AlertTriangle, 
  MapPin, Clock, Package, RefreshCw, X, Zap, Check, AlertCircle, ThermometerSnowflake
} from 'lucide-react';
import { 
  fetchRedistributionRecommendation, 
  fetchNetworkOpportunities, 
  executeRedistribution, 
  fetchNetworkLogistics 
} from '../api/redistributionApi';
import './RedistributionModal.css';

const HOSPITALS = [
  "Rural Primary Health Centre",
  "City General Hospital",
  "District Government Hospital"
];

const MEDICINES = [
  "Amoxicillin",
  "Insulin",
  "Paracetamol",
  "Ibuprofen",
  "ORS",
  "Ciprofloxacin",
  "Metformin",
  "Omeprazole"
];

export default function RedistributionModal({
  isOpen,
  onClose,
  initialRecipient = "Rural Primary Health Centre",
  initialMedicine = "Amoxicillin",
  onTransferExecuted
}) {
  const [recipient, setRecipient] = useState(initialRecipient);
  const [medicine, setMedicine] = useState(initialMedicine);
  const [requestedUnits, setRequestedUnits] = useState("");
  const [activeTab, setActiveTab] = useState("OPTIMIZER"); // OPTIMIZER or OPPORTUNITIES
  
  const [recommendation, setRecommendation] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  useEffect(() => {
    if (initialRecipient) setRecipient(initialRecipient);
    if (initialMedicine) setMedicine(initialMedicine);
  }, [initialRecipient, initialMedicine]);

  const loadData = async () => {
    setLoading(true);
    setExecutionResult(null);
    try {
      const units = requestedUnits ? parseInt(requestedUnits, 10) : null;
      const rec = await fetchRedistributionRecommendation(recipient, medicine, units);
      setRecommendation(rec);

      const opps = await fetchNetworkOpportunities();
      setOpportunities(opps?.opportunities || []);
    } catch (err) {
      console.error("Failed to load redistribution data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, recipient, medicine]);

  const handleExecute = async (donor, targetRecipient, targetMed, units) => {
    if (!window.confirm(`Confirm inter-hospital transfer of ${units} units of ${targetMed} from ${donor} to ${targetRecipient}?`)) {
      return;
    }
    setExecuting(true);
    setExecutionResult(null);
    try {
      const result = await executeRedistribution(donor, targetRecipient, targetMed, units);
      setExecutionResult(result);
      // Refresh current recommendation and network state
      await loadData();
      if (onTransferExecuted) {
        onTransferExecuted(result);
      }
    } catch (err) {
      alert(`Transfer failed: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  // Safe early return placed strictly after all state and effects (Prevents React Hook Error #310)
  if (!isOpen) return null;

  const bestMatch = recommendation?.best_match;
  const candidates = recommendation?.candidates || [];

  return (
    <div className="redist-overlay" onClick={onClose}>
      <div className="redist-container" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="redist-header">
          <div className="redist-header-title">
            <div className="redist-icon-badge">
              <Truck size={24} className="text-emerald-400" />
            </div>
            <div>
              <div className="redist-title-row">
                <h2>Engine 4 — Redistribution Optimizer 🔄</h2>
                <span className="redist-tag">Multi-Criteria Optimization</span>
              </div>
              <p className="redist-subtitle">
                Autonomous surplus-to-deficit matching balancing safety stock, road transit, FEFO expiry & clinical criticality.
              </p>
            </div>
          </div>
          <button className="redist-close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* TABS */}
        <div className="redist-tabs">
          <button 
            className={`redist-tab-btn ${activeTab === 'OPTIMIZER' ? 'active' : ''}`}
            onClick={() => setActiveTab('OPTIMIZER')}
          >
            <Zap size={16} /> Targeted Hospital Match
          </button>
          <button 
            className={`redist-tab-btn ${activeTab === 'OPPORTUNITIES' ? 'active' : ''}`}
            onClick={() => setActiveTab('OPPORTUNITIES')}
          >
            <Truck size={16} /> Network-Wide Opportunities ({opportunities.length})
          </button>
        </div>

        {/* EXECUTION SUCCESS BANNER */}
        {executionResult && (
          <div className="redist-success-banner">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <div className="flex-1">
              <strong>Transfer Executed Successfully:</strong> {executionResult.message}
              <div className="redist-trade-id">Reference ID: {executionResult.trade_record?.id}</div>
            </div>
            <button className="redist-dismiss-btn" onClick={() => setExecutionResult(null)}>Dismiss</button>
          </div>
        )}

        {/* TAB 1: TARGETED OPTIMIZER */}
        {activeTab === 'OPTIMIZER' && (
          <div className="redist-tab-content">
            {/* CONTROLS */}
            <div className="redist-controls-panel">
              <div className="redist-control-group">
                <label>Recipient Facility (In Deficit):</label>
                <select 
                  value={recipient} 
                  onChange={(e) => setRecipient(e.target.value)}
                  className="redist-select"
                >
                  {HOSPITALS.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="redist-control-group">
                <label>Medicine Needed:</label>
                <select 
                  value={medicine} 
                  onChange={(e) => setMedicine(e.target.value)}
                  className="redist-select"
                >
                  {MEDICINES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="redist-control-group">
                <label>Requested Quantity (Units):</label>
                <input 
                  type="number"
                  placeholder="Auto-detect deficit"
                  value={requestedUnits}
                  onChange={(e) => setRequestedUnits(e.target.value)}
                  className="redist-input"
                  min="1"
                />
              </div>

              <button 
                className="redist-refresh-btn"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                {loading ? "Optimizing..." : "Re-Calculate"}
              </button>
            </div>

            {/* MAIN OPTIMAL RECOMMENDATION CARD */}
            {recommendation && recommendation.success && bestMatch ? (
              <div className="redist-recommendation-card">
                <div className="redist-rec-header">
                  <div className="redist-rec-badge">
                    <CheckCircle2 size={16} /> RECOMMENDED OPTIMAL MATCH
                  </div>
                  <div className="redist-rec-score">
                    Match Score: <strong>{bestMatch.match_score} / 100</strong>
                  </div>
                </div>

                {/* THE CORE REQUESTED OUTPUT BANNER */}
                <div className="redist-output-hero">
                  <div className="redist-hero-transfer">
                    <span className="redist-hero-donor">{bestMatch.donor_hospital}</span>
                    <ArrowRight size={28} className="redist-hero-arrow" />
                    <span className="redist-hero-recipient">{bestMatch.recipient_hospital}</span>
                  </div>
                  <div className="redist-hero-qty">
                    <span className="redist-hero-divider">|</span>
                    <span className="redist-hero-units">{bestMatch.transfer_units.toLocaleString()} units</span>
                  </div>
                </div>

                <div className="redist-rec-rationale">
                  {recommendation.rationale}
                </div>

                {/* CRITERIA METRICS GRID */}
                <div className="redist-metrics-grid">
                  <div className="redist-metric-card">
                    <div className="redist-metric-label">
                      <ShieldCheck size={16} className="text-emerald-400" /> Donor Safety Reserve
                    </div>
                    <div className="redist-metric-value text-emerald-300">
                      Safe ({bestMatch.donor_residual_stock} units remain)
                    </div>
                    <div className="redist-metric-sub">
                      Mandatory safety buffer: {bestMatch.donor_mandatory_reserve} units (Preserved)
                    </div>
                  </div>

                  <div className="redist-metric-card">
                    <div className="redist-metric-label">
                      <Truck size={16} className="text-cyan-400" /> Transit Logistics
                    </div>
                    <div className="redist-metric-value text-cyan-300">
                      {bestMatch.transit_minutes} mins ({bestMatch.distance_km} km)
                    </div>
                    <div className="redist-metric-sub">
                      Corridor: {bestMatch.transit_corridor}
                    </div>
                  </div>

                  <div className="redist-metric-card">
                    <div className="redist-metric-label">
                      <Package size={16} className="text-purple-400" /> Expiry Waste Saved
                    </div>
                    <div className="redist-metric-value text-purple-300">
                      {bestMatch.waste_prevented_units > 0 
                        ? `${bestMatch.waste_prevented_units} units (₹${bestMatch.waste_prevented_inr})` 
                        : "Zero Expiry Risk"}
                    </div>
                    <div className="redist-metric-sub">
                      {bestMatch.has_expiring_batch ? "FEFO Expiry Batch Rescued" : "Stable batches"}
                    </div>
                  </div>

                  <div className="redist-metric-card">
                    <div className="redist-metric-label">
                      {bestMatch.cold_chain_required ? (
                        <ThermometerSnowflake size={16} className="text-blue-400" />
                      ) : (
                        <Clock size={16} className="text-amber-400" />
                      )}
                      Clinical Criticality
                    </div>
                    <div className="redist-metric-value text-amber-300">
                      {bestMatch.category}
                    </div>
                    <div className="redist-metric-sub">
                      {bestMatch.cold_chain_required ? "Cold Chain 2-8°C Insulated Transit" : "Standard Temperature Controlled"}
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <div className="redist-action-footer">
                  <div className="redist-action-note">
                    Engine verified: Transfer causes <strong>zero stockout risk</strong> for {bestMatch.donor_hospital}.
                  </div>
                  <button 
                    className="redist-execute-btn"
                    onClick={() => handleExecute(bestMatch.donor_hospital, bestMatch.recipient_hospital, medicine, bestMatch.transfer_units)}
                    disabled={executing}
                  >
                    <Zap size={18} />
                    {executing ? "Dispatching Transfer..." : `Execute Transfer (${bestMatch.transfer_units} units)`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="redist-no-match-card">
                <AlertCircle size={32} className="text-amber-400 mb-2" />
                <h3>No Safe Donor Hospital Available</h3>
                <p>{recommendation?.message || "No neighboring facilities possess safe surplus above their critical safety buffer."}</p>
                <div className="text-xs text-slate-400 mt-2">
                  MedFlow-AI safeguards against inducing shortages in donor facilities. Direct pharmaceutical distributor re-order is advised.
                </div>
              </div>
            )}

            {/* CANDIDATES COMPARISON TABLE */}
            {candidates.length > 0 && (
              <div className="redist-candidates-section">
                <h4>All Evaluated Facilities in Mysuru Corridor</h4>
                <div className="redist-table-wrapper">
                  <table className="redist-table">
                    <thead>
                      <tr>
                        <th>Donor Facility</th>
                        <th>Current Stock</th>
                        <th>Mandatory Reserve</th>
                        <th>Safe Transfer</th>
                        <th>Transit Time</th>
                        <th>Expiry Rescued</th>
                        <th>Match Score</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((cand, idx) => (
                        <tr key={idx} className={idx === 0 ? "highlight-row" : ""}>
                          <td>
                            <strong>{cand.donor_hospital}</strong>
                            {idx === 0 && <span className="badge-best">Rank #1</span>}
                          </td>
                          <td>{cand.donor_current_stock} units</td>
                          <td>{cand.donor_mandatory_reserve} units</td>
                          <td className="text-emerald-400 font-bold">{cand.transfer_units} units</td>
                          <td>{cand.transit_minutes} mins ({cand.distance_km} km)</td>
                          <td>{cand.waste_prevented_units > 0 ? `${cand.waste_prevented_units} units` : "0"}</td>
                          <td>
                            <div className="score-pill">{cand.match_score} / 100</div>
                          </td>
                          <td>
                            <button 
                              className="btn-transfer-row"
                              onClick={() => handleExecute(cand.donor_hospital, recipient, medicine, cand.transfer_units)}
                              disabled={executing}
                            >
                              Transfer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NETWORK-WIDE OPPORTUNITIES */}
        {activeTab === 'OPPORTUNITIES' && (
          <div className="redist-tab-content">
            <div className="redist-opps-header">
              <h3>Active Deficit-to-Surplus Redistribution Opportunities</h3>
              <p>Autonomous scan of all 3 facilities across 8 critical medicines.</p>
            </div>

            {opportunities.length === 0 ? (
              <div className="redist-empty-state">
                <CheckCircle2 size={36} className="text-emerald-400" />
                <p>No active inter-hospital deficits detected across the network.</p>
              </div>
            ) : (
              <div className="redist-opps-grid">
                {opportunities.map((opp, idx) => (
                  <div key={idx} className="redist-opp-card">
                    <div className="redist-opp-top">
                      <span className="opp-med-badge">{opp.medicine}</span>
                      <span className="opp-score-badge">Match: {opp.match_score}/100</span>
                    </div>

                    <div className="redist-opp-route">
                      <div className="opp-facility donor">{opp.donor}</div>
                      <ArrowRight size={18} className="text-emerald-400" />
                      <div className="opp-facility recipient">{opp.recipient}</div>
                    </div>

                    <div className="redist-opp-summary-line">
                      {opp.transfer_summary}
                    </div>

                    <div className="redist-opp-details">
                      <div><span>Transit:</span> {opp.transit_minutes} mins ({opp.distance_km} km)</div>
                      <div><span>Safe Units:</span> {opp.transfer_units} units</div>
                      {opp.waste_prevented_units > 0 && (
                        <div className="text-purple-300"><span>Rescued:</span> {opp.waste_prevented_units} units</div>
                      )}
                      {opp.cold_chain && (
                        <div className="text-cyan-300"><span>Cold Chain:</span> 2-8°C Required</div>
                      )}
                    </div>

                    <button 
                      className="redist-opp-btn"
                      onClick={() => handleExecute(opp.donor, opp.recipient, opp.medicine, opp.transfer_units)}
                      disabled={executing}
                    >
                      <Zap size={14} /> Execute Transfer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
