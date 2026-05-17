import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import {
  Brain, Bell, Settings, TrendingUp, TrendingDown, Minus,
  Music, LogOut, RefreshCw, Zap, ChevronRight, Info
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts';
import MusicPlayer from '../components/MusicPlayer';
import AlertOverlay from '../components/AlertOverlay';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const T = {
  bg: '#F7F5F0', white: '#FFFFFF', primary: '#2A7C6F',
  primaryLight: '#EAF4F2', primaryHover: '#1F5C52',
  accent: '#E8A838', accentLight: '#FEF3DC',
  text: '#1C1C2E', textMuted: '#4A4A68', textFaint: '#9494A8',
  border: '#E2DDD6', surfaceAlt: '#F0ECE6',
  low: '#2D9B6B', lowBg: '#EAFAF3',
  mod: '#D97706', modBg: '#FEF9EE',
  high: '#DC2626', highBg: '#FEF2F2',
};

const METRIC_LABELS = {
  stress_level: {
    fn: v => v < 30 ? { label:'Low', color:T.low, bg:T.lowBg }
           : v < 60 ? { label:'Moderate', color:T.mod, bg:T.modBg }
           : v < 80 ? { label:'High', color:T.high, bg:T.highBg }
           :          { label:'Very High', color:'#991B1B', bg:T.highBg },
    title: 'Stress Level',
    note: v => v < 30 ? 'Feeling calm and composed'
             : v < 60 ? 'Some tension — manageable'
             : v < 80 ? 'Elevated — consider a break'
             : 'Critically high — take action now',
  },
  fatigue_index: {
    fn: v => v < 35 ? { label:'Rested', color:T.low, bg:T.lowBg }
           : v < 60 ? { label:'Mild fatigue', color:T.mod, bg:T.modBg }
           : v < 80 ? { label:'Fatigued', color:T.high, bg:T.highBg }
           :          { label:'Exhausted', color:'#991B1B', bg:T.highBg },
    title: 'Fatigue Index',
    note: v => v < 35 ? 'Energy levels are good'
             : v < 60 ? 'Slightly drained — stay hydrated'
             : 'Rest when you can',
  },
  emotional_stability: {
    fn: v => v >= 70 ? { label:'Stable', color:T.low, bg:T.lowBg }
           : v >= 45 ? { label:'Fluctuating', color:T.mod, bg:T.modBg }
           :           { label:'Unstable', color:T.high, bg:T.highBg },
    title: 'Emotional Stability',
    note: v => v >= 70 ? 'Emotionally grounded today'
             : v >= 45 ? 'Some emotional ups and downs'
             : 'Mood is quite variable — be gentle with yourself',
  },
  cognitive_load: {
    fn: v => v < 40 ? { label:'Clear', color:T.low, bg:T.lowBg }
           : v < 65 ? { label:'Busy', color:T.mod, bg:T.modBg }
           :          { label:'Overloaded', color:T.high, bg:T.highBg },
    title: 'Cognitive Load',
    note: v => v < 40 ? 'Mind is clear and focused'
             : v < 65 ? 'Mentally occupied — take short breaks'
             : 'Overloaded — prioritise and delegate',
  },
  burnout_risk: {
    fn: v => v < 30 ? { label:'Low risk', color:T.low, bg:T.lowBg }
           : v < 60 ? { label:'Moderate', color:T.mod, bg:T.modBg }
           :          { label:'High risk', color:T.high, bg:T.highBg },
    title: 'Burnout Risk',
    note: v => v < 30 ? 'Sustainable pace'
             : v < 60 ? 'Watch your workload'
             : 'Burnout warning — reduce load',
  },
  crisis_risk: {
    fn: v => v < 20 ? { label:'Minimal', color:T.low, bg:T.lowBg }
           : v < 50 ? { label:'Low', color:T.mod, bg:T.modBg }
           :          { label:'Elevated', color:T.high, bg:T.highBg },
    title: 'Crisis Risk',
    note: () => 'Non-diagnostic indicator only',
  },
};

function buildSummary(state, history) {
  if (!state) return "Your twin is still calibrating — check back shortly.";
  const s = state.stress_level;
  const f = state.fatigue_index;
  const es = state.emotional_stability;
  const dayAgo = history?.find(h => {
    const diff = (Date.now() - new Date(h.timestamp).getTime()) / (1000 * 60 * 60);
    return diff >= 20 && diff <= 28;
  });
  const trend = dayAgo ? s - dayAgo.stress_level : 0;
  const trendPhrase = Math.abs(trend) < 5 ? 'about the same as yesterday'
    : trend > 0 ? `up ${Math.round(trend)} points since yesterday`
    : `down ${Math.round(Math.abs(trend))} points since yesterday`;
  if (s < 30 && f < 35) return `You're in good shape today — stress is low and energy is solid. Keep it up.`;
  if (s >= 75) return `Stress is quite high right now (${Math.round(s)}/100), ${trendPhrase}. Your twin recommends a short break before continuing.`;
  if (f >= 75) return `Fatigue is the main signal today — your body is asking for rest. Stress is ${s < 50 ? 'manageable' : 'also elevated'}.`;
  if (es < 45) return `Emotional stability is low today — you might feel more reactive than usual. Stress is ${trendPhrase}.`;
  return `Stress is ${s < 50 ? 'moderate' : 'elevated'} at ${Math.round(s)}/100, ${trendPhrase}. ${f > 55 ? 'Fatigue is adding to the load.' : 'Energy is holding steady.'}`;
}

function buildIntervention(state) {
  if (!state) return null;
  const s = state.stress_level;
  const f = state.fatigue_index;
  const es = state.emotional_stability;
  if (s >= 70) return { icon: '🌬️', title: 'Try box breathing', desc: '4 counts in, hold 4, out 4. Takes 2 minutes and measurably reduces acute stress.', color: T.highBg, border: T.high };
  if (f >= 65) return { icon: '😴', title: 'Rest signal detected', desc: 'Your fatigue index is high. A 20-minute nap or early bedtime tonight will have the biggest impact.', color: T.modBg, border: T.mod };
  if (es < 50) return { icon: '📓', title: 'Journal for 5 minutes', desc: 'Emotional instability often responds well to writing. Externalising thoughts reduces their weight.', color: T.primaryLight, border: T.primary };
  if (s >= 50) return { icon: '🚶', title: 'Take a short walk', desc: 'Even 10 minutes outside reduces cortisol. Your stress has been moderate for a while.', color: T.modBg, border: T.mod };
  return { icon: '✅', title: "You're doing well", desc: "No immediate intervention needed. Keep your current routine — it's working.", color: T.lowBg, border: T.low };
}

function LightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const time = new Date(label);
  const timeStr = isNaN(time) ? label : time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
      <p style={{ color: T.textFaint }}>{timeStr}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color || T.text }}>
          {p.name}: {p.value?.toFixed(1)}
        </p>
      ))}
    </div>
  );
}

function MetricCard({ metricKey, value, sparkline, trend, onExplain }) {
  const cfg = METRIC_LABELS[metricKey];
  if (!cfg) return null;
  const { label, color, bg } = cfg.fn(value);
  const trendColor = trend > 2 ? T.high : trend < -2 ? T.low : T.textFaint;
  const TrendIcon = trend > 2 ? TrendingUp : trend < -2 ? TrendingDown : Minus;
  const pct = Math.min(100, value);

  return (
    <div className="rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ backgroundColor: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: T.textMuted }}>{cfg.title}</span>
        <div className="flex items-center gap-1.5">
          <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
          <button onClick={() => onExplain(metricKey, value)}
            className="p-1 rounded-lg transition-colors"
            style={{ color: T.textFaint }}
            onMouseOver={e => e.currentTarget.style.color = T.primary}
            onMouseOut={e => e.currentTarget.style.color = T.textFaint}
            title="Explain this metric">
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
        style={{ backgroundColor: bg, color }}>
        {label}
      </div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-2xl font-heading font-semibold" style={{ color: T.text }}>
            {value.toFixed(0)}
            <span className="text-sm font-normal ml-1" style={{ color: T.textFaint }}>/100</span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: T.textFaint }}>{cfg.note(value)}</div>
        </div>
        {sparkline?.length > 1 && (
          <div className="w-16 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline}>
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: T.surfaceAlt }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ExplainModal({ metricKey, value, factors, onClose }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const cfg = METRIC_LABELS[metricKey];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const factorsStr = factors?.map(f => f.factor).join(', ') || '';
    axios.get(`${API_URL}/api/ai/explain`, {
      params: { metric: metricKey?.replace('_', ' '), value, contributing_factors: factorsStr },
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      setText(typeof res.data.explanation === 'string'
        ? res.data.explanation
        : JSON.stringify(res.data.explanation));
    }).catch(() => {
      setText(`Your ${cfg?.title?.toLowerCase() || metricKey} is currently at ${value.toFixed(0)}/100. This is based on recent patterns in your data.`);
    }).finally(() => setLoading(false));
  }, [metricKey, value]);

  return (
    <>
      <div className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(28,28,46,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4">
        <div className="rounded-3xl p-6" style={{ backgroundColor: T.white, boxShadow: '0 24px 64px rgba(0,0,0,0.14)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-heading font-semibold" style={{ color: T.text }}>
              {cfg?.title || metricKey}
            </h3>
            <button onClick={onClose} className="text-xs px-3 py-1 rounded-lg"
              style={{ backgroundColor: T.surfaceAlt, color: T.textMuted }}>Close</button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <RefreshCw className="w-4 h-4 animate-spin" style={{ color: T.primary }} />
              <span className="text-sm" style={{ color: T.textFaint }}>Generating explanation…</span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>{text}</p>
          )}
          <p className="text-xs mt-4" style={{ color: T.textFaint }}>
            Wellbeing support tool — not a clinical diagnosis.
          </p>
        </div>
      </div>
    </>
  );
}

function StudentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [currentState, setCurrentState] = useState(null);
  const [history, setHistory] = useState([]);
  const [prediction, setPrediction] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [explainMetric, setExplainMetric] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (user && !user.onboarding_completed) {
      navigate('/onboarding');
      return;
    }
    fetchAll();
  }, [user]);

  const fetchAll = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const [stateRes, historyRes, predictionRes, interventionsRes, alertsRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/current-state`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/dashboard/history?days=7`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/dashboard/prediction?hours=24`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/interventions`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/alerts`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setCurrentState(stateRes.data);
      setHistory(historyRes.data);
      setPrediction(predictionRes.data);
      setInterventions(interventionsRes.data);
      setAlerts(alertsRes.data);
      setLastUpdated(new Date());
      const unacked = alertsRes.data.find(a => !a.acknowledged);
      if (unacked) setActiveAlert(unacked);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => { setRefreshing(true); fetchAll(); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: T.bg }}>
      <div className="text-center">
        <Brain className="w-10 h-10 mx-auto mb-4 animate-pulse" style={{ color: T.primary }} />
        <p style={{ color: T.textMuted }}>Loading your Digital Twin…</p>
      </div>
    </div>
  );

  const sparkline7 = (key) => history.slice(-14).map(h => ({
    v: key === 'burnout_risk' || key === 'crisis_risk'
      ? (h[key] || 0) * 100 : (h[key] || 0)
  }));

  const dayAgoState = history.find(h => {
    const diff = (Date.now() - new Date(h.timestamp).getTime()) / (1000 * 60 * 60);
    return diff >= 20 && diff <= 28;
  });

  const trendFor = (key) => {
    if (!dayAgoState || !currentState) return 0;
    const curr = key === 'burnout_risk' || key === 'crisis_risk'
      ? (currentState[key] || 0) * 100 : (currentState[key] || 0);
    const prev = key === 'burnout_risk' || key === 'crisis_risk'
      ? (dayAgoState[key] || 0) * 100 : (dayAgoState[key] || 0);
    return curr - prev;
  };

  const predictionData = prediction.map(p => ({
    timestamp: p.timestamp,
    stress: p.stress_level,
    upper: Math.min(100, p.stress_level + (1 - p.confidence) * 20),
    lower: Math.max(0, p.stress_level - (1 - p.confidence) * 20),
  }));

  const summary = buildSummary(currentState, history);
  const intervention = buildIntervention(currentState);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const unreadCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ backgroundColor: T.bg }}>

      {/* NAV */}
      <nav className="sticky top-0 z-40"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${T.border}`, backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Brain className="w-6 h-6" style={{ color: T.primary }} />
            <span className="text-base font-heading font-semibold" style={{ color: T.text }}>Cognitive Mirror</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleRefresh}
              className="p-2 rounded-xl transition-colors" style={{ color: T.textFaint }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = T.surfaceAlt}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button data-testid="nav-notifications-btn"
              className="relative p-2 rounded-xl transition-colors" style={{ color: T.textFaint }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = T.surfaceAlt}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                  style={{ backgroundColor: T.high }} />
              )}
            </button>
            <button data-testid="nav-twin-brain-btn" onClick={() => navigate('/twin-brain')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: T.primaryLight, color: T.primary, border: `1px solid ${T.primary}30` }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#D0EDE9'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = T.primaryLight}>
              <Zap className="w-3.5 h-3.5" /> My Twin
            </button>
            <button onClick={() => navigate('/twin-profile')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: T.surfaceAlt, color: T.textMuted, border: `1px solid ${T.border}` }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = T.border}
              onMouseOut={e => e.currentTarget.style.backgroundColor = T.surfaceAlt}>
              👤 Profile
            </button>
            <button data-testid="nav-settings-btn" onClick={() => navigate('/settings')}
              className="p-2 rounded-xl transition-colors" style={{ color: T.textFaint }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = T.surfaceAlt}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <Settings className="w-5 h-5" />
            </button>
            <button data-testid="nav-logout-btn" onClick={logout}
              className="p-2 rounded-xl transition-colors flex items-center gap-1 text-sm"
              style={{ color: T.textFaint }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = T.surfaceAlt}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-5 py-7">

        {/* HEADER + SUMMARY */}
        <div data-testid="dashboard-welcome-card" className="rounded-2xl p-6 mb-6"
          style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-heading font-light mb-1" style={{ color: T.text }}>
                {greeting}, <span className="font-semibold">{user?.name?.split(' ')[0]}</span>
              </h1>
              <p className="text-base leading-relaxed" style={{ color: T.textMuted }}>{summary}</p>
              {lastUpdated && (
                <p className="text-xs mt-2" style={{ color: T.textFaint }}>
                  Last updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            {currentState && (() => {
              const score = Math.round((
                (100 - currentState.stress_level) +
                (100 - currentState.fatigue_index) +
                currentState.emotional_stability +
                (100 - currentState.cognitive_load) +
                (100 - currentState.burnout_risk * 100)
              ) / 5);
              const scoreColor = score >= 65 ? T.low : score >= 40 ? T.mod : T.high;
              return (
                <div className="flex-shrink-0 text-center px-5 py-4 rounded-2xl"
                  style={{ backgroundColor: T.surfaceAlt }}>
                  <div className="text-4xl font-heading font-semibold" style={{ color: scoreColor }}>{score}</div>
                  <div className="text-xs mt-1" style={{ color: T.textFaint }}>Wellbeing Score</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: scoreColor }}>
                    {score >= 65 ? 'Good' : score >= 40 ? 'Fair' : 'Needs attention'}
                  </div>
                </div>
              );
            })()}
          </div>

          {unreadCount > 0 && alerts[0] && (
            <div className="mt-4 flex items-start gap-3 p-3 rounded-xl"
              style={{
                backgroundColor: alerts[0].severity_tier >= 3 ? T.highBg : alerts[0].severity_tier === 2 ? T.modBg : T.lowBg,
                border: `1px solid ${alerts[0].severity_tier >= 3 ? T.high : alerts[0].severity_tier === 2 ? T.mod : T.low}30`,
              }}>
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: alerts[0].severity_tier >= 3 ? T.high : alerts[0].severity_tier === 2 ? T.mod : T.low }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: T.text }}>{alerts[0].message}</p>
                {alerts[0].recommended_action && (
                  <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                    💡 {alerts[0].recommended_action}
                  </p>
                )}
              </div>
              <button onClick={() => setActiveAlert(alerts[0])}
                className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: T.primary }}>
                Details <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* INTERVENTION CARD */}
        {intervention && (
          <div className="rounded-2xl p-5 mb-6 flex items-start gap-4"
            style={{ backgroundColor: intervention.color, border: `1.5px solid ${intervention.border}30` }}>
            <span className="text-2xl flex-shrink-0">{intervention.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-0.5" style={{ color: T.text }}>{intervention.title}</p>
              <p className="text-sm" style={{ color: T.textMuted }}>{intervention.desc}</p>
            </div>
            <button onClick={() => setShowMusicPlayer(true)}
              className="flex-shrink-0 p-2 rounded-xl transition-colors"
              style={{ backgroundColor: T.white, color: T.primary }}
              title="Open music therapy">
              <Music className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {currentState && Object.keys(METRIC_LABELS).map(key => {
            const raw = key === 'burnout_risk' || key === 'crisis_risk'
              ? (currentState[key] || 0) * 100
              : (currentState[key] || 0);
            return (
              <MetricCard
                key={key}
                metricKey={key}
                value={raw}
                sparkline={sparkline7(key)}
                trend={trendFor(key)}
                onExplain={(k, v) => setExplainMetric({ key: k, value: v })}
              />
            );
          })}
        </div>

        {/* CHARTS ROW */}
        <div className="grid lg:grid-cols-2 gap-5 mb-6">
          <div data-testid="prediction-panel" className="rounded-2xl p-6"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
            <div className="mb-4">
              <h2 className="text-base font-heading font-semibold" style={{ color: T.text }}>
                24-Hour Stress Forecast
              </h2>
              <p className="text-xs mt-0.5" style={{ color: T.textFaint }}>
                Shaded area = confidence interval. Widens as uncertainty grows with time.
              </p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={predictionData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.accent} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.accent} stopOpacity={0.08} />
                    <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.surfaceAlt} />
                <XAxis dataKey="timestamp" stroke={T.border}
                  tick={{ fill: T.textFaint, fontSize: 10 }}
                  tickFormatter={v => { const d = new Date(v); return isNaN(d) ? v : d.getHours() + ':00'; }} />
                <YAxis stroke={T.border} tick={{ fill: T.textFaint, fontSize: 10 }} domain={[0, 100]} />
                <ReferenceLine y={60} stroke={T.mod} strokeDasharray="4 4" strokeOpacity={0.6}
                  label={{ value: 'moderate', position: 'right', fontSize: 9, fill: T.mod }} />
                <Tooltip content={<LightTooltip />} />
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandGrad)" />
                <Area type="monotone" dataKey="stress" name="Predicted stress"
                  stroke={T.accent} fill="url(#confGrad)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="lower" stroke="none" fill={T.bg} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div data-testid="interventions-panel" className="rounded-2xl p-6"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-heading font-semibold" style={{ color: T.text }}>
                  Recent Interventions
                </h2>
                <p className="text-xs mt-0.5" style={{ color: T.textFaint }}>Actions logged by your twin</p>
              </div>
              <button data-testid="music-therapy-toggle" onClick={() => setShowMusicPlayer(!showMusicPlayer)}
                className="p-2 rounded-xl transition-colors"
                style={{ backgroundColor: T.primaryLight, color: T.primary }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#D0EDE9'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = T.primaryLight}>
                <Music className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
              {interventions.length === 0 ? (
                <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: T.surfaceAlt }}>
                  <p className="text-sm" style={{ color: T.textFaint }}>
                    No interventions yet. Your twin will suggest actions when metrics need attention.
                  </p>
                </div>
              ) : interventions.map((iv, i) => {
                const statusCfg = {
                  completed: { bg: T.lowBg, color: T.low },
                  dismissed: { bg: T.surfaceAlt, color: T.textFaint },
                  'in-progress': { bg: T.accentLight, color: T.accent },
                }[iv.status] || { bg: T.modBg, color: T.mod };
                return (
                  <div key={i} className="rounded-xl p-4"
                    style={{ backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: T.text }}>{iv.type}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                        {iv.status}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: T.textFaint }}>
                      Tier {iv.severity_tier} · {new Date(iv.triggered_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {iv.outcome_delta != null && (
                        <span style={{ color: iv.outcome_delta < 0 ? T.low : T.high }}>
                          {' '}· {iv.outcome_delta > 0 ? '+' : ''}{iv.outcome_delta.toFixed(1)} stress pts
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CONTRIBUTING FACTORS */}
        {currentState?.contributing_factors?.length > 0 && (
          <div data-testid="contributing-factors" className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
            <h2 className="text-base font-heading font-semibold mb-4" style={{ color: T.text }}>
              What's driving your state right now
            </h2>
            <div className="space-y-3">
              {currentState.contributing_factors.map((f, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm" style={{ color: T.textMuted }}>{f.factor}</span>
                    <span className="text-xs font-semibold" style={{ color: T.primary }}>
                      {(f.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ backgroundColor: T.surfaceAlt }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${f.weight * 100}%`, backgroundColor: T.primary }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7-DAY HISTORY */}
        {history.length > 0 && (
          <div className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
            <h2 className="text-base font-heading font-semibold mb-1" style={{ color: T.text }}>
              7-Day Stress History
            </h2>
            <p className="text-xs mb-4" style={{ color: T.textFaint }}>
              Your stress pattern over the past week
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={history.slice(-56).map(h => ({ t: h.timestamp, v: h.stress_level }))}
                margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={T.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.surfaceAlt} vertical={false} />
                <XAxis dataKey="t" tick={{ fill: T.textFaint, fontSize: 9 }}
                  tickFormatter={v => { const d = new Date(v); return isNaN(d) ? '' : `${d.getMonth() + 1}/${d.getDate()}`; }}
                  interval={7} />
                <YAxis domain={[0, 100]} tick={{ fill: T.textFaint, fontSize: 9 }} />
                <Tooltip content={<LightTooltip />} />
                <Area type="monotone" dataKey="v" name="Stress" stroke={T.primary}
                  fill="url(#histGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* DISCLAIMER */}
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: T.surfaceAlt }}>
          <p className="text-xs" style={{ color: T.textFaint }}>
            Cognitive Mirror is a non-diagnostic wellbeing support tool. It does not replace professional mental health services.
          </p>
        </div>
      </main>

      {/* MOBILE NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex z-30"
        style={{ backgroundColor: T.white, borderTop: `1px solid ${T.border}` }}>
        {[
          { label: 'Dashboard', path: '/dashboard', active: true },
          { label: 'Twin Brain', path: '/twin-brain', active: false },
          { label: 'Profile', path: '/twin-profile', active: false },
          { label: 'Settings', path: '/settings', active: false },
        ].map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            className="flex-1 py-4 text-center text-xs font-medium transition-colors"
            style={{
              color: item.active ? T.primary : T.textFaint,
              borderTop: item.active ? `2px solid ${T.primary}` : '2px solid transparent',
            }}>
            {item.label}
          </button>
        ))}
      </div>

      {showMusicPlayer && <MusicPlayer onClose={() => setShowMusicPlayer(false)} />}
      {activeAlert && <AlertOverlay alert={activeAlert} onClose={() => setActiveAlert(null)} />}
      {explainMetric && (
        <ExplainModal
          metricKey={explainMetric.key}
          value={explainMetric.value}
          factors={currentState?.contributing_factors}
          onClose={() => setExplainMetric(null)}
        />
      )}
    </div>
  );
}

export default StudentDashboard;