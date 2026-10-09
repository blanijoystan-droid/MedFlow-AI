import React, { useState, useEffect } from 'react';
import { 
  Recycle, AlertTriangle, CheckCircle2, Clock, Calendar, 
  DollarSign, TrendingDown, ArrowRight, X, RefreshCw, Send,
  ShieldCheck, Package, Flame, AlertCircle, FileText
} from 'lucide-react';
import { fetchMedicineExpiryAudit, fetchNetworkExpiryOverview } from '../api/expiryApi';
import './ExpiryIntelligenceModal.css';

const HOSPITALS = [
  "City General Hospital",
  "District Government Hospital",
  "Rural Primary Health Centre"
];

const MEDICINES = [
  "Amoxicillin",
  "Paracetamol",
  "Ibuprofen",
  "Insulin",
  "ORS",
  "Ciprofloxacin",
  "Metformin",
  "Omeprazole"
];

export default function ExpiryIntelligenceModal({
  isOpen,
  onClose,
  onTriggerRequisition,
  initialHospital = "District Government Hospital",
  initialMedicine = "Amoxicillin"
}) {
  const [selectedHospital, setSelectedHospital] = useState(initialHospital);
  const [selectedMedicine, setSelectedMedicine] = useState(initialMedicine);
  const [activeBatchFilter, setActiveBatchFilter] = useState("ALL"); // ALL, CRITICAL, HIGH
  const [auditData, setAuditData] = useState(null);
  const [networkOverview, setNetworkOverview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialHospital) setSelectedHospital(initialHospital);
    if (initialMedicine) setSelectedMedicine(initialMedicine);
  }, [initialHospital, initialMedicine]);

  const loadData = async () => {
    setLoading(true);
    try {
      const audit = await fetchMedicineExpiryAudit(selectedHospital, selectedMedicine);
      setAuditData(audit);
      const network = await fetchNetworkExpiryOverview();
      setNetworkOverview(network);
    } catch (err) {
      console.error("Failed to load expiry intelligence data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedHospital, selectedMedicine]);

  // Pure filtering without hooks to preserve strict React hook ordering
  const donationCandidates = networkOverview?.donation_candidates || [];
  const filteredCandidates = activeBatchFilter === "ALL"
    ? donationCandidates
    : donationCandidates.filter(c => c.risk_tier === activeBatchFilter);

  const summary = networkOverview?.network_summary || {
    total_units_at_risk: 0,
    total_financial_loss_inr: 0,
    critical_batches_count: 0,
    high_batches_count: 0,
    total_at_risk_batches: 0
  };

  // Safe early return placed strictly after all state and effects
  if (!isOpen) return null;

  const batches = auditData?.batches || [];

  return (
    <div className="expiry-overlay" onClick={onClose}>
      <div className="expiry-container" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="expiry-header">
          <div className="expiry-header-left">
            <div className="expiry-logo-icon">♻️</div>
            <div>
              <div className="expiry-title-row">
                <h2 className="expiry-title">Engine 3: Expiry Intelligence</h2>
                <span className="expiry-badge-core">FEFO Protocol</span>
                <span className="expiry-badge-sub">Waste Risk Detection</span>
              </div>
              <p className="expiry-subtitle">
                Audits pharmaceutical batch lifespans, calculates expected patient consumption before expiry, and flags at-risk surplus for proactive redistribution.
              </p>
            </div>
          </div>

          <button className="btn-close-expiry" onClick={onClose} title="Close Expiry Intelligence">
            <X size={18} />
          </button>
        </div>

        {/* CONTROLS BAR */}
        <div className="expiry-controls-bar">
          <div className="expiry-control-group">
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

          <div className="expiry-control-group">
            <label className="control-label">Pharmaceutical Item</label>
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

          <button className="btn-refresh-expiry" onClick={loadData} disabled={loading} title="Re-audit Expiry Engine">
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Re-audit</span>
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="expiry-body">
          {loading && !auditData ? (
            <div className="expiry-loading-state">
              <div className="spinner-expiry"></div>
              <span>Auditing batch manufacturing records and computing FEFO consumption windows...</span>
            </div>
          ) : auditData && (
            <>
              {/* PRIMARY AUDIT KPI CARDS */}
              <div className="expiry-kpi-grid">
                
                {/* 1. POTENTIAL UNUSED UNITS */}
                <div className={`expiry-kpi-card ${auditData.total_unused_units > 0 ? 'card-risk-danger' : 'card-risk-safe'}`}>
                  <div className="kpi-header">
                    <span className="kpi-label">Potential Unused Quantity</span>
                    <AlertTriangle size={16} color={auditData.total_unused_units > 0 ? "#ef4444" : "#10b981"} />
                  </div>
                  <div className="kpi-val" style={{ color: auditData.total_unused_units > 0 ? "#ef4444" : "#10b981" }}>
                    {auditData.total_unused_units?.toLocaleString()} <span className="kpi-unit">units</span>
                  </div>
                  <div className="kpi-footer">
                    <span>Total Stock: <strong>{auditData.total_stock?.toLocaleString()} units</strong></span>
                    <span className={auditData.total_unused_units > 0 ? "text-red font-bold" : "text-emerald font-semibold"}>
                      {auditData.total_unused_units > 0 ? "⚠️ Waste at risk" : "✅ 100% Utilized"}
                    </span>
                  </div>
                </div>

                {/* 2. FINANCIAL LOSS EXPOSURE */}
                <div className="expiry-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Financial Value at Risk</span>
                    <DollarSign size={16} color="#f59e0b" />
                  </div>
                  <div className="kpi-val text-amber">
                    ₹{auditData.total_financial_loss_inr?.toLocaleString()}
                  </div>
                  <div className="kpi-footer">
                    <span>Unit Cost: <strong>₹{auditData.unit_cost_inr}/unit</strong></span>
                    <span className="text-muted">Procurement write-off risk</span>
                  </div>
                </div>

                {/* 3. DAILY BURN RATE */}
                <div className="expiry-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Facility Burn Rate</span>
                    <Clock size={16} color="#06b6d4" />
                  </div>
                  <div className="kpi-val text-cyan">
                    {auditData.daily_burn_rate} <span className="kpi-unit">units / day</span>
                  </div>
                  <div className="kpi-footer">
                    <span>Engine 1 Run-Rate</span>
                    <span className="text-cyan font-semibold">Active Consumption</span>
                  </div>
                </div>

                {/* 4. STATUS CONCLUSION */}
                <div className="expiry-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Expiry Protocol</span>
                    <ShieldCheck size={16} color="#3b82f6" />
                  </div>
                  <div className="kpi-val text-blue" style={{ fontSize: '1.25rem' }}>
                    {auditData.has_waste_risk ? "Must-Donate Surplus" : "Fully Absorbed"}
                  </div>
                  <div className="kpi-footer">
                    <span className="truncate" title={auditData.status_summary}>
                      {auditData.batches?.length} Active Batches Tracked
                    </span>
                  </div>
                </div>
              </div>

              {/* CLINICAL NARRATIVE BANNER */}
              <div className={`expiry-action-banner ${auditData.has_waste_risk ? 'banner-alert' : 'banner-safe'}`}>
                <div className="action-banner-icon">
                  {auditData.has_waste_risk ? (
                    <Flame size={24} color="#ef4444" />
                  ) : (
                    <CheckCircle2 size={24} color="#10b981" />
                  )}
                </div>
                <div className="action-banner-content">
                  <span className="action-banner-title">
                    Clinical Supply Chain Audit:
                  </span>
                  <p className="action-banner-desc">{auditData.clinical_insight}</p>
                </div>
                {auditData.total_unused_units > 0 && (
                  <button 
                    className="btn-trigger-donation-now"
                    onClick={() => {
                      if (onTriggerRequisition) {
                        onTriggerRequisition({
                          hospital: selectedHospital,
                          medicine: selectedMedicine,
                          quantity: auditData.total_unused_units
                        });
                      }
                      onClose();
                    }}
                  >
                    <Send size={13} />
                    <span>Redistribute {auditData.total_unused_units} Units Now</span>
                  </button>
                )}
              </div>

              {/* BATCH-BY-BATCH BREAKDOWN */}
              <div className="expiry-batches-section">
                <div className="section-title-group">
                  <Package size={16} color="#06b6d4" />
                  <h4>Active Pharmaceutical Batches (FEFO Tracking)</h4>
                  <span className="section-sub">Batches sorted by earliest expiration date first.</span>
                </div>

                <div className="batches-grid">
                  {batches.map((b) => (
                    <div key={b.batch_id} className={`batch-card ${b.risk_tier === 'CRITICAL' ? 'batch-critical' : b.risk_tier === 'HIGH' ? 'batch-high' : 'batch-safe'}`}>
                      <div className="batch-card-header">
                        <div className="batch-id-group">
                          <span className="batch-id">{b.batch_id}</span>
                          <span className="batch-badge" style={{ color: b.color, borderColor: b.color }}>
                            {b.badge}
                          </span>
                        </div>
                        <div className="batch-days-badge" style={{ background: b.color }}>
                          {b.days_until_expiry} Days Left
                        </div>
                      </div>

                      <div className="batch-stats-row">
                        <div className="stat-col">
                          <span className="stat-label">Batch Stock</span>
                          <strong className="stat-val">{b.batch_stock} units</strong>
                        </div>
                        <div className="stat-col">
                          <span className="stat-label">Expected Patient Burn</span>
                          <strong className="stat-val text-cyan">{b.expected_consumption} units</strong>
                        </div>
                        <div className="stat-col">
                          <span className="stat-label">Potential Waste</span>
                          <strong className="stat-val" style={{ color: b.potential_unused_units > 0 ? '#ef4444' : '#10b981' }}>
                            {b.potential_unused_units > 0 ? `${b.potential_unused_units} units` : '0 (None)'}
                          </strong>
                        </div>
                      </div>

                      {/* UTILIZATION PROGRESS BAR */}
                      <div className="batch-progress-wrapper">
                        <div className="progress-label-row">
                          <span>Patient Utilization Before Expiry:</span>
                          <strong>{b.utilization_pct}%</strong>
                        </div>
                        <div className="progress-track">
                          <div 
                            className="progress-fill" 
                            style={{ 
                              width: `${b.utilization_pct}%`,
                              background: b.utilization_pct >= 90 ? '#10b981' : (b.utilization_pct >= 60 ? '#f59e0b' : '#ef4444')
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="batch-card-footer">
                        <span>Expiry Date: <strong>{b.expiry_label}</strong></span>
                        <span className="fefo-action-text">{b.fefo_action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* NETWORK-WIDE MUST-DONATE POOL TABLE */}
              <div className="expiry-network-section">
                <div className="network-section-header">
                  <div className="network-title-group">
                    <Recycle size={16} color="#06b6d4" />
                    <h4>Karnataka Network FEFO Redistribution Pool</h4>
                  </div>

                  <div className="network-filter-tabs">
                    <button 
                      className={`tab-btn ${activeBatchFilter === 'ALL' ? 'active' : ''}`}
                      onClick={() => setActiveBatchFilter('ALL')}
                    >
                      All At-Risk ({summary.total_at_risk_batches})
                    </button>
                    <button 
                      className={`tab-btn tab-crit ${activeBatchFilter === 'CRITICAL' ? 'active' : ''}`}
                      onClick={() => setActiveBatchFilter('CRITICAL')}
                    >
                      🔴 Waste Imminent ({summary.critical_batches_count})
                    </button>
                    <button 
                      className={`tab-btn tab-high ${activeBatchFilter === 'HIGH' ? 'active' : ''}`}
                      onClick={() => setActiveBatchFilter('HIGH')}
                    >
                      🟠 High Risk ({summary.high_batches_count})
                    </button>
                  </div>
                </div>

                <div className="network-table-wrapper">
                  <table className="expiry-table">
                    <thead>
                      <tr>
                        <th>Donor Facility</th>
                        <th>Medicine</th>
                        <th>Batch Lot ID</th>
                        <th>Batch Stock</th>
                        <th>Unused Waste Risk</th>
                        <th>Days to Expiry</th>
                        <th>Financial Exposure</th>
                        <th>FEFO Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                            ✅ No batches at risk under the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredCandidates.map((c, idx) => (
                          <tr key={`${c.batch_id}_${idx}`}>
                            <td><strong>{c.donor_hospital}</strong></td>
                            <td><span className="med-pill">{c.medicine}</span></td>
                            <td><code>{c.batch_id}</code></td>
                            <td>{c.batch_stock} units</td>
                            <td>
                              <strong className="text-red">
                                {c.unused_quantity} units
                              </strong>
                            </td>
                            <td>
                              <span className="days-badge" style={{ color: c.color }}>
                                {c.days_until_expiry} days ({c.expiry_label})
                              </span>
                            </td>
                            <td>₹{c.financial_loss_inr?.toLocaleString()}</td>
                            <td>
                              <button 
                                className="btn-table-donate"
                                onClick={() => {
                                  if (onTriggerRequisition) {
                                    onTriggerRequisition({
                                      hospital: c.donor_hospital,
                                      medicine: c.medicine,
                                      quantity: c.unused_quantity
                                    });
                                  }
                                  onClose();
                                }}
                              >
                                🔄 Donate Batch
                              </button>
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
