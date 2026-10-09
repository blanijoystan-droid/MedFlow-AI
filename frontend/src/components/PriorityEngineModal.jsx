import React, { useState, useEffect } from 'react';
import { 
  Scale, AlertTriangle, ShieldCheck, CheckCircle2, Clock, 
  Users, Activity, HelpCircle, X, RefreshCw, Zap, ArrowRight,
  TrendingUp, Award, Layers
} from 'lucide-react';
import { fetchPriorityTriage, fetchHospitalPriorityEvaluation, fetchNetworkPriorityOverview } from '../api/priorityApi';
import './PriorityEngineModal.css';

const MEDICINES = [
  "Insulin",
  "Amoxicillin",
  "Ciprofloxacin",
  "Paracetamol",
  "Ibuprofen",
  "ORS",
  "Metformin",
  "Omeprazole"
];

const HOSPITALS = [
  "Rural Primary Health Centre",
  "City General Hospital",
  "District Government Hospital"
];

export default function PriorityEngineModal({
  isOpen,
  onClose,
  initialMedicine = "Insulin",
  onTriggerRequisition
}) {
  const [selectedMedicine, setSelectedMedicine] = useState(initialMedicine);
  const [batchUnits, setBatchUnits] = useState(500);
  const [activeTab, setActiveTab] = useState("TRIAGE"); // TRIAGE or OVERVIEW
  
  const [triageData, setTriageData] = useState(null);
  const [networkOverview, setNetworkOverview] = useState(null);
  const [selectedFacilityDetail, setSelectedFacilityDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialMedicine) setSelectedMedicine(initialMedicine);
  }, [initialMedicine]);

  const loadData = async () => {
    setLoading(true);
    try {
      const units = batchUnits ? parseInt(batchUnits, 10) : null;
      const triage = await fetchPriorityTriage(selectedMedicine, units);
      setTriageData(triage);

      // Default facility detail to top priority
      if (triage?.ranked_hospitals && triage.ranked_hospitals.length > 0) {
        setSelectedFacilityDetail(triage.ranked_hospitals[0]);
      }

      const overview = await fetchNetworkPriorityOverview();
      setNetworkOverview(overview?.triage_overview || []);
    } catch (err) {
      console.error("Failed to load priority engine data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedMedicine, batchUnits]);

  // Safe early return placed strictly after all hooks (Prevents React Hook Error #310)
  if (!isOpen) return null;

  const topHospital = triageData?.ranked_hospitals?.[0];
  const ranked = triageData?.ranked_hospitals || [];
  const allocations = triageData?.allocations || [];

  return (
    <div className="priority-overlay" onClick={onClose}>
      <div className="priority-container" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="priority-header">
          <div className="priority-header-title">
            <div className="priority-icon-badge">
              <Scale size={24} className="text-amber-400" />
            </div>
            <div>
              <div className="priority-title-row">
                <h2>Engine 5 — Priority Engine ⚖️</h2>
                <span className="priority-tag">Clinical Triage Allocation</span>
              </div>
              <p className="priority-subtitle">
                Multi-attribute triage ranking when multiple hospitals compete for the same scarce medicine stock.
              </p>
            </div>
          </div>
          <button className="priority-close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* TABS */}
        <div className="priority-tabs">
          <button 
            className={`priority-tab-btn ${activeTab === 'TRIAGE' ? 'active' : ''}`}
            onClick={() => setActiveTab('TRIAGE')}
          >
            <Scale size={16} /> Scarce Batch Triage
          </button>
          <button 
            className={`priority-tab-btn ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
            onClick={() => setActiveTab('OVERVIEW')}
          >
            <Layers size={16} /> Network Matrix ({networkOverview?.length || 8} Medicines)
          </button>
        </div>

        {/* TAB 1: TRIAGE */}
        {activeTab === 'TRIAGE' && (
          <div className="priority-tab-content">
            {/* CONTROLS */}
            <div className="priority-controls-panel">
              <div className="priority-control-group">
                <label>Scarce Medicine:</label>
                <select 
                  value={selectedMedicine} 
                  onChange={(e) => setSelectedMedicine(e.target.value)}
                  className="priority-select"
                >
                  {MEDICINES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="priority-control-group">
                <label>Available Batch to Allocate (Units):</label>
                <input 
                  type="number"
                  value={batchUnits}
                  onChange={(e) => setBatchUnits(e.target.value)}
                  className="priority-input"
                  min="50"
                  step="50"
                />
              </div>

              <button 
                className="priority-refresh-btn"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                {loading ? "Ranking..." : "Re-Evaluate Triage"}
              </button>
            </div>

            {/* TOP PRIORITY HERO CARD */}
            {topHospital && (
              <div className="priority-hero-card">
                <div className="priority-hero-header">
                  <div className="priority-hero-badge">
                    <Award size={18} /> HIGHEST CLINICAL CLAIM
                  </div>
                  <div className="priority-tier-pill">
                    {topHospital.tier}
                  </div>
                </div>

                {/* THE CORE OUTPUT FORMAT REQUIRED */}
                <div className="priority-headline-box">
                  <div className="priority-hospital-name">
                    {topHospital.hospital}
                  </div>
                  <div className="priority-score-badge">
                    Priority <span className="score-num">{topHospital.priority_score}</span> / 100
                  </div>
                </div>

                <div className="priority-justification">
                  Clinical Triage Decision: Allocating scarce <strong>{selectedMedicine}</strong> to <strong>{topHospital.hospital}</strong> mitigates the highest imminent patient mortality and stockout vulnerability across the network.
                </div>

                {/* 5-FACTOR CRITERIA RADAR BARS */}
                <div className="priority-factors-grid">
                  
                  {/* Factor 1: Stockout Urgency */}
                  <div className="factor-card">
                    <div className="factor-header">
                      <span className="factor-label">1. Stockout Urgency</span>
                      <span className="factor-score">{topHospital.factors.stockout_urgency.score} / 25</span>
                    </div>
                    <div className="factor-bar-bg">
                      <div 
                        className="factor-bar-fill fill-red" 
                        style={{ width: `${(topHospital.factors.stockout_urgency.score / 25) * 100}%` }}
                      />
                    </div>
                    <div className="factor-sub">{topHospital.factors.stockout_urgency.details}</div>
                  </div>

                  {/* Factor 2: Clinical Criticality */}
                  <div className="factor-card">
                    <div className="factor-header">
                      <span className="factor-label">2. Clinical Criticality</span>
                      <span className="factor-score">{topHospital.factors.clinical_criticality.score} / 25</span>
                    </div>
                    <div className="factor-bar-bg">
                      <div 
                        className="factor-bar-fill fill-amber" 
                        style={{ width: `${(topHospital.factors.clinical_criticality.score / 25) * 100}%` }}
                      />
                    </div>
                    <div className="factor-sub">{topHospital.factors.clinical_criticality.details}</div>
                  </div>

                  {/* Factor 3: Patient Load */}
                  <div className="factor-card">
                    <div className="factor-header">
                      <span className="factor-label">3. Patient Load</span>
                      <span className="factor-score">{topHospital.factors.patient_load.score} / 20</span>
                    </div>
                    <div className="factor-bar-bg">
                      <div 
                        className="factor-bar-fill fill-blue" 
                        style={{ width: `${(topHospital.factors.patient_load.score / 20) * 100}%` }}
                      />
                    </div>
                    <div className="factor-sub">{topHospital.factors.patient_load.details}</div>
                  </div>

                  {/* Factor 4: Alternative Availability */}
                  <div className="factor-card">
                    <div className="factor-header">
                      <span className="factor-label">4. Alternative Availability</span>
                      <span className="factor-score">{topHospital.factors.alternative_availability.score} / 15</span>
                    </div>
                    <div className="factor-bar-bg">
                      <div 
                        className="factor-bar-fill fill-purple" 
                        style={{ width: `${(topHospital.factors.alternative_availability.score / 15) * 100}%` }}
                      />
                    </div>
                    <div className="factor-sub">{topHospital.factors.alternative_availability.details}</div>
                  </div>

                  {/* Factor 5: Operational Urgency */}
                  <div className="factor-card">
                    <div className="factor-header">
                      <span className="factor-label">5. Operational Urgency</span>
                      <span className="factor-score">{topHospital.factors.operational_urgency.score} / 15</span>
                    </div>
                    <div className="factor-bar-bg">
                      <div 
                        className="factor-bar-fill fill-cyan" 
                        style={{ width: `${(topHospital.factors.operational_urgency.score / 15) * 100}%` }}
                      />
                    </div>
                    <div className="factor-sub">{topHospital.factors.operational_urgency.details}</div>
                  </div>

                </div>
              </div>
            )}

            {/* COMPARATIVE RANKINGS & ALLOCATION TABLE */}
            <div className="priority-ranking-section">
              <div className="priority-section-title">
                <h3>Comparative Hospital Triage & Recommended Allocation</h3>
                <span className="batch-label">Total Scarce Batch: {batchUnits} units</span>
              </div>

              <div className="priority-table-wrapper">
                <table className="priority-table">
                  <thead>
                    <tr>
                      <th>Triage Rank</th>
                      <th>Healthcare Facility</th>
                      <th>Priority Score</th>
                      <th>Days of Supply</th>
                      <th>Deficit</th>
                      <th>Recommended Allocation</th>
                      <th>Satisfaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((hosp, idx) => {
                      const alloc = allocations.find(a => a.hospital === hosp.hospital);
                      return (
                        <tr key={idx} className={idx === 0 ? "top-rank-row" : ""}>
                          <td>
                            <div className="rank-badge">
                              {idx === 0 ? "🥇 Rank 1" : idx === 1 ? "🥈 Rank 2" : "🥉 Rank 3"}
                            </div>
                          </td>
                          <td>
                            <strong>{hosp.hospital}</strong>
                            <div className="tier-text">{hosp.tier}</div>
                          </td>
                          <td>
                            <div className="score-cell">
                              <strong>{hosp.priority_score}</strong> / 100
                            </div>
                          </td>
                          <td>
                            <span className={hosp.days_of_supply <= 2 ? "text-red-400 font-bold" : "text-amber-300"}>
                              {hosp.days_of_supply} days
                            </span>
                          </td>
                          <td>{hosp.deficit} units</td>
                          <td>
                            <span className="text-emerald-400 font-bold">
                              {alloc ? `${alloc.allocated_units} units` : "0 units"}
                            </span>
                          </td>
                          <td>
                            {alloc ? (
                              <div className="satisfaction-bar">
                                <div 
                                  className="satisfaction-fill" 
                                  style={{ width: `${alloc.satisfaction_pct}%` }}
                                />
                                <span>{alloc.satisfaction_pct}%</span>
                              </div>
                            ) : "0%"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NETWORK-WIDE PRIORITY MATRIX */}
        {activeTab === 'OVERVIEW' && (
          <div className="priority-tab-content">
            <div className="priority-section-title">
              <h3>Network-Wide Priority Matrix</h3>
              <p>Autonomous triage ranking for all 8 critical life-saving medications across Mysuru corridor.</p>
            </div>

            <div className="priority-matrix-grid">
              {networkOverview.map((item, idx) => (
                <div key={idx} className="matrix-med-card">
                  <div className="matrix-card-top">
                    <span className="matrix-med-name">{item.medicine}</span>
                    <span className="matrix-score-pill">Top: {item.top_score}/100</span>
                  </div>

                  <div className="matrix-headline">
                    {item.headline}
                  </div>

                  <div className="matrix-rankings-list">
                    {item.rankings.map((r, rIdx) => (
                      <div key={rIdx} className="matrix-rank-row">
                        <span className="matrix-hosp-name">{r.hospital}</span>
                        <span className="matrix-dos">{r.dos}d supply</span>
                        <span className="matrix-score font-bold">{r.score}/100</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    className="matrix-inspect-btn"
                    onClick={() => {
                      setSelectedMedicine(item.medicine);
                      setActiveTab('TRIAGE');
                    }}
                  >
                    Inspect Triage
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
