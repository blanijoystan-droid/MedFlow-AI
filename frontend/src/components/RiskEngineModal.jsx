import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, AlertTriangle, CheckCircle2, Clock, Truck, 
  Pill, Building2, RefreshCw, X, Send, Activity, ArrowRight,
  TrendingDown, Layers, HelpCircle, Cpu
} from 'lucide-react';
import { fetchMedicineRisk, fetchNetworkRiskMatrix } from '../api/riskApi';
import './RiskEngineModal.css';

const HOSPITALS = [
  "City General Hospital",
  "District Government Hospital",
  "Rural Primary Health Centre"
];

const MEDICINES = [
  "Paracetamol",
  "Amoxicillin",
  "Ibuprofen",
  "Insulin",
  "ORS",
  "Ciprofloxacin",
  "Metformin",
  "Omeprazole"
];

export default function RiskEngineModal({
  isOpen,
  onClose,
  onTriggerRequisition,
  initialHospital = "City General Hospital",
  initialMedicine = "Paracetamol"
}) {
  const [selectedHospital, setSelectedHospital] = useState(initialHospital);
  const [selectedMedicine, setSelectedMedicine] = useState(initialMedicine);
  const [activeRiskTab, setActiveRiskTab] = useState("ALL"); // ALL, CRITICAL, HIGH, WATCH, STABLE
  const [riskData, setRiskData] = useState(null);
  const [networkMatrix, setNetworkMatrix] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialHospital) setSelectedHospital(initialHospital);
    if (initialMedicine) setSelectedMedicine(initialMedicine);
  }, [initialHospital, initialMedicine]);

  const loadData = async () => {
    setLoading(true);
    try {
      const single = await fetchMedicineRisk(selectedHospital, selectedMedicine);
      setRiskData(single);
      const matrix = await fetchNetworkRiskMatrix();
      setNetworkMatrix(matrix);
    } catch (err) {
      console.error("Failed to load risk engine data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedHospital, selectedMedicine]);

  // Filter network table items
  const filteredItems = (!networkMatrix || !networkMatrix.all_evaluations)
    ? []
    : (activeRiskTab === "ALL")
      ? networkMatrix.all_evaluations
      : networkMatrix.all_evaluations.filter(item => item.risk_level === activeRiskTab);

  if (!isOpen) return null;

  const summary = networkMatrix?.summary || { CRITICAL: 0, HIGH: 0, WATCH: 0, STABLE: 0, total: 0 };

  // Calculate visual gauge percentages (capped at 14 days max view)
  const maxScaleDays = 12.0;
  const dos = riskData?.days_of_supply ?? 0;
  const lt = riskData?.supplier_lead_time_days ?? 3.0;
  const buffer = riskData?.safety_buffer_days ?? 2.0;
  const dangerThresh = lt + buffer;
  const watchThresh = lt + (2.0 * buffer);

  const dosPercent = Math.min(100, Math.max(2, (dos / maxScaleDays) * 100));
  const ltPercent = Math.min(100, (lt / maxScaleDays) * 100);
  const dangerPercent = Math.min(100, (dangerThresh / maxScaleDays) * 100);
  const watchPercent = Math.min(100, (watchThresh / maxScaleDays) * 100);

  return (
    <div className="risk-overlay" onClick={onClose}>
      <div className="risk-container" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="risk-header">
          <div className="risk-header-left">
            <div className="risk-logo-icon">🚨</div>
            <div>
              <div className="risk-title-row">
                <h2 className="risk-title">Engine 2: Risk Engine</h2>
                <span className="risk-badge-core">Supply Vulnerability</span>
                <span className="risk-badge-sub">Lead Time vs Days of Supply</span>
              </div>
              <p className="risk-subtitle">
                Calculates real-time Days of Supply (DoS) and benchmarks against Supplier Lead Time + Safety Buffer to prevent healthcare outages.
              </p>
            </div>
          </div>

          <button className="btn-close-risk" onClick={onClose} title="Close Risk Engine">
            <X size={18} />
          </button>
        </div>

        {/* CONTROLS BAR */}
        <div className="risk-controls-bar">
          <div className="risk-control-group">
            <label className="control-label">Healthcare Facility</label>
            <select 
              className="control-select"
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
            >
              {HOSPITALS.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div className="risk-control-group">
            <label className="control-label">Essential Medicine</label>
            <select 
              className="control-select"
              value={selectedMedicine}
              onChange={(e) => setSelectedMedicine(e.target.value)}
            >
              {MEDICINES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <button className="btn-refresh-risk" onClick={loadData} disabled={loading} title="Re-evaluate Risk Engine">
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Re-evaluate</span>
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="risk-body">
          {loading && !riskData ? (
            <div className="risk-loading-state">
              <div className="spinner-risk"></div>
              <span>Auditing supply chain lead times and calculating Days of Supply...</span>
            </div>
          ) : riskData && (
            <>
              {/* SCIKIT-LEARN ML CLASSIFIER DIAGNOSTICS */}
              {riskData.ml_metadata && (
                <div className="risk-ml-diagnostics-bar">
                  <div className="risk-ml-model-pill">
                    <Cpu size={14} className="text-cyan" />
                    <span><strong>ML Classifier:</strong> {riskData.ml_metadata.model_type}</span>
                  </div>
                  <div className="risk-ml-metric-pill">
                    <span className="text-muted">Model Confidence:</span>
                    <strong className="text-emerald">{riskData.ml_metadata.confidence_pct}%</strong>
                  </div>
                  <div className="risk-ml-prob-pills">
                    <span className="risk-prob-tag crit">🔴 Crit: {riskData.ml_metadata.probabilities?.CRITICAL}%</span>
                    <span className="risk-prob-tag high">🟠 High: {riskData.ml_metadata.probabilities?.HIGH}%</span>
                    <span className="risk-prob-tag watch">🟡 Watch: {riskData.ml_metadata.probabilities?.WATCH}%</span>
                    <span className="risk-prob-tag stable">🟢 Stable: {riskData.ml_metadata.probabilities?.STABLE}%</span>
                  </div>
                  <div className="risk-ml-features-container">
                    <span className="risk-ml-features-label">Top Decision Features:</span>
                    <div className="risk-ml-feature-tags">
                      {riskData.ml_metadata.feature_importances?.map((f, i) => (
                        <span key={i} className="risk-ml-feature-tag">
                          {f.feature}: <strong>{f.importance_pct}%</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PRIMARY RISK ASSESSMENT CARDS */}
              <div className="risk-kpi-grid">
                
                {/* 1. DAYS OF SUPPLY */}
                <div className="risk-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Days of Supply (DoS)</span>
                    <Clock size={16} color="#06b6d4" />
                  </div>
                  <div className="kpi-val text-cyan">
                    {riskData.days_of_supply} <span className="kpi-unit">days</span>
                  </div>
                  <div className="kpi-footer">
                    <span>Stock: <strong>{riskData.current_stock} units</strong></span>
                    <span>Daily Burn: <strong>{riskData.daily_burn_rate} u/d</strong></span>
                  </div>
                </div>

                {/* 2. SUPPLIER LEAD TIME */}
                <div className="risk-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Supplier Lead Time</span>
                    <Truck size={16} color="#a855f7" />
                  </div>
                  <div className="kpi-val text-purple">
                    {riskData.supplier_lead_time_days} <span className="kpi-unit">days</span>
                  </div>
                  <div className="kpi-footer">
                    <span className="truncate" title={riskData.distributor}>
                      Via: <strong>{riskData.distributor?.split(' ')[0]} Hub</strong>
                    </span>
                  </div>
                </div>

                {/* 3. SAFETY BUFFER */}
                <div className="risk-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Required Safety Buffer</span>
                    <Layers size={16} color="#3b82f6" />
                  </div>
                  <div className="kpi-val text-blue">
                    {riskData.safety_buffer_days} <span className="kpi-unit">days</span>
                  </div>
                  <div className="kpi-footer">
                    <span>Lead + Buffer: <strong>{riskData.lead_time_plus_buffer} days</strong></span>
                  </div>
                </div>

                {/* 4. CLASSIFICATION STATUS */}
                <div 
                  className="risk-kpi-card kpi-risk-status-card"
                  style={{ borderColor: riskData.risk_color, background: riskData.risk_bg }}
                >
                  <div className="kpi-header">
                    <span className="kpi-label">Risk Classification</span>
                    <ShieldAlert size={16} style={{ color: riskData.risk_color }} />
                  </div>
                  <div className="kpi-val" style={{ color: riskData.risk_color }}>
                    {riskData.risk_badge}
                  </div>
                  <div className="kpi-footer">
                    <span>Vulnerability Index: <strong>{riskData.risk_score} / 100</strong></span>
                  </div>
                </div>
              </div>

              {/* HORIZONTAL THRESHOLD HORIZON GAUGE */}
              <div className="risk-gauge-card">
                <div className="gauge-header">
                  <div className="gauge-title-group">
                    <Activity size={16} color="#06b6d4" />
                    <h4>Supply Threshold Benchmark vs Current Inventory</h4>
                  </div>
                  <div className="gauge-legend">
                    <span className="legend-tag tag-crit">🔴 Critical (&le; {lt}d)</span>
                    <span className="legend-tag tag-high">🟠 High (&le; {dangerThresh}d)</span>
                    <span className="legend-tag tag-watch">🟡 Watch (&le; {watchThresh}d)</span>
                    <span className="legend-tag tag-stable">🟢 Stable (&gt; {watchThresh}d)</span>
                  </div>
                </div>

                {/* VISUAL RANGE BAR */}
                <div className="gauge-track-wrapper">
                  <div className="gauge-track">
                    {/* Zone 1: Critical (0 to Lead Time) */}
                    <div 
                      className="gauge-zone zone-critical" 
                      style={{ width: `${ltPercent}%` }}
                      title={`Critical Outage Zone: Stockout arrives before delivery (${lt}d)`}
                    >
                      <span>Supplier Transit ({lt}d)</span>
                    </div>

                    {/* Zone 2: High (Lead Time to Lead + Buffer) */}
                    <div 
                      className="gauge-zone zone-high" 
                      style={{ width: `${dangerPercent - ltPercent}%` }}
                      title={`Buffer Erosion Zone: Buffer breached (${dangerThresh}d)`}
                    >
                      <span>Buffer ({buffer}d)</span>
                    </div>

                    {/* Zone 3: Watch */}
                    <div 
                      className="gauge-zone zone-watch" 
                      style={{ width: `${watchPercent - dangerPercent}%` }}
                      title={`Watch Zone: Approaching reorder (${watchThresh}d)`}
                    >
                      <span>Watch</span>
                    </div>

                    {/* Zone 4: Stable */}
                    <div 
                      className="gauge-zone zone-stable" 
                      style={{ width: `${100 - watchPercent}%` }}
                      title="Safe Buffer Zone"
                    >
                      <span>Secure Buffer</span>
                    </div>
                  </div>

                  {/* ACTIVE DOS POINTER */}
                  <div 
                    className="gauge-pointer" 
                    style={{ left: `${dosPercent}%`, borderColor: riskData.risk_color }}
                  >
                    <div className="pointer-tooltip" style={{ background: riskData.risk_color }}>
                      <strong>{dos} Days</strong> (Current)
                    </div>
                    <div className="pointer-line" style={{ background: riskData.risk_color }}></div>
                  </div>
                </div>

                <div className="gauge-scale-labels">
                  <span>0 Days</span>
                  <span style={{ left: `${ltPercent}%` }}>Lead Time: {lt}d</span>
                  <span style={{ left: `${dangerPercent}%` }}>Danger: {dangerThresh}d</span>
                  <span style={{ left: `${watchPercent}%` }}>Watch: {watchThresh}d</span>
                  <span>{maxScaleDays}+ Days</span>
                </div>
              </div>

              {/* ACTION RECOMMENDATION BANNER */}
              <div 
                className="risk-action-banner"
                style={{ borderColor: riskData.risk_color, background: riskData.risk_bg }}
              >
                <div className="action-banner-icon">
                  {riskData.risk_level === 'CRITICAL' ? (
                    <AlertTriangle size={22} color="#ef4444" />
                  ) : riskData.risk_level === 'HIGH' ? (
                    <AlertTriangle size={22} color="#f97316" />
                  ) : riskData.risk_level === 'WATCH' ? (
                    <Clock size={22} color="#eab308" />
                  ) : (
                    <CheckCircle2 size={22} color="#10b981" />
                  )}
                </div>
                <div className="action-banner-content">
                  <span className="action-banner-title">
                    Operational Protocol ({riskData.risk_badge}):
                  </span>
                  <p className="action-banner-desc">{riskData.action_required}</p>
                </div>
                {riskData.shortfall_units > 0 && (
                  <button 
                    className="btn-trigger-barter-now"
                    onClick={() => {
                      if (onTriggerRequisition) {
                        onTriggerRequisition({
                          hospital: selectedHospital,
                          medicine: selectedMedicine,
                          quantity: riskData.shortfall_units
                        });
                      }
                      onClose();
                    }}
                  >
                    <Send size={13} />
                    <span>Initiate Emergency Barter ({riskData.shortfall_units} units)</span>
                  </button>
                )}
              </div>

              {/* NETWORK-WIDE RISK MATRIX TABLE */}
              <div className="risk-matrix-section">
                <div className="matrix-section-header">
                  <div className="matrix-title-group">
                    <ShieldAlert size={16} color="#06b6d4" />
                    <h4>Karnataka Hospital Network Risk Radar</h4>
                  </div>

                  {/* FILTER TABS */}
                  <div className="matrix-tabs">
                    <button 
                      className={`matrix-tab ${activeRiskTab === 'ALL' ? 'active' : ''}`}
                      onClick={() => setActiveRiskTab('ALL')}
                    >
                      All ({summary.total})
                    </button>
                    <button 
                      className={`matrix-tab tab-crit ${activeRiskTab === 'CRITICAL' ? 'active' : ''}`}
                      onClick={() => setActiveRiskTab('CRITICAL')}
                    >
                      🔴 Critical ({summary.CRITICAL})
                    </button>
                    <button 
                      className={`matrix-tab tab-high ${activeRiskTab === 'HIGH' ? 'active' : ''}`}
                      onClick={() => setActiveRiskTab('HIGH')}
                    >
                      🟠 High ({summary.HIGH})
                    </button>
                    <button 
                      className={`matrix-tab tab-watch ${activeRiskTab === 'WATCH' ? 'active' : ''}`}
                      onClick={() => setActiveRiskTab('WATCH')}
                    >
                      🟡 Watch ({summary.WATCH})
                    </button>
                    <button 
                      className={`matrix-tab tab-stable ${activeRiskTab === 'STABLE' ? 'active' : ''}`}
                      onClick={() => setActiveRiskTab('STABLE')}
                    >
                      🟢 Stable ({summary.STABLE})
                    </button>
                  </div>
                </div>

                <div className="matrix-table-wrapper">
                  <table className="risk-matrix-table">
                    <thead>
                      <tr>
                        <th>Hospital Facility</th>
                        <th>Medicine</th>
                        <th>Current Stock</th>
                        <th>Daily Burn</th>
                        <th>Days of Supply</th>
                        <th>Lead Time + Buffer</th>
                        <th>Risk Status</th>
                        <th>Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                            No medicines match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item, idx) => (
                          <tr key={`${item.hospital}_${item.medicine}_${idx}`}>
                            <td><strong>{item.hospital}</strong></td>
                            <td><span className="med-pill">{item.medicine}</span></td>
                            <td>{item.current_stock} units</td>
                            <td>{item.daily_burn_rate} u/d</td>
                            <td>
                              <strong style={{ color: item.risk_color }}>
                                {item.days_of_supply} days
                              </strong>
                            </td>
                            <td>
                              {item.supplier_lead_time_days}d + {item.safety_buffer_days}d ({item.lead_time_plus_buffer}d)
                            </td>
                            <td>
                              <span 
                                className="risk-pill" 
                                style={{ color: item.risk_color, background: item.risk_bg, borderColor: item.risk_color }}
                              >
                                {item.risk_badge}
                              </span>
                            </td>
                            <td>
                              {item.risk_level === 'CRITICAL' ? (
                                <button 
                                  className="btn-table-action"
                                  onClick={() => {
                                    if (onTriggerRequisition) {
                                      onTriggerRequisition({
                                        hospital: item.hospital,
                                        medicine: item.medicine,
                                        quantity: item.shortfall_units || 150
                                      });
                                    }
                                    onClose();
                                  }}
                                >
                                  ⚡ Barter Transfer
                                </button>
                              ) : item.risk_level === 'HIGH' ? (
                                <span className="text-orange font-semibold">Expedite Order</span>
                              ) : item.risk_level === 'WATCH' ? (
                                <span className="text-yellow">Weekly Reorder</span>
                              ) : (
                                <span className="text-emerald">Adequate Reserve</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
