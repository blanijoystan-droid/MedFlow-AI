import React from 'react';
import { ShieldAlert, CheckCircle, XCircle, ArrowRight, HeartPulse, Scale } from 'lucide-react';

export default function PendingTradePanel({ pendingTrade, onApprove, onReject, processing }) {
  if (!pendingTrade) return null;

  const donor = pendingTrade.donor;
  const receiver = pendingTrade.receiver;
  const medicines = pendingTrade.medicines || {};
  const counterMedicines = pendingTrade.counter_medicines || {};
  const explanation = pendingTrade.explanation || "No explanation provided.";

  return (
    <div 
      className="med-card" 
      style={{
        padding: '1.75rem',
        border: '2px solid #f59e0b',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), var(--bg-card))',
        boxShadow: '0 0 35px rgba(245, 158, 11, 0.28), var(--shadow-xl)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        animation: 'slideDown 0.3s ease-out'
      }}
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.2)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Human-in-the-Loop Verification Required
              </h2>
              <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '0.25rem 0.7rem', fontWeight: '700' }}>
                ⚠️ AWAITING AUTHORIZATION
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>
              Autonomous multi-agent negotiation converged on this crisis supply reallocation. Executive clinical verification is required to proceed.
            </p>
          </div>
        </div>
      </div>

      {/* Trade Flow Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Outbound Dispatch (Donor -> Receiver) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--blue-600, #0284c7)', letterSpacing: '0.05em' }}>
            PRIMARY EMERGENCY TRANSFER
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.95rem' }}>
            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{donor}</span>
            <ArrowRight size={16} color="var(--teal-600, #0d9488)" />
            <span style={{ fontWeight: '700', color: 'var(--stock-crit)' }}>{receiver}</span>
          </div>
          <div style={{ marginTop: '0.25rem' }}>
            {Object.entries(medicines).map(([med, qty]) => (
              <div 
                key={med}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  background: 'var(--badge-surplus-bg)',
                  border: '1px solid var(--badge-surplus-border)',
                  color: 'var(--badge-surplus-text)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.88rem',
                  fontWeight: '700'
                }}
              >
                <span>📦 {qty} units of {med}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Counter Exchange (Receiver -> Donor) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--stock-ok)', letterSpacing: '0.05em' }}>
            RECIPROCAL EXCHANGE / RETURN
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.95rem' }}>
            <span style={{ fontWeight: '700', color: 'var(--stock-crit)' }}>{receiver}</span>
            <ArrowRight size={16} color="var(--stock-ok)" />
            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{donor}</span>
          </div>
          <div style={{ marginTop: '0.25rem' }}>
            {Object.keys(counterMedicines).length > 0 ? (
              Object.entries(counterMedicines).map(([med, qty]) => (
                <div 
                  key={med}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    background: 'var(--badge-opt-bg)',
                    border: '1px solid var(--badge-opt-border)',
                    color: 'var(--badge-opt-text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.88rem',
                    fontWeight: '700'
                  }}
                >
                  <span>🔄 {qty} units of {med}</span>
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Emergency unilateral transfer (Zero counter-units required)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gemini Administrator Plain English Explanation */}
      <div style={{
        padding: '1.15rem 1.35rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-card-subtle)',
        border: '1px solid var(--border-subtle)',
        borderLeftWidth: '4px',
        borderLeftColor: 'var(--teal-600, #0d9488)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--blue-600, #0284c7)', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
          <HeartPulse size={15} />
          <span>GEMINI EXPLAINER — CLINICAL & SAFETY IMPACT</span>
        </div>
        <p style={{ color: 'var(--text-primary)', fontSize: '0.92rem', lineHeight: 1.65 }}>
          {explanation}
        </p>
      </div>

      {/* Human Actions Call to Action */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '1rem'
      }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Scale size={16} color="#f59e0b" />
          <span>Approval permanently logs transaction to immutable audit ledger.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Reject Button */}
          <button
            className="btn btn-danger"
            onClick={() => onReject('Declined by medical administrator')}
            disabled={processing}
            id="btn-reject-trade"
            style={{ padding: '0.75rem 1.4rem', fontWeight: '700', cursor: processing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <XCircle size={18} />
            <span>Reject Proposal</span>
          </button>

          {/* Approve Button */}
          <button
            className="btn btn-success"
            onClick={() => onApprove()}
            disabled={processing}
            id="btn-approve-trade"
            style={{ padding: '0.75rem 1.85rem', fontSize: '0.95rem', fontWeight: '700', cursor: processing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <CheckCircle size={18} />
            <span>{processing ? 'Authorizing Dispatch...' : 'Approve & Execute Trade'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
