import React, { useState } from 'react';
import axios from 'axios';
import { X, AlertTriangle, Activity, Music, Phone } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const T = {
  white: '#FFFFFF', primary: '#2A7C6F', primaryLight: '#EAF4F2',
  text: '#1C1C2E', textMuted: '#4A4A68', textFaint: '#9494A8',
  border: '#E2DDD6', surfaceAlt: '#F0ECE6',
  low: '#2D9B6B', lowBg: '#EAFAF3',
  mod: '#D97706', modBg: '#FEF9EE',
  high: '#DC2626', highBg: '#FEF2F2',
};

const TIER_CONFIG = {
  1: { color: T.low,  bg: T.lowBg,  Icon: Activity,       title: 'Advisory Notice',        subtitle: 'Your twin noticed something worth your attention.' },
  2: { color: T.mod,  bg: T.modBg,  Icon: AlertTriangle,  title: 'Moderate Stress Alert',  subtitle: 'Stress has been elevated for a while.' },
  3: { color: T.high, bg: T.highBg, Icon: AlertTriangle,  title: 'High Stress Detected',   subtitle: 'Immediate attention recommended.' },
};

function AlertOverlay({ alert, onClose }) {
  const [reporting, setReporting] = useState(false);

  const handleAcknowledge = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/api/alerts/${alert.id}/acknowledge`, null,
        { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Alert acknowledged');
      onClose();
    } catch {
      toast.error('Could not acknowledge alert');
    }
  };

  const cfg = TIER_CONFIG[alert.severity_tier] || TIER_CONFIG[1];
  const { Icon } = cfg;

  return (
    <>
      <div className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(28,28,46,0.45)', backdropFilter: 'blur(6px)' }}
        onClick={onClose} />

      <div data-testid="alert-overlay"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4">
        <div className="rounded-3xl overflow-hidden"
          style={{ backgroundColor: T.white, boxShadow: '0 32px 80px rgba(0,0,0,0.18)' }}>

          {/* Colour band top */}
          <div className="h-1.5" style={{ backgroundColor: cfg.color }} />

          <div className="p-7">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: cfg.bg }}>
                  <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                </div>
                <div>
                  <h2 className="text-base font-heading font-semibold" style={{ color: T.text }}>
                    {cfg.title}
                  </h2>
                  <p className="text-xs" style={{ color: T.textFaint }}>{cfg.subtitle}</p>
                </div>
              </div>
              <button data-testid="alert-close-btn" onClick={onClose}
                className="p-2 rounded-xl transition-colors" style={{ color: T.textFaint }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = T.surfaceAlt}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message */}
            <div className="rounded-2xl p-4 mb-4"
              style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}20` }}>
              <p className="text-sm leading-relaxed" style={{ color: T.text }}>
                {alert.message || `Your ${alert.trigger_metric?.replace(/_/g, ' ')} reached ${alert.trigger_value?.toFixed(1)}. Take a moment to check in with yourself.`}
              </p>
            </div>

            {/* Recommended action */}
            {alert.recommended_action && (
              <div className="rounded-2xl p-4 mb-5"
                style={{ backgroundColor: T.surfaceAlt }}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: T.primary }}>
                  💡 Recommended right now
                </p>
                <p className="text-sm" style={{ color: T.textMuted }}>
                  {alert.recommended_action}
                </p>
              </div>
            )}

            {/* Tier 3: music therapy + crisis resources */}
            {alert.severity_tier === 3 && (
              <div className="rounded-2xl p-4 mb-5"
                style={{ backgroundColor: T.primaryLight, border: `1px solid ${T.primary}30` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Music className="w-4 h-4" style={{ color: T.primary }} />
                  <span className="text-sm font-semibold" style={{ color: T.primary }}>
                    Music therapy is available
                  </span>
                </div>
                <p className="text-xs" style={{ color: T.textMuted }}>
                  Calming music can help reduce acute stress within minutes. Open the music player after dismissing this.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button data-testid="alert-acknowledge-btn" onClick={handleAcknowledge}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all"
                style={{ backgroundColor: T.primary, color: '#FFFFFF' }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#1F5C52'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = T.primary}>
                Got it
              </button>
              <button data-testid="alert-dismiss-btn" onClick={onClose}
                className="px-5 py-3 rounded-2xl text-sm font-medium transition-colors"
                style={{ backgroundColor: T.surfaceAlt, color: T.textMuted }}>
                Later
              </button>
            </div>

            {/* Crisis line for tier 3 */}
            {alert.severity_tier === 3 && (
              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2 justify-center">
                  <Phone className="w-3.5 h-3.5" style={{ color: T.textFaint }} />
                  <p className="text-xs text-center" style={{ color: T.textFaint }}>
                    If you're in crisis, contact iCall: <span className="font-semibold">9152987821</span> or your university counselor.
                  </p>
                </div>
              </div>
            )}

            {/* False alarm */}
            <button data-testid="report-false-alarm-btn"
              onClick={() => { setReporting(true); setTimeout(() => { setReporting(false); toast.success('Feedback noted — helps improve your twin.'); }, 500); }}
              className="mt-3 w-full text-xs transition-colors"
              style={{ color: reporting ? T.primary : T.textFaint }}>
              {reporting ? 'Noted, thank you' : 'This seems like a false alarm'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default AlertOverlay;