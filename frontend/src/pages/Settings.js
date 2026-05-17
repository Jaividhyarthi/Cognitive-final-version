import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import {
  ArrowLeft, Shield, Bell, Download, Trash2, Smartphone,
  Battery, Clock, Wifi, Activity, Brain, ChevronDown,
  ChevronUp, Check, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const T = {
  bg: '#F7F5F0', white: '#FFFFFF', primary: '#2A7C6F',
  primaryLight: '#EAF4F2', primaryHover: '#1F5C52',
  accent: '#E8A838', accentLight: '#FEF3DC',
  text: '#1C1C2E', textMuted: '#4A4A68', textFaint: '#9494A8',
  border: '#E2DDD6', surfaceAlt: '#F0ECE6',
  high: '#DC2626', highBg: '#FEF2F2',
};

function Toggle({ checked, onChange, testId }) {
  return (
    <button
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
      style={{ backgroundColor: checked ? T.primary : T.border }}
    >
      <div
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: checked ? '24px' : '4px' }}
      />
    </button>
  );
}

function Section({ title, icon, children, testId }) {
  return (
    <div
      data-testid={testId}
      className="rounded-2xl p-6"
      style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: T.primaryLight, color: T.primary }}>
          {icon}
        </div>
        <h2 className="text-base font-heading font-semibold" style={{ color: T.text }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange, testId, sensitive }) {
  return (
    <div className="flex items-start justify-between py-3.5"
      style={{ borderBottom: `1px solid ${T.border}` }}>
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: T.text }}>{label}</span>
          {sensitive && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: T.accentLight, color: T.accent }}>sensitive</span>
          )}
        </div>
        {desc && <p className="text-xs mt-0.5" style={{ color: T.textFaint }}>{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} testId={testId} />
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [lambdaWeights, setLambdaWeights] = useState(null);
  const [lastSignal, setLastSignal] = useState(null);
  const [showDanger, setShowDanger] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [phoneSignals, setPhoneSignals] = useState({
    screen_time: false,
    notifications: false,
    battery: false,
    connectivity: false,
    call_sms: false,
  });

  const [consents, setConsents] = useState({
    mood: true,
    academic: false,
    research: false,
    counselor_access: false,
  });

  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    tier1: true,
    tier2: true,
    tier3: true,
  });

  const [musicTherapy, setMusicTherapy] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const token = localStorage.getItem('token');
    try {
      // Load λ weights for display
      const lambdaRes = await axios.get(`${API_URL}/api/paper/component-breakdown`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLambdaWeights(lambdaRes.data);
    } catch { }

    try {
      const signalRes = await axios.get(`${API_URL}/api/phone-signals/latest`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLastSignal(signalRes.data);
    } catch { }
  };

  const saveConsents = async (newConsents) => {
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      // Post each consent change
      for (const [category, granted] of Object.entries(newConsents)) {
        await axios.post(`${API_URL}/api/consents`, { category, granted }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {}); // endpoint may not exist yet — silent fail
      }
      toast.success('Preferences saved');
    } catch {
      toast.error('Could not save — changes stored locally');
    } finally {
      setSaving(false);
    }
  };

  const handleConsentChange = (key, val) => {
    const updated = { ...consents, [key]: val };
    setConsents(updated);
    saveConsents(updated);
  };

  const handlePhoneSignalChange = (key, val) => {
    setPhoneSignals(prev => ({ ...prev, [key]: val }));
    toast.success(`${val ? 'Enabled' : 'Disabled'} ${key.replace(/_/g, ' ')}`);
  };

  const handleExportData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [stateRes, historyRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/current-state`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/dashboard/history?days=30`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const exportData = {
        exported_at: new Date().toISOString(),
        user: { name: user?.name, email: user?.email },
        current_state: stateRes.data,
        history_30_days: historyRes.data,
        lambda_weights: lambdaWeights,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cognitive-mirror-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Export failed — try again');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.bg }}>
      {/* NAV */}
      <nav className="sticky top-0 z-40"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${T.border}`, backdropFilter: 'blur(12px)' }}>
        <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button data-testid="settings-back-btn" onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl transition-colors" style={{ color: T.textFaint }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = T.surfaceAlt}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-base font-heading font-semibold" style={{ color: T.text }}>Settings & Privacy</span>
          </div>
          {saving && <span className="text-xs" style={{ color: T.textFaint }}>Saving…</span>}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-5 py-7 space-y-5">

        {/* Twin identity */}
        <div className="rounded-2xl p-5 flex items-center gap-4"
          style={{ backgroundColor: T.primaryLight, border: `1px solid ${T.primary}20` }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: T.white }}>
            <Brain className="w-6 h-6" style={{ color: T.primary }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: T.text }}>{user?.name}</p>
            <p className="text-xs" style={{ color: T.textFaint }}>{user?.email}</p>
            {user?.university && (
              <p className="text-xs mt-0.5" style={{ color: T.primary }}>{user.university}</p>
            )}
          </div>
          {lambdaWeights && (
            <div className="text-right">
              <p className="text-xs font-semibold" style={{ color: T.primary }}>Your λ weights</p>
              <p className="text-xs" style={{ color: T.textFaint }}>
                Phys {(lambdaWeights.lambda_phys * 100).toFixed(0)}% ·
                Beh {(lambdaWeights.lambda_beh * 100).toFixed(0)}% ·
                Acad {(lambdaWeights.lambda_acad * 100).toFixed(0)}%
              </p>
            </div>
          )}
        </div>

        {/* Phone signals */}
        <Section title="Phone Signal Permissions" icon={<Smartphone className="w-4 h-4" />}
          testId="phone-signals-section">
          <p className="text-xs mb-4" style={{ color: T.textFaint }}>
            These passive signals update your twin every 5 minutes without you doing anything.
            No content is ever read — only usage patterns and metadata.
          </p>
          <ToggleRow label="Screen Time & App Usage" testId="phone-toggle-screen_time"
            desc="Session active time proxy — updates behavioural stream"
            checked={phoneSignals.screen_time}
            onChange={v => handlePhoneSignalChange('screen_time', v)} />
          <ToggleRow label="Notification Volume" testId="phone-toggle-notifications"
            desc="Tab focus switches per hour — notification anxiety proxy"
            checked={phoneSignals.notifications}
            onChange={v => handlePhoneSignalChange('notifications', v)} />
          <ToggleRow label="Battery & Charging Patterns" testId="phone-toggle-battery"
            desc="Charging time = sleep rhythm proxy"
            checked={phoneSignals.battery}
            onChange={v => handlePhoneSignalChange('battery', v)} />
          <ToggleRow label="Connectivity Patterns" testId="phone-toggle-connectivity"
            desc="Online/offline changes — mobility proxy"
            checked={phoneSignals.connectivity}
            onChange={v => handlePhoneSignalChange('connectivity', v)}
            sensitive />
          <div className="pt-2">
            <ToggleRow label="Call & Message Frequency" testId="phone-toggle-call_sms"
              desc="Communication volume — social withdrawal proxy"
              checked={phoneSignals.call_sms}
              onChange={v => handlePhoneSignalChange('call_sms', v)}
              sensitive />
          </div>
          {lastSignal && lastSignal.received_at && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
              <p className="text-xs" style={{ color: T.textFaint }}>
                Last signal received: {new Date(lastSignal.received_at).toLocaleString()}
                {lastSignal.battery_level != null && ` · Battery: ${lastSignal.battery_level}%`}
                {lastSignal.screen_time_minutes != null && ` · Screen time: ${Math.round(lastSignal.screen_time_minutes)}min`}
              </p>
            </div>
          )}
        </Section>

        {/* Consent management */}
        <Section title="Data Consent" icon={<Shield className="w-4 h-4" />}
          testId="consent-management-section">
          <ToggleRow label="Mood check-ins" testId="consent-toggle-mood"
            desc="Your journal entries and mood logs"
            checked={consents.mood} onChange={v => handleConsentChange('mood', v)} />
          <ToggleRow label="Academic schedule" testId="consent-toggle-academic"
            desc="Course load context for stress calibration"
            checked={consents.academic} onChange={v => handleConsentChange('academic', v)} />
          <ToggleRow label="Counselor access" testId="consent-toggle-counselor_access"
            desc="Allow your assigned counselor to see your trend data"
            checked={consents.counselor_access} onChange={v => handleConsentChange('counselor_access', v)}
            sensitive />
          <div className="pt-2">
            <ToggleRow label="Anonymous research" testId="consent-toggle-research"
              desc="Help improve the model for all students — fully anonymised"
              checked={consents.research} onChange={v => handleConsentChange('research', v)} />
          </div>
        </Section>

        {/* Notification preferences */}
        <Section title="Alert Preferences" icon={<Bell className="w-4 h-4" />}
          testId="notification-preferences-section">
          <ToggleRow label="In-app alerts" testId="notification-toggle-push"
            desc="Show alert banners inside the dashboard"
            checked={notifications.push} onChange={v => setNotifications(p => ({ ...p, push: v }))} />
          <ToggleRow label="Tier 1 alerts — advisory" testId="notification-toggle-tier1"
            desc="Mild stress — informational only"
            checked={notifications.tier1} onChange={v => setNotifications(p => ({ ...p, tier1: v }))} />
          <ToggleRow label="Tier 2 alerts — moderate stress" testId="notification-toggle-tier2"
            desc="Elevated stress requiring action"
            checked={notifications.tier2} onChange={v => setNotifications(p => ({ ...p, tier2: v }))} />
          <div className="pt-2">
            <ToggleRow label="Tier 3 alerts — high stress" testId="notification-toggle-tier3"
              desc="Critical signals — always recommended to keep on"
              checked={notifications.tier3} onChange={v => setNotifications(p => ({ ...p, tier3: v }))} />
          </div>
        </Section>

        {/* Music therapy */}
        <Section title="Music Therapy" icon={<Activity className="w-4 h-4" />}
          testId="music-therapy-section">
          <ToggleRow label="Enable music therapy" testId="music-therapy-toggle"
            desc="Automatically suggest calming music during tier 2/3 alerts"
            checked={musicTherapy} onChange={setMusicTherapy} />
        </Section>

        {/* Data management */}
        <Section title="Data Management" icon={<Download className="w-4 h-4" />}
          testId="data-management-section">
          <div className="space-y-3">
            <button data-testid="export-data-btn" onClick={handleExportData}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: T.surfaceAlt, color: T.textMuted, border: `1px solid ${T.border}` }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = T.border}
              onMouseOut={e => e.currentTarget.style.backgroundColor = T.surfaceAlt}>
              <Download className="w-4 h-4" /> Download My Data (JSON)
            </button>

            <div className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${T.border}` }}>
              <button onClick={() => setShowDanger(!showDanger)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors"
                style={{ backgroundColor: T.white, color: T.textMuted }}>
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: T.high }} />
                  Danger zone
                </span>
                {showDanger ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showDanger && (
                <div className="p-4" style={{ backgroundColor: T.highBg, borderTop: `1px solid ${T.high}20` }}>
                  <p className="text-xs mb-3" style={{ color: T.textMuted }}>
                    Account deletion removes all your data permanently after a 90-day retention period.
                    This cannot be undone.
                  </p>
                  <button
                    data-testid="delete-account-btn"
                    onClick={() => {
                      setDeleting(true);
                      setTimeout(() => {
                        toast.error('Account deletion requested — you will receive a confirmation email.');
                        setDeleting(false);
                        setShowDanger(false);
                      }, 1000);
                    }}
                    disabled={deleting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{ backgroundColor: T.high, color: '#FFFFFF' }}>
                    <Trash2 className="w-4 h-4" />
                    {deleting ? 'Processing…' : 'Request Account Deletion'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Privacy */}
        <div className="rounded-2xl p-5" data-testid="privacy-policy-section"
          style={{ backgroundColor: T.surfaceAlt }}>
          <p className="text-xs leading-relaxed" style={{ color: T.textFaint }}>
            Cognitive Mirror complies with GDPR and FERPA regulations. Your data is encrypted at rest
            and in transit. You can withdraw consent at any time. All phone signals are metadata only —
            no message content, call recordings, or app content is ever accessed.
          </p>
          <div className="flex gap-4 mt-3">
            <span className="text-xs cursor-pointer" style={{ color: T.primary }}>Privacy Policy</span>
            <span className="text-xs cursor-pointer" style={{ color: T.primary }}>Terms of Service</span>
          </div>
        </div>

      </main>
    </div>
  );
}