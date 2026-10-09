import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HospitalCard from './components/HospitalCard';
import NegotiationFeed from './components/NegotiationFeed';
import PendingTradePanel from './components/PendingTradePanel';
import TradeHistoryTable from './components/TradeHistoryTable';
import ReasoningDrawer from './components/ReasoningDrawer';
import ApiKeyModal from './components/ApiKeyModal';
import DakshinaKannadaModal from './components/DakshinaKannadaModal';
import SupplyChainChatbot from './components/SupplyChainChatbot';
import FindMedicineModal from './components/FindMedicineModal';
import DemandForecastModal from './components/DemandForecastModal';
import RiskEngineModal from './components/RiskEngineModal';
import ExpiryIntelligenceModal from './components/ExpiryIntelligenceModal';
import RedistributionModal from './components/RedistributionModal';
import PriorityEngineModal from './components/PriorityEngineModal';
import { Play, Sparkles, Brain, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, Building2, RefreshCw } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [scenarioCount, setScenarioCount] = useState(1);
  const [events, setEvents] = useState([]);
  const [pendingTrade, setPendingTrade] = useState(null);
  const [tradeHistory, setTradeHistory] = useState({ trades: [], stats: { approved: 0, rejected: 0, total_transferred: 0 } });
  const [reasoningData, setReasoningData] = useState({ logs: [], stats: {} });
  const [medicineRequests, setMedicineRequests] = useState([]);

  // Dakshina Kannada regional state
  const [directory, setDirectory] = useState([]);
  const [taluks, setTaluks] = useState([]);
  const [selectedTaluk, setSelectedTaluk] = useState('All');
  const [nodeCount, setNodeCount] = useState(3);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [processingTrade, setProcessingTrade] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showFindMedicineModal, setShowFindMedicineModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showRedistributionModal, setShowRedistributionModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [forecastTarget, setForecastTarget] = useState({ hospital: "City General Hospital", medicine: "Paracetamol" });
  const [errorBanner, setErrorBanner] = useState(null);
  const [isDark, setIsDark] = useState(true);

  // Sync theme attribute to HTML tag
  useEffect(() => {
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Fetch initial system state including Dakshina Kannada network directory and medicine requests
  const fetchAllData = async () => {
    try {
      const [statusRes, hospRes, eventsRes, historyRes, reasoningRes, dirRes, taluksRes, requestsRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()),
        fetch('/api/hospitals').then(r => r.json()),
        fetch('/api/events').then(r => r.json()),
        fetch('/api/history').then(r => r.json()),
        fetch('/api/reasoning').then(r => r.json()),
        fetch('/api/dakshina-kannada/directory').then(r => r.json()).catch(() => ({ hospitals: [] })),
        fetch('/api/dakshina-kannada/taluks').then(r => r.json()).catch(() => ({ taluks: [] })),
        fetch('/api/medicine-requests').then(r => r.json()).catch(() => ({ requests: [] }))
      ]);

      setStatus(statusRes);
      setHospitals(hospRes.hospitals || []);
      setScenarioCount(hospRes.scenario_count || 1);
      setEvents(eventsRes.events || []);
      setPendingTrade(eventsRes.pending_trade);
      setTradeHistory(historyRes);
      setReasoningData(reasoningRes);
      setDirectory(dirRes.hospitals || []);
      setTaluks(taluksRes.taluks || []);
      if (hospRes.active_taluk) setSelectedTaluk(hospRes.active_taluk);
      setMedicineRequests(requestsRes.requests || []);
    } catch (err) {
      console.error("Failed to connect to MedFlow-AI backend:", err);
    }
  };

  const fetchMedicineRequests = async () => {
    try {
      const res = await fetch('/api/medicine-requests').then(r => r.json());
      setMedicineRequests(res.requests || []);
    } catch (err) {
      console.error("Failed to fetch medicine requests:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handler: Generate New Scenario within Dakshina Kannada
  const handleNewScenario = async (taluk = selectedTaluk, count = nodeCount, hospitalNames = null) => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/scenario/new', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          taluk: taluk === 'All' ? null : taluk, 
          count: count,
          hospital_names: hospitalNames 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate scenario');

      setHospitals(data.hospitals || []);
      setScenarioCount(data.scenario_count);
      setEvents(data.events || []);
      setPendingTrade(data.pending_trade);
      if (taluk) setSelectedTaluk(taluk);
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Select hospital from the Dakshina Kannada directory modal
  const handleSelectHospitalFromDirectory = (hosp) => {
    setShowDirectoryModal(false);
    handleNewScenario(hosp.taluk, 3, [hosp.name]);
  };

  // Handler: Start AI Negotiation
  const handleStartNegotiation = async () => {
    if (!status?.api_key_configured) {
      setShowKeyModal(true);
      return;
    }

    setIsNegotiating(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/negotiate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Negotiation failed');

      setEvents(data.events || []);
      setPendingTrade(data.pending_trade);
      if (data.hospitals) setHospitals(data.hospitals);

      // Refresh reasoning and status
      const [reasoningRes, statusRes] = await Promise.all([
        fetch('/api/reasoning').then(r => r.json()),
        fetch('/api/status').then(r => r.json())
      ]);
      setReasoningData(reasoningRes);
      setStatus(statusRes);

      // Smooth scroll to pending trade panel if trade proposed
      if (data.pending_trade) {
        setTimeout(() => {
          document.getElementById('verification-panel')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setIsNegotiating(false);
    }
  };

  // Handler: Human-in-the-Loop Trade Approval
  const handleApproveTrade = async () => {
    setProcessingTrade(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/trade/approve', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to approve trade');

      setHospitals(data.hospitals || []);
      setEvents(data.events || []);
      setPendingTrade(null);

      // Refresh trade history and reasoning
      const [historyRes, reasoningRes, statusRes] = await Promise.all([
        fetch('/api/history').then(r => r.json()),
        fetch('/api/reasoning').then(r => r.json()),
        fetch('/api/status').then(r => r.json())
      ]);
      setTradeHistory(historyRes);
      setReasoningData(reasoningRes);
      setStatus(statusRes);
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setProcessingTrade(false);
    }
  };

  // Handler: Human-in-the-Loop Trade Rejection
  const handleRejectTrade = async (reason) => {
    const reasonText = (typeof reason === 'string' && reason.trim())
      ? reason.trim()
      : 'Declined by medical administrator';
    setProcessingTrade(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/trade/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reasonText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to reject trade');

      setEvents(data.events || []);
      setPendingTrade(null);

      const [historyRes, reasoningRes, statusRes] = await Promise.all([
        fetch('/api/history').then(r => r.json()),
        fetch('/api/reasoning').then(r => r.json()),
        fetch('/api/status').then(r => r.json())
      ]);
      setTradeHistory(historyRes);
      setReasoningData(reasoningRes);
      setStatus(statusRes);
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setProcessingTrade(false);
    }
  };

  // Handler: Save API Key
  const handleSaveKey = async (apiKey) => {
    try {
      const res = await fetch('/api/save-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to connect key');

      setShowKeyModal(false);
      fetchAllData();
    } catch (err) {
      throw err;
    }
  };

  // Handler: Clear Reasoning Logs
  const handleClearReasoning = async () => {
    try {
      await fetch('/api/reasoning/clear', { method: 'POST' });
      setReasoningData({ logs: [], stats: {} });
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate totals
  const totalCritical = hospitals.reduce((acc, h) => acc + (h.status_counts?.critical || 0), 0);
  const totalWarning = hospitals.reduce((acc, h) => acc + (h.status_counts?.warning || 0), 0);

  return (
    <div className="dashboard-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Clinical Navigation */}
      <Navbar 
        status={status}
        scenarioCount={scenarioCount}
        onNewScenario={() => handleNewScenario(selectedTaluk, nodeCount)}
        onOpenKeyModal={() => setShowKeyModal(true)}
        onOpenFindMedicine={() => setShowFindMedicineModal(true)}
        onOpenForecast={() => setShowForecastModal(true)}
        onOpenRisk={() => setShowRiskModal(true)}
        onOpenExpiry={() => setShowExpiryModal(true)}
        onOpenRedistribution={() => setShowRedistributionModal(true)}
        onOpenPriority={() => setShowPriorityModal(true)}
        loading={loading}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Main Operations Container */}
      <main className="dashboard-main" style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '0 1.5rem 3rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* Error Alert Banner with Emergency Map Fallback Trigger */}
        {errorBanner && (
          <div style={{
            padding: '1.15rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--rose-50)',
            border: '1px solid var(--rose-100)',
            color: 'var(--rose-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <AlertTriangle size={22} color="var(--rose-600, #ef4444)" />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>
                  AI Negotiation / System Notice
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: '0.15rem', opacity: 0.9 }}>
                  {errorBanner}. Manual Override Available: Use the Interactive Emergency Map to dispatch medication requisitions directly.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="btn btn-warning"
                onClick={() => {
                  setErrorBanner(null);
                  setShowFindMedicineModal(true);
                }}
                style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: '700' }}
              >
                🗺️ Open Emergency Map Requisition
              </button>
              <button 
                onClick={() => setErrorBanner(null)}
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: '700', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Global Control & Telemetry Bar */}
        <section className="med-card" style={{
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          borderRadius: 'var(--radius-xl)'
        }}>
          {/* Left: Action triggers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={pendingTrade ? () => document.getElementById('verification-panel')?.scrollIntoView({ behavior: 'smooth' }) : handleStartNegotiation}
              disabled={isNegotiating || processingTrade}
              id="start-negotiation-btn"
              style={{ padding: '0.8rem 1.6rem', fontSize: '0.95rem' }}
              title={pendingTrade ? "Review pending trade proposal below" : "Run autonomous multi-agent AI negotiation"}
            >
              <Sparkles size={18} className={isNegotiating ? "spin" : ""} />
              <span>
                {isNegotiating 
                  ? 'Evaluating Peer Inventories...' 
                  : pendingTrade 
                    ? '⚠️ Trade Pending Approval (Review Below)' 
                    : '🚀 Start AI Negotiation'}
              </span>
            </button>

            {pendingTrade && (
              <span className="badge badge-critical" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', animation: 'pulse 2s infinite' }}>
                <AlertTriangle size={14} /> Action Required: 1% Human Verification
              </span>
            )}
          </div>

          {/* Right: Telemetry & Log Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {/* Shortage Counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: totalCritical > 0 ? '#f87171' : '#34d399', fontWeight: '700' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: totalCritical > 0 ? '#ef4444' : '#10b981' }} />
                <span>{totalCritical} Critical Deficits</span>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <div style={{ color: '#fbbf24', fontWeight: '600' }}>
                {totalWarning} Warnings
              </div>
            </div>

            {/* Toggle AI Reasoning Drawer */}
            <button
              className={`btn ${showReasoning ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowReasoning(!showReasoning)}
              style={{ padding: '0.55rem 1rem', fontSize: '0.82rem' }}
              id="toggle-reasoning-log"
            >
              <Brain size={16} />
              <span>{showReasoning ? 'Hide AI Reasoning' : '🧠 AI Reasoning Log'}</span>
            </button>
          </div>
        </section>

        {/* SECTION 1: REGIONAL HOSPITAL INVENTORY NETWORK (Dakshina Kannada Corridor) */}
        <section>
          {/* District Header & Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h2 style={{ fontSize: '1.28rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Network Hospital Inventory Nodes
                </h2>
                <span className="badge badge-surplus" style={{ fontSize: '0.72rem' }}>
                  {hospitals.length} Active Nodes
                </span>
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Karnataka Healthcare Corridor • Dakshina Kannada District ({directory.length || 28} Facilities across 7 Taluks)
              </span>
            </div>

            {/* Action Buttons: Directory Modal & Node Count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              {/* Node count toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '0.2rem',
                border: '1px solid var(--border-subtle)'
              }}>
                {[3, 4, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => {
                      setNodeCount(n);
                      handleNewScenario(selectedTaluk, n);
                    }}
                    style={{
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: 'none',
                      background: nodeCount === n ? 'var(--teal-600)' : 'transparent',
                      color: nodeCount === n ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    {n} Nodes
                  </button>
                ))}
              </div>

              {/* View Full Directory Button */}
              <button
                className="btn btn-secondary"
                onClick={() => setShowDirectoryModal(true)}
                style={{ padding: '0.5rem 0.95rem', fontSize: '0.82rem' }}
                id="view-dk-directory-btn"
              >
                <Building2 size={15} color="#06b6d4" />
                <span>🏥 District Directory ({directory.length || 28})</span>
              </button>

              {/* Regenerate Scenario */}
              <button
                className="btn btn-secondary"
                onClick={() => handleNewScenario(selectedTaluk, nodeCount)}
                disabled={loading}
                style={{ padding: '0.5rem 0.95rem', fontSize: '0.82rem' }}
                title="Generate new crisis scenario in current corridor"
              >
                <RefreshCw size={14} className={loading ? "spin" : ""} />
                <span>New Scenario</span>
              </button>
            </div>
          </div>

          {/* Taluk Corridor Switcher Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '1.25rem',
            overflowX: 'auto',
            paddingBottom: '0.35rem'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginRight: '0.3rem', whiteSpace: 'nowrap' }}>
              Corridor:
            </span>
            {(taluks.length > 0 ? taluks : [
              { name: 'All', label: 'All Dakshina Kannada', count: 28 },
              { name: 'Mangalore', label: 'Mangalore', count: 14 },
              { name: 'Bantwal', label: 'Bantwal', count: 3 },
              { name: 'Puttur', label: 'Puttur', count: 3 },
              { name: 'Belthangady', label: 'Belthangady', count: 3 },
              { name: 'Sullia', label: 'Sullia', count: 2 },
              { name: 'Moodbidri', label: 'Moodbidri', count: 2 },
              { name: 'Kadaba', label: 'Kadaba', count: 1 },
            ]).map(t => {
              const isActive = selectedTaluk === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => {
                    setSelectedTaluk(t.name);
                    handleNewScenario(t.name, nodeCount);
                  }}
                  disabled={loading}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: isActive ? '1px solid var(--teal-600, #06b6d4)' : '1px solid var(--border-subtle)',
                    background: isActive ? 'var(--badge-surplus-bg)' : 'var(--bg-surface)',
                    color: isActive ? 'var(--badge-surplus-text)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.name} ({t.count})
                </button>
              );
            })}
          </div>

          {/* Hospital Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.25rem'
          }}>
            {hospitals.map((hospital, idx) => (
              <HospitalCard 
                key={hospital.name || idx} 
                hospital={hospital}
                isRequester={pendingTrade?.receiver === hospital.name}
                isDonor={pendingTrade?.donor === hospital.name}
              />
            ))}
          </div>
        </section>

        {/* SECTION 2: HUMAN-IN-THE-LOOP VERIFICATION */}
        {pendingTrade && (
          <section id="verification-panel">
            <PendingTradePanel 
              pendingTrade={pendingTrade}
              onApprove={handleApproveTrade}
              onReject={handleRejectTrade}
              processing={processingTrade}
            />
          </section>
        )}

        {/* SECTION 3: LIVE MULTI-AGENT NEGOTIATION FEED */}
        <section>
          <NegotiationFeed 
            events={events}
            isNegotiating={isNegotiating}
          />
        </section>

        {/* SECTION 4: AI REASONING TELEMETRY (Toggled) */}
        {showReasoning && (
          <section id="reasoning-telemetry">
            <ReasoningDrawer 
              reasoningData={reasoningData}
              onClearLog={handleClearReasoning}
            />
          </section>
        )}

        {/* SECTION 5: IMMUTABLE TRADE HISTORY AUDIT LOG & REQUISITION REQUESTS */}
        <section>
          <TradeHistoryTable 
            historyData={tradeHistory}
            medicineRequests={medicineRequests}
            onRefreshRequests={async () => {
              await fetchMedicineRequests();
              await fetchAllData();
            }}
            onOpenFindMedicine={() => setShowFindMedicineModal(true)}
          />
        </section>

      </main>

      {/* Dakshina Kannada Hospital Directory Modal */}
      <DakshinaKannadaModal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
        directory={directory}
        onSelectHospital={handleSelectHospitalFromDirectory}
        currentActiveNames={hospitals.map(h => h.name)}
      />

      {/* Interactive Find Medicine Nearby Modal */}
      <FindMedicineModal 
        isOpen={showFindMedicineModal}
        onClose={() => setShowFindMedicineModal(false)}
        onRequestSuccess={() => {
          fetchMedicineRequests();
          fetchAllData();
        }}
      />

      {/* Engine 1: Demand Forecast Modal */}
      <DemandForecastModal 
        isOpen={showForecastModal}
        onClose={() => setShowForecastModal(false)}
        initialHospital={forecastTarget.hospital}
        initialMedicine={forecastTarget.medicine}
        onTriggerRequisition={(req) => {
          setShowFindMedicineModal(true);
        }}
      />

      {/* Engine 2: Risk Engine Modal */}
      <RiskEngineModal 
        isOpen={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        initialHospital={forecastTarget.hospital}
        initialMedicine={forecastTarget.medicine}
        onTriggerRequisition={(req) => {
          setShowFindMedicineModal(true);
        }}
      />

      {/* Engine 3: Expiry Intelligence Modal */}
      <ExpiryIntelligenceModal 
        isOpen={showExpiryModal}
        onClose={() => setShowExpiryModal(false)}
        initialHospital={forecastTarget.hospital}
        initialMedicine={forecastTarget.medicine}
        onTriggerRequisition={(req) => {
          setShowFindMedicineModal(true);
        }}
      />

      {/* Engine 4: Redistribution Optimizer Modal */}
      <RedistributionModal 
        isOpen={showRedistributionModal}
        onClose={() => setShowRedistributionModal(false)}
        initialRecipient={forecastTarget.hospital}
        initialMedicine={forecastTarget.medicine}
        onTransferExecuted={async () => {
          await fetchAllData();
        }}
      />

      {/* Engine 5: Priority Engine Modal */}
      <PriorityEngineModal 
        isOpen={showPriorityModal}
        onClose={() => setShowPriorityModal(false)}
        initialMedicine={forecastTarget.medicine}
        onTriggerRequisition={(req) => {
          setShowFindMedicineModal(true);
        }}
      />

      {/* API Key Modal */}
      <ApiKeyModal 
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onSaveKey={handleSaveKey}
        currentStatus={status}
      />

      {/* Assistant Chatbot */}
      <SupplyChainChatbot />
    </div>
  );
}
