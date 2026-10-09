import React from 'react';
import { MapPin, AlertTriangle, CheckCircle2, TrendingUp, Package } from 'lucide-react';

export default function HospitalCard({ hospital, isRequester, isDonor }) {
  const surpluses = hospital.surpluses || {};
  const statusCounts = hospital.status_counts || { critical: 0, warning: 0, ok: 0 };

  // Determine card highlight styling
  let cardBorder = 'var(--border-card)';
  if (isRequester) cardBorder = 'rgba(239, 68, 68, 0.7)';
  else if (isDonor) cardBorder = 'rgba(16, 185, 129, 0.7)';

  return (
    <div 
      className="med-card"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        border: `1px solid ${cardBorder}`,
        position: 'relative',
        borderRadius: 'var(--radius-lg)'
      }}
    >
      {/* Role Accent Ribbon */}
      {isRequester && (
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
          color: '#ffffff',
          fontSize: '0.68rem',
          fontWeight: '800',
          padding: '0.25rem 0.85rem',
          borderBottomLeftRadius: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem'
        }}>
          <AlertTriangle size={12} />
          Crisis Requester
        </div>
      )}
      {isDonor && (
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          background: 'linear-gradient(135deg, #10b981, #047857)',
          color: '#ffffff',
          fontSize: '0.68rem',
          fontWeight: '800',
          padding: '0.25rem 0.85rem',
          borderBottomLeftRadius: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem'
        }}>
          <CheckCircle2 size={12} />
          Selected Donor
        </div>
      )}

      {/* Hospital Identity Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.18rem', fontWeight: '800', color: 'var(--text-primary)', flex: '1', minWidth: '200px' }}>
            {hospital.name}
          </h2>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            {hospital.type && (
              <span style={{
                fontSize: '0.68rem',
                fontWeight: '700',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                background: hospital.type === 'Government' ? 'var(--tag-govt-bg)' : 'var(--tag-pvt-bg)',
                color: hospital.type === 'Government' ? 'var(--tag-govt-text)' : 'var(--tag-pvt-text)',
                border: `1px solid ${hospital.type === 'Government' ? 'var(--tag-govt-border)' : 'var(--tag-pvt-border)'}`
              }}>
                {hospital.type}
              </span>
            )}
            {hospital.taluk && (
              <span style={{
                fontSize: '0.68rem',
                fontWeight: '700',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                background: 'var(--tag-taluk-bg)',
                color: 'var(--tag-taluk-text)',
                border: '1px solid var(--tag-taluk-border)'
              }}>
                {hospital.taluk}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
          <MapPin size={13} color="#06b6d4" />
          <span>{hospital.location}</span>
          {hospital.distance_km != null && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '0.74rem',
              fontWeight: '700',
              color: '#06b6d4',
              background: 'rgba(6, 182, 212, 0.12)',
              padding: '0.1rem 0.45rem',
              borderRadius: '6px',
              marginLeft: '0.2rem'
            }}>
              📍 {typeof hospital.distance_km === 'number' ? hospital.distance_km.toFixed(1) : hospital.distance_km} km away
            </span>
          )}
          {hospital.latitude && hospital.longitude && (
            <span style={{ fontSize: '0.72rem', opacity: 0.75, fontFamily: 'var(--font-mono)', marginLeft: '0.25rem' }}>
              ({typeof hospital.latitude === 'number' ? hospital.latitude.toFixed(4) : hospital.latitude}°N, {typeof hospital.longitude === 'number' ? hospital.longitude.toFixed(4) : hospital.longitude}°E)
            </span>
          )}
        </div>
      </div>

      {/* Triage Status Pills */}
      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
        {statusCounts.critical > 0 && (
          <span className="badge badge-critical">
            <AlertTriangle size={12} /> {statusCounts.critical} Critical Shortage
          </span>
        )}
        {statusCounts.warning > 0 && (
          <span className="badge badge-warning">
            {statusCounts.warning} Low Stock
          </span>
        )}
        {statusCounts.critical === 0 && statusCounts.warning === 0 && (
          <span className="badge badge-optimal">
            <CheckCircle2 size={12} /> All Safe
          </span>
        )}
        {Object.keys(surpluses).length > 0 && (
          <span className="badge badge-surplus">
            <TrendingUp size={12} /> {Object.keys(surpluses).length} Surplus
          </span>
        )}
      </div>

      {/* Medical Stock Table */}
      <div style={{
        background: 'var(--table-bg)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ background: 'var(--table-header-bg)', color: 'var(--table-header-text)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '0.6rem 0.85rem', fontWeight: '700', letterSpacing: '0.02em' }}>Medicine</th>
              <th style={{ padding: '0.6rem 0.6rem', fontWeight: '700', textAlign: 'right', letterSpacing: '0.02em' }}>Stock</th>
              <th style={{ padding: '0.6rem 0.6rem', fontWeight: '700', textAlign: 'right', letterSpacing: '0.02em' }}>Min Safety</th>
              <th style={{ padding: '0.6rem 0.85rem', fontWeight: '700', textAlign: 'center', letterSpacing: '0.02em' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(hospital.inventory).map(([med, stock]) => {
              const threshold = hospital.thresholds[med] || 0;
              const isCrit = stock < threshold * 0.5;
              const isWarn = !isCrit && stock < threshold;
              const isOk = stock >= threshold;
              const surplus = stock > threshold ? stock - threshold : 0;

              // Row background highlight for critical items
              const rowBg = isCrit ? 'var(--rose-50)' : 'transparent';

              return (
                <tr 
                  key={med}
                  style={{ 
                    borderBottom: '1px solid var(--table-row-border)',
                    background: rowBg,
                    transition: 'background 0.15s ease'
                  }}
                >
                  <td style={{ padding: '0.55rem 0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {med}
                  </td>
                  <td style={{ 
                    padding: '0.55rem 0.6rem', 
                    textAlign: 'right', 
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    color: isCrit ? 'var(--stock-crit)' : isWarn ? 'var(--stock-warn)' : 'var(--stock-ok)'
                  }}>
                    {stock}
                  </td>
                  <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', color: 'var(--table-header-text)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: '600' }}>
                    {threshold}
                  </td>
                  <td style={{ padding: '0.55rem 0.85rem', textAlign: 'center' }}>
                    {isCrit && (
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.6rem',
                          borderRadius: '9999px',
                          background: 'var(--badge-crit-bg)',
                          color: 'var(--badge-crit-text)',
                          border: '1px solid var(--badge-crit-border)',
                          boxShadow: '0 0 10px rgba(239, 68, 68, 0.25)',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          letterSpacing: '0.04em'
                        }}
                      >
                        CRITICAL
                      </span>
                    )}
                    {isWarn && (
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '9999px',
                          background: 'var(--badge-warn-bg)',
                          color: 'var(--badge-warn-text)',
                          border: '1px solid var(--badge-warn-border)',
                          fontSize: '0.68rem',
                          fontWeight: '700'
                        }}
                      >
                        LOW
                      </span>
                    )}
                    {isOk && surplus > 0 && (
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.65rem',
                          borderRadius: '9999px',
                          background: 'var(--badge-surplus-bg)',
                          color: 'var(--badge-surplus-text)',
                          border: '1px solid var(--badge-surplus-border)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.74rem',
                          fontWeight: '700'
                        }}
                      >
                        +{surplus}
                      </span>
                    )}
                    {isOk && surplus === 0 && (
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '9999px',
                          background: 'var(--badge-opt-bg)',
                          color: 'var(--badge-opt-text)',
                          border: '1px solid var(--badge-opt-border)',
                          fontSize: '0.68rem',
                          fontWeight: '700'
                        }}
                      >
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Available Surpluses Preview (Bottom) */}
      {Object.keys(surpluses).length > 0 ? (
        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}>
            <Package size={13} color="#06b6d4" />
            <span>Available for peer hospital transfer:</span>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {Object.entries(surpluses).map(([med, qty]) => (
              <span 
                key={med} 
                style={{
                  fontSize: '0.74rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  background: 'var(--badge-surplus-bg)',
                  color: 'var(--badge-surplus-text)',
                  border: '1px solid var(--badge-surplus-border)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: '700'
                }}
              >
                {med}: +{qty}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 'auto' }}>
          No surplus units available for trade.
        </div>
      )}
    </div>
  );
}
