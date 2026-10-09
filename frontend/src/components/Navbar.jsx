import React from 'react';
import { Activity, ShieldCheck, ShieldAlert, Key, RefreshCw, Moon, Sun, AlertCircle, MapPin, TrendingUp, Recycle, Scale, Cpu, Database } from 'lucide-react';
import FindMedicineButton from './FindMedicineButton';

export default function Navbar({ 
  status, 
  scenarioCount, 
  onNewScenario, 
  onOpenKeyModal, 
  onOpenFindMedicine,
  onOpenForecast,
  onOpenRisk,
  onOpenExpiry,
  onOpenRedistribution,
  onOpenPriority,
  loading,
  isDark,
  onToggleTheme
}) {
  const isKeyConfigured = status?.api_key_configured;

  return (
    <header className="med-card" style={{ 
      margin: '1.25rem 1.5rem', 
      padding: '1rem 1.75rem',
      borderRadius: 'var(--radius-xl)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      {/* Brand & Healthcare Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--teal-600), var(--blue-600))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
          color: '#ffffff'
        }}>
          <Activity size={26} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1 style={{ 
              fontSize: '1.45rem', 
              fontWeight: '800', 
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em'
            }}>
              MedFlow-AI
            </h1>
            <span className="badge badge-surplus" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
              🏥 Hospital Network
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: 'var(--teal-700)',
              background: 'var(--teal-50)',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              border: '1px solid var(--teal-border)',
              fontWeight: '600'
            }}>
              Powered by {status?.model || 'Gemini 3.5 Flash'}
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Autonomous Medical Supply Coordinator • Live Regional Network & Emergency Requisition
          </p>
        </div>
      </div>

      {/* Action Controls & Healthcare System Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

        {/* Scenario Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.45rem 0.85rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          fontWeight: '600'
        }}>
          <span>Scenario #{scenarioCount}</span>
        </div>

        {/* Demand Forecast Engine Button */}
        <button
          onClick={onOpenForecast}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.52rem 0.9rem',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.16), rgba(59, 130, 246, 0.2))',
            border: '1px solid rgba(6, 182, 212, 0.45)',
            color: '#38bdf8',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          id="btn-demand-forecast"
          title="Engine 1: Open 7/14 Day Demand Forecast & Impending Stockout Engine"
        >
          <TrendingUp size={14} />
          <span>📈 Demand Forecast</span>
        </button>

        {/* Engine 2: Risk Engine Button */}
        <button
          onClick={onOpenRisk}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.52rem 0.9rem',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.16), rgba(249, 115, 22, 0.2))',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            color: '#f87171',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          id="btn-risk-engine"
          title="Engine 2: Days of Supply vs Supplier Lead Time & Safety Buffer Risk Engine"
        >
          <ShieldAlert size={14} />
          <span>🚨 Risk Engine</span>
        </button>

        {/* Engine 3: Expiry Intelligence Button */}
        <button
          onClick={onOpenExpiry}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.52rem 0.9rem',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(6, 182, 212, 0.2))',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            color: '#34d399',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          id="btn-expiry-engine"
          title="Engine 3: FEFO Batch Audit, Potential Unused Units & Waste Risk Detection"
        >
          <Recycle size={14} />
          <span>♻️ Expiry Intelligence</span>
        </button>

        {/* Engine 4: Redistribution Optimizer Button */}
        <button
          onClick={onOpenRedistribution}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.52rem 0.9rem',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(16, 185, 129, 0.2))',
            border: '1px solid rgba(56, 189, 248, 0.45)',
            color: '#38bdf8',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          id="btn-redistribution-engine"
          title="Engine 4: Autonomous Surplus-to-Deficit Safe Inter-Hospital Barter Optimizer"
        >
          <RefreshCw size={14} />
          <span>🔄 Redistribution</span>
        </button>

        {/* Engine 5: Priority Engine Button */}
        <button
          onClick={onOpenPriority}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.52rem 0.9rem',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(239, 68, 68, 0.2))',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            color: '#fbbf24',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          id="btn-priority-engine"
          title="Engine 5: Multi-Attribute Triage Ranking for Scarce Stock Contention"
        >
          <Scale size={14} />
          <span>⚖️ Priority Engine</span>
        </button>

        {/* Emergency Map Requisition Button */}
        {onOpenFindMedicine && (
          <FindMedicineButton onClick={onOpenFindMedicine} label="🗺️ Emergency Map" />
        )}


        {/* New Scenario Button */}
        <button
          className="btn btn-secondary"
          onClick={onNewScenario}
          disabled={loading}
          style={{ padding: '0.5rem 0.95rem', fontSize: '0.84rem' }}
          id="btn-generate-scenario"
          title="Simulate random emergency medication crisis"
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          <span>New Crisis Scenario</span>
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title={isDark ? "Switch to Clinical Light Mode" : "Switch to Night Shift Mode"}
        >
          {isDark ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="#64748b" />}
        </button>
      </div>
    </header>
  );
}
