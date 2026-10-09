import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Calendar, Clock, AlertTriangle, 
  CheckCircle2, ShieldAlert, CloudRain, Snowflake, Sun, 
  Brain, X, ChevronRight, Pill, Send, Sparkles, RefreshCw, BarChart3, Cpu
} from 'lucide-react';
import { fetchDemandForecast, fetchForecastAlerts } from '../api/forecastApi';
import './DemandForecastModal.css';

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

const SEASONS = [
  { id: "Monsoon", name: "Monsoon (Dengue/Fever Peak)", icon: CloudRain, color: "#06b6d4" },
  { id: "Winter", name: "Winter (Respiratory Peak)", icon: Snowflake, color: "#38bdf8" },
  { id: "Summer", name: "Summer (Dehydration/Heat)", icon: Sun, color: "#f59e0b" },
  { id: "Normal", name: "Baseline (Standard)", icon: Calendar, color: "#10b981" }
];

export default function DemandForecastModal({ 
  isOpen, 
  onClose, 
  onTriggerRequisition,
  initialHospital = "City General Hospital",
  initialMedicine = "Paracetamol"
}) {
  const [selectedHospital, setSelectedHospital] = useState(initialHospital);
  const [selectedMedicine, setSelectedMedicine] = useState(initialMedicine);
  const [horizon, setHorizon] = useState(14); // 7 or 14
  const [selectedSeason, setSelectedSeason] = useState("Monsoon");

  const [forecast, setForecast] = useState(null);
  const [networkAlerts, setNetworkAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Sync initial props
  useEffect(() => {
    if (initialHospital) setSelectedHospital(initialHospital);
    if (initialMedicine) setSelectedMedicine(initialMedicine);
  }, [initialHospital, initialMedicine]);

  // Load forecast whenever hospital, medicine, horizon, or season changes
  const loadForecast = async () => {
    setLoading(true);
    try {
      const data = await fetchDemandForecast(selectedHospital, selectedMedicine, horizon, selectedSeason);
      setForecast(data);
      const alertsData = await fetchForecastAlerts(horizon);
      setNetworkAlerts(alertsData.alerts || []);
    } catch (err) {
      console.error("Failed to load demand forecast:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadForecast();
    }
  }, [isOpen, selectedHospital, selectedMedicine, horizon, selectedSeason]);

  if (!isOpen) return null;

  // Chart computation helpers
  const historyData = forecast?.historical_consumption || forecast?.history || [];
  const predictionData = forecast?.predictions || [];
  const totalDemand = forecast?.predicted_total_demand ?? forecast?.cumulative_predicted_demand ?? 0;
  const suggestedReorder = forecast?.suggested_reorder ?? forecast?.recommended_reorder_qty ?? 0;
  const daysToZero = forecast?.stockout_day ?? forecast?.days_until_zero_stock;
  const daysToBreach = forecast?.warning_day ?? forecast?.days_until_threshold_breach;
  const mlMeta = forecast?.ml_metadata;

  const allPoints = [
    ...historyData.map(h => ({ ...h, isHistorical: true })),
    ...predictionData.map(p => ({ ...p, isHistorical: false }))
  ];

  const maxDailyValue = Math.max(
    ...historyData.map(h => h.consumption || 0),
    ...predictionData.map(p => p.upper_bound || p.predicted_demand || 0),
    80
  );

  return (
    <div className="forecast-overlay" onClick={onClose}>
      <div className="forecast-container" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="forecast-header">
          <div className="forecast-header-left">
            <div className="forecast-logo-icon">📈</div>
            <div>
              <div className="forecast-title-row">
                <h2 className="forecast-title">Engine 1: Demand Forecast Engine</h2>
                <span className="forecast-badge">Predictive Analytics</span>
                <span className="forecast-badge-secondary">7 / 14 Day Horizon</span>
              </div>
              <p className="forecast-subtitle">
                Multi-factor demand prediction based on historical burn, facility tier, seasonality, and recent consumption momentum.
              </p>
            </div>
          </div>

          <button className="btn-close-forecast" onClick={onClose} title="Close Forecast Engine">
            <X size={18} />
          </button>
        </div>

        {/* CONTROLS BAR */}
        <div className="forecast-controls-bar">
          {/* Facility Select */}
          <div className="forecast-control-group">
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

          {/* Medicine Select */}
          <div className="forecast-control-group">
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

          {/* Forecast Horizon Toggle */}
          <div className="forecast-control-group">
            <label className="control-label">Forecast Horizon</label>
            <div className="horizon-toggle-pill">
              <button 
                className={`horizon-btn ${horizon === 7 ? 'active' : ''}`}
                onClick={() => setHorizon(7)}
              >
                7 Days
              </button>
              <button 
                className={`horizon-btn ${horizon === 14 ? 'active' : ''}`}
                onClick={() => setHorizon(14)}
              >
                14 Days
              </button>
            </div>
          </div>

          {/* Seasonality Multiplier Select */}
          <div className="forecast-control-group">
            <label className="control-label">Epidemiological Season</label>
            <div className="season-select-wrapper">
              <select 
                className="control-select season-select"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
              >
                {SEASONS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Refresh Action */}
          <button className="btn-refresh-forecast" onClick={loadForecast} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>{loading ? "Computing..." : "Re-Calculate"}</span>
          </button>
        </div>

        {/* MAIN BODY CONTENT */}
        <div className="forecast-body">
          {loading && !forecast ? (
            <div className="forecast-loading-state">
              <div className="spinner-forecast"></div>
              <span>Processing time-series regression and seasonal multipliers...</span>
            </div>
          ) : forecast && (
            <>
              {/* SCIKIT-LEARN ML MODEL DIAGNOSTICS BAR */}
              {mlMeta && (
                <div className="ml-diagnostics-bar">
                  <div className="ml-model-pill">
                    <Cpu size={14} className="text-cyan" />
                    <span><strong>ML Model:</strong> {mlMeta.model_type}</span>
                  </div>
                  <div className="ml-metric-pill">
                    <span className="text-muted">Goodness of Fit:</span>
                    <span className="ml-r2-val">R² = {mlMeta.r2_score}</span>
                  </div>
                  <div className="ml-metric-pill">
                    <span className="text-muted">Error Margin:</span>
                    <span className="text-cyan">RMSE ±{mlMeta.rmse} units</span>
                  </div>
                  <div className="ml-features-container">
                    <span className="ml-features-label">Top ML Feature Predictors:</span>
                    <div className="ml-feature-tags">
                      {mlMeta.feature_importances?.map((feat, i) => (
                        <span key={i} className="ml-feature-tag">
                          {feat.feature}: <strong>{feat.importance_pct}%</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TOP KPI CARDS */}
              <div className="forecast-kpi-grid">
                {/* Cumulative Predicted Demand */}
                <div className="forecast-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Projected {horizon}-Day Demand</span>
                    <TrendingUp size={16} color="#06b6d4" />
                  </div>
                  <div className="kpi-val text-cyan">
                    {totalDemand?.toLocaleString()} <span className="kpi-unit">units</span>
                  </div>
                  <div className="kpi-footer">
                    <span>Facility Tier: <strong>{forecast.facility_profile?.tier?.split(' ')[0]}</strong></span>
                    <span className="kpi-trend trend-up">
                      Season Multiplier: {forecast.season_multiplier}x
                    </span>
                  </div>
                </div>

                {/* Current Stock vs Safety Buffer */}
                <div className="forecast-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Current Supply vs Buffer</span>
                    <Pill size={16} color="#a855f7" />
                  </div>
                  <div className="kpi-val text-purple">
                    {forecast.current_stock?.toLocaleString()} <span className="kpi-unit">units</span>
                  </div>
                  <div className="kpi-footer">
                    <span>Safety Buffer: <strong>{forecast.safety_threshold} units</strong></span>
                    <span className="kpi-subtle">Lead Time: <strong>{forecast.facility_profile?.lead_time_days}d</strong></span>
                  </div>
                </div>

                {/* Stockout Risk Classification */}
                <div className={`forecast-kpi-card kpi-risk-${forecast.risk_level?.toLowerCase()}`}>
                  <div className="kpi-header">
                    <span className="kpi-label">Stockout Risk Level</span>
                    <ShieldAlert size={16} style={{ color: forecast.risk_color }} />
                  </div>
                  <div className="kpi-val" style={{ color: forecast.risk_color }}>
                    {forecast.risk_level}
                  </div>
                  <div className="kpi-footer">
                    {daysToZero ? (
                      <span className="text-red font-bold">
                        🚨 Complete stockout in {daysToZero} days
                      </span>
                    ) : daysToBreach ? (
                      <span className="text-amber font-semibold">
                        ⚠️ Buffer breached in {daysToBreach} days
                      </span>
                    ) : (
                      <span className="text-green font-semibold">
                        ✅ Buffer maintained for {horizon} days
                      </span>
                    )}
                  </div>
                </div>

                {/* Recommended Reorder Quantity & Action */}
                <div className="forecast-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Proactive Reorder Required</span>
                    <Sparkles size={16} color="#10b981" />
                  </div>
                  <div className="kpi-val text-emerald">
                    {suggestedReorder > 0 
                      ? `+${suggestedReorder.toLocaleString()}` 
                      : "0"} <span className="kpi-unit">units</span>
                  </div>
                  <div className="kpi-footer">
                    {suggestedReorder > 0 ? (
                      <button 
                        className="btn-proactive-requisition"
                        onClick={() => {
                          if (onTriggerRequisition) {
                            onTriggerRequisition({
                              hospital: selectedHospital,
                              medicine: selectedMedicine,
                              quantity: suggestedReorder
                            });
                          }
                          onClose();
                        }}
                      >
                        <Send size={12} />
                        <span>Requisition Now</span>
                      </button>
                    ) : (
                      <span className="text-green">Inventory adequately covered</span>
                    )}
                  </div>
                </div>
              </div>

              {/* CLINICAL INSIGHT BANNER */}
              <div className="clinical-insight-banner">
                <div className="clinical-icon-circle">
                  <Brain size={18} color="#38bdf8" />
                </div>
                <div className="clinical-text">
                  <span className="clinical-label">AI Epidemiological & Clinical Rationale:</span>
                  <p className="clinical-desc">{forecast.clinical_insight}</p>
                </div>
                <div className="clinical-season-chip">
                  <span>Seasonality: <strong>{forecast.season_multiplier}x</strong> ({forecast.season})</span>
                </div>
              </div>

              {/* MAIN VISUAL TIME-SERIES CHART */}
              <div className="forecast-chart-card">
                <div className="chart-header">
                  <div className="chart-title-group">
                    <BarChart3 size={16} color="#06b6d4" />
                    <h3 className="chart-title">
                      Consumption Time-Series & {horizon}-Day Predictive Curve
                    </h3>
                  </div>
                  <div className="chart-legend">
                    <div className="legend-entry">
                      <span className="legend-line line-history"></span>
                      <span>Historical Actual (Past 14 Days)</span>
                    </div>
                    <div className="legend-entry">
                      <span className="legend-line line-forecast"></span>
                      <span>Predicted Demand (Next {horizon} Days)</span>
                    </div>
                    <div className="legend-entry">
                      <span className="legend-area area-ci"></span>
                      <span>95% Confidence Band</span>
                    </div>
                    <div className="legend-entry">
                      <span className="legend-line line-threshold"></span>
                      <span>Safety Buffer Threshold</span>
                    </div>
                  </div>
                </div>

                {/* SVG RESPONSIVE TIMELINE CHART */}
                <div className="chart-viewport">
                  <svg className="forecast-svg-chart" viewBox="0 0 920 260" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.03" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                      const y = 220 - ratio * 180;
                      return (
                        <g key={ratio}>
                          <line x1="50" y1={y} x2="900" y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                          <text x="40" y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">
                            {Math.round(ratio * maxDailyValue)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Historical Series (Bars & Line) */}
                    {historyData.map((pt, idx) => {
                      const totalHistorical = historyData.length;
                      const x = 60 + idx * (380 / totalHistorical);
                      const barHeight = (pt.consumption / maxDailyValue) * 180;
                      const y = 220 - barHeight;

                      return (
                        <g 
                          key={pt.date} 
                          className="chart-bar-group"
                          onMouseEnter={() => setHoveredPoint({ ...pt, isHistory: true })}
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          <rect
                            x={x - 8}
                            y={y}
                            width="16"
                            height={barHeight}
                            fill="#3b82f6"
                            opacity="0.65"
                            rx="3"
                          />
                          {idx % 2 === 0 && (
                            <text x={x} y="240" fill="#94a3b8" fontSize="9" textAnchor="middle">
                              {pt.day_label}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Forecast Separation Line ("TODAY") */}
                    <line x1="450" y1="30" x2="450" y2="225" stroke="#a855f7" strokeWidth="2" strokeDasharray="4 4" />
                    <text x="450" y="24" fill="#c084fc" fontSize="11" fontWeight="bold" textAnchor="middle">
                      TODAY
                    </text>

                    {/* 95% Confidence Band Area for Future */}
                    {(() => {
                      const futureCount = predictionData.length;
                      if (futureCount === 0) return null;
                      
                      const topPoints = predictionData.map((pt, idx) => {
                        const x = 460 + idx * (420 / futureCount);
                        const y = 220 - (pt.upper_bound / maxDailyValue) * 180;
                        return `${x},${y}`;
                      });

                      const bottomPoints = [...predictionData].reverse().map((pt, revIdx) => {
                        const idx = futureCount - 1 - revIdx;
                        const x = 460 + idx * (420 / futureCount);
                        const y = 220 - (pt.lower_bound / maxDailyValue) * 180;
                        return `${x},${y}`;
                      });

                      const pathStr = `M ${topPoints.join(' L ')} L ${bottomPoints.join(' L ')} Z`;
                      return <path d={pathStr} fill="rgba(6, 182, 212, 0.15)" stroke="none" />;
                    })()}

                    {/* Predicted Demand Line & Dots */}
                    {(() => {
                      const futureCount = predictionData.length;
                      if (futureCount === 0) return null;

                      const points = predictionData.map((pt, idx) => {
                        const x = 460 + idx * (420 / futureCount);
                        const y = 220 - (pt.predicted_demand / maxDailyValue) * 180;
                        return { x, y, pt };
                      });

                      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                      return (
                        <g>
                          <path 
                            d={linePath} 
                            fill="none" 
                            stroke="#06b6d4" 
                            strokeWidth="2.5" 
                            strokeDasharray="5 3" 
                          />
                          {points.map((p) => (
                            <circle
                              key={p.pt.date}
                              cx={p.x}
                              cy={p.y}
                              r={p.pt.is_below_threshold ? "5" : "4"}
                              fill={p.pt.is_below_threshold ? "#ef4444" : "#06b6d4"}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setHoveredPoint({ ...p.pt, isHistory: false })}
                              onMouseLeave={() => setHoveredPoint(null)}
                            />
                          ))}
                          {points.filter((_, i) => i % 2 === 0).map((p) => (
                            <text key={p.pt.date} x={p.x} y="240" fill="#22d3ee" fontSize="9" textAnchor="middle">
                              {p.pt.day_label}
                            </text>
                          ))}
                        </g>
                      );
                    })()}

                    {/* Safety Buffer Reference Line */}
                    {(() => {
                      const threshVal = forecast.safety_threshold || 300;
                      const dailyEquivalent = threshVal / 10; // rough representation
                      const y = Math.max(30, 220 - (dailyEquivalent / maxDailyValue) * 180);
                      return (
                        <g>
                          <line x1="50" y1={y} x2="900" y2={y} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.8" />
                          <text x="895" y={y - 6} fill="#fca5a5" fontSize="10" textAnchor="end" fontWeight="bold">
                            Buffer Threshold Reference
                          </text>
                        </g>
                      );
                    })()}
                  </svg>

                  {/* Interactive Hover Tooltip */}
                  {hoveredPoint && (
                    <div className="chart-hover-tooltip">
                      <div className="tooltip-title">
                        {hoveredPoint.day_of_week}, {hoveredPoint.day_label}
                      </div>
                      {hoveredPoint.isHistory ? (
                        <div className="tooltip-row">
                          <span>Actual Consumption:</span>
                          <strong className="text-cyan">{hoveredPoint.consumption} units</strong>
                        </div>
                      ) : (
                        <>
                          <div className="tooltip-row">
                            <span>Predicted Demand:</span>
                            <strong className="text-cyan">{hoveredPoint.predicted_demand} units</strong>
                          </div>
                          <div className="tooltip-row">
                            <span>95% Confidence:</span>
                            <span>{hoveredPoint.lower_bound} - {hoveredPoint.upper_bound} units</span>
                          </div>
                          <div className="tooltip-row">
                            <span>Projected Inventory:</span>
                            <strong className={hoveredPoint.is_below_threshold ? "text-red" : "text-emerald"}>
                              {hoveredPoint.projected_stock} units
                            </strong>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* NETWORK-WIDE PROACTIVE EARLY-WARNING TABLE */}
              <div className="forecast-alerts-section">
                <div className="alerts-section-header">
                  <div className="alerts-title-group">
                    <AlertTriangle size={16} color="#f97316" />
                    <h4>Impending Network Stockouts (Next {horizon} Days)</h4>
                    <span className="alerts-count-badge">{networkAlerts.length} High-Risk Medicines</span>
                  </div>
                  <span className="alerts-sub">
                    Proactive alerts allow AI agents to initiate inter-hospital barters days before stockout.
                  </span>
                </div>

                <div className="alerts-table-wrapper">
                  <table className="forecast-alerts-table">
                    <thead>
                      <tr>
                        <th>Hospital</th>
                        <th>Medicine</th>
                        <th>Current Stock</th>
                        <th>Threshold</th>
                        <th>Buffer Breach</th>
                        <th>Critical Stockout</th>
                        <th>Risk Level</th>
                        <th>Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {networkAlerts.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                            ✅ All medicines across all network hospitals have safe projected buffers.
                          </td>
                        </tr>
                      ) : (
                        networkAlerts.slice(0, 8).map((al, idx) => (
                          <tr key={`${al.hospital}_${al.medicine}_${idx}`}>
                            <td><strong>{al.hospital}</strong></td>
                            <td>
                              <span className="med-pill">{al.medicine}</span>
                            </td>
                            <td>{al.current_stock} units</td>
                            <td>{al.threshold} units</td>
                            <td>
                              <span className="text-amber font-semibold">
                                {al.days_to_breach ? `In ${al.days_to_breach} days` : 'Active'}
                              </span>
                            </td>
                            <td>
                              {al.days_to_zero ? (
                                <span className="text-red font-bold">
                                  In {al.days_to_zero} days!
                                </span>
                              ) : (
                                <span className="text-muted">No zero-stock</span>
                              )}
                            </td>
                            <td>
                              <span className={`risk-pill risk-${al.risk_level.toLowerCase()}`}>
                                {al.risk_level}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="btn-table-inspect"
                                onClick={() => {
                                  setSelectedHospital(al.hospital);
                                  setSelectedMedicine(al.medicine);
                                }}
                              >
                                <span>Inspect Curve</span>
                                <ChevronRight size={12} />
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
