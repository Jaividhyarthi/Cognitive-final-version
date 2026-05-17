import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import {
  ArrowLeft, RefreshCw, Zap, Activity, FlaskConical,
  Clock, ChevronDown, Play, CheckCircle2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ── Simulation math ───────────────────────────────────────────────────────────
const SCENARIOS = {
  exam: {
    label: 'Exam Tomorrow',
    icon: '📝',
    deltas: { stress: +22, fatigue: +12, stability: -18, cognitive: +20 },
    description: 'Anticipatory anxiety elevates stress sharply. Cognitive load peaks as revision competes with worry.',
    duration: 'Peaks at ~18h, recovery over 48h'
  },
  'sleep-dep': {
    label: 'Sleep Deprivation (< 4 hrs)',
    icon: '😴',
    deltas: { stress: +18, fatigue: +35, stability: -22, cognitive: +15 },
    description: 'Sleep loss is the single strongest predictor of next-day emotional instability in your profile.',
    duration: 'Peaks at 12–16h, slow 72h recovery'
  },
  overload: {
    label: 'Academic Overload',
    icon: '📚',
    deltas: { stress: +14, fatigue: +18, stability: -12, cognitive: +25 },
    description: 'Deadline clusters accumulate cognitive load faster than single-event stress.',
    duration: 'Gradual 24–72h escalation'
  },
  isolation: {
    label: 'Social Isolation Weekend',
    icon: '🏠',
    deltas: { stress: +8, fatigue: +5, stability: -28, cognitive: +4 },
    description: 'Isolation disproportionately impacts emotional stability without raising obvious stress markers.',
    duration: 'Delayed onset at ~24h, peaks at 48h'
  },
  recovery: {
    label: 'Good Sleep + Exercise',
    icon: '🏃',
    deltas: { stress: -22, fatigue: -28, stability: +18, cognitive: -15 },
    description: 'Combined sleep quality and physical activity produce the strongest measurable recovery in your twin.',
    duration: 'Benefits visible within 8–12h'
  }
};

const INTERVENTIONS = {
  breathing: {
    label: 'Guided Breathing (4-7-8)',
    icon: '🌬️',
    effect: { stress: -14, stability: +10, duration: 2 },
    confidence: 82,
    description: 'Fast-acting. Best for acute stress spikes. Effect fully visible within 2 hours.'
  },
  break: {
    label: 'Scheduled Break (20 min)',
    icon: '☕',
    effect: { stress: -8, fatigue: -12, duration: 3 },
    confidence: 74,
    description: 'Reduces cognitive fatigue. Most effective when triggered before a study block, not during.'
  },
  sleep: {
    label: 'Sleep Hygiene Guidance',
    icon: '🌙',
    effect: { fatigue: -28, stress: -10, stability: +15, duration: 8 },
    confidence: 88,
    description: 'Highest confidence intervention in your profile. Cascading benefits across all metrics.'
  },
  music: {
    label: 'Music Therapy Session',
    icon: '🎵',
    effect: { stress: -16, stability: +12, duration: 3 },
    confidence: 79,
    description: 'Personalised to your high music receptivity profile. Most effective for moderate stress states.'
  },
  schedule: {
    label: 'Schedule Restructuring',
    icon: '📅',
    effect: { stress: -10, cognitive: -18, duration: 24 },
    confidence: 71,
    description: 'Distributes cognitive load over time. Lower immediate effect, highest sustained benefit.'
  }
};

function generateProjection(base, deltas, hours = 24) {
  const points = [];
  for (let h = 0; h <= hours; h += 2) {
    const progress = h / hours;
    const curve = Math.sin(progress * Math.PI);
    points.push({
      hour: h,
      label: `+${h}h`,
      baseline: Math.max(0, Math.min(100, base + (Math.random() - 0.5) * 4)),
      simulated: Math.max(0, Math.min(100,
        base + (deltas.stress || 0) * curve + (Math.random() - 0.5) * 3
      ))
    });
  }
  return points;
}

function generateTreatmentProjection(base, effect, hours = 12) {
  const points = [];
  for (let h = 0; h <= hours; h++) {
    const t = h / effect.duration;
    const decay = t <= 1 ? t : Math.max(0, 1 - (t - 1) * 0.3);
    const improvement = (effect.stress || 0) * decay;
    points.push({
      hour: h,
      label: `+${h}h`,
      without: Math.max(0, Math.min(100, base + (Math.random() - 0.5) * 3)),
      with: Math.max(0, Math.min(100, base + improvement + (Math.random() - 0.5) * 2))
    });
  }
  return points;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const ModuleCard = ({ icon, title, accent, children }) => (
  <div
    className="rounded-2xl p-6"
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E2DDD6',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
    }}
  >
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
        style={{ backgroundColor: accent + '20' }}
      >
        {icon}
      </div>
      <h2 className="text-base font-heading font-semibold" style={{ color: '#1C1C2E' }}>
        {title}
      </h2>
    </div>
    {children}
  </div>
);

const GaugeBar = ({ label, value, max = 100, inverted = false }) => {
  const pct = Math.min((value / max) * 100, 100);
  const effective = inverted ? 100 - pct : pct;
  const color = effective < 30 ? '#2D9B6B' : effective < 60 ? '#D97706' : '#DC2626';
  const bg = effective < 30 ? '#EAFAF3' : effective < 60 ? '#FEF9EE' : '#FEF2F2';
  const statusLabel = effective < 30 ? 'Low' : effective < 60 ? 'Moderate' : 'High';

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm" style={{ color: '#4A4A68' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: bg, color }}
          >
            {statusLabel}
          </span>
          <span className="text-sm font-semibold" style={{ color: '#1C1C2E' }}>
            {value.toFixed(0)}
          </span>
        </div>
      </div>
      <div className="w-full rounded-full h-2" style={{ backgroundColor: '#E8E2DA' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

const LightTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-sm shadow-lg"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DDD6' }}
    >
      <p className="font-medium mb-1" style={{ color: '#1C1C2E' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(1)}
        </p>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

function DigitalTwinBrain() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentState, setCurrentState] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());

  // Simulation Engine state
  const [scenario, setScenario] = useState('');
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [showScenarioDropdown, setShowScenarioDropdown] = useState(false);

  // Treatment Tester state
  const [intervention, setIntervention] = useState('');
  const [treatRunning, setTreatRunning] = useState(false);
  const [treatResult, setTreatResult] = useState(null);
  const [showInterventionDropdown, setShowInterventionDropdown] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [stateRes, historyRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/current-state`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/dashboard/history?days=30`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCurrentState(stateRes.data);
      setHistory(historyRes.data);
      setLastSync(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await fetchData();
    setSyncing(false);
  };

  const runSimulation = () => {
    if (!scenario || !currentState) return;
    setSimRunning(true);
    setTimeout(() => {
      const s = SCENARIOS[scenario];
      const projection = generateProjection(currentState.stress_level, s.deltas);
      setSimResult({ scenario: s, projection, deltas: s.deltas });
      setSimRunning(false);
    }, 900);
  };

  const runTreatment = () => {
    if (!intervention || !currentState) return;
    setTreatRunning(true);
    setTimeout(() => {
      const iv = INTERVENTIONS[intervention];
      const projection = generateTreatmentProjection(currentState.stress_level, iv.effect);
      setTreatResult({ intervention: iv, projection });
      setTreatRunning(false);
    }, 900);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F5F0' }}>
        <div className="text-center">
          <Activity className="w-10 h-10 mx-auto mb-3 animate-pulse" style={{ color: '#2A7C6F' }} />
          <p style={{ color: '#4A4A68' }}>Synchronising your Digital Twin…</p>
        </div>
      </div>
    );
  }

  // Radar chart data
  const radarData = [
    { metric: 'Calm', value: 100 - (currentState?.stress_level || 0), fullMark: 100 },
    { metric: 'Energy', value: 100 - (currentState?.fatigue_index || 0), fullMark: 100 },
    { metric: 'Stability', value: currentState?.emotional_stability || 0, fullMark: 100 },
    { metric: 'Focus', value: 100 - (currentState?.cognitive_load || 0), fullMark: 100 },
    { metric: 'Resilience', value: 100 - ((currentState?.burnout_risk || 0) * 100), fullMark: 100 },
    { metric: 'Safety', value: 100 - ((currentState?.crisis_risk || 0) * 100), fullMark: 100 },
  ];

  // Calendar heatmap data
  const calendarDays = history.slice(-30).map((day, idx) => {
    const stress = day.stress_level;
    const date = day.timestamp ? new Date(day.timestamp) : new Date(Date.now() - (29 - idx) * 86400000);
    return { stress, date, idx };
  });

  const getCalendarColor = (stress) => {
    if (stress < 30) return { bg: '#EAFAF3', border: '#2D9B6B', label: 'Low' };
    if (stress < 60) return { bg: '#FEF9EE', border: '#D97706', label: 'Moderate' };
    return { bg: '#FEF2F2', border: '#DC2626', label: 'High' };
  };

  const overallWellbeing = Math.round(
    radarData.reduce((acc, d) => acc + d.value, 0) / radarData.length
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>

      {/* NAV */}
      <nav
        className="sticky top-0 z-40"
        style={{
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderBottom: '1px solid #E2DDD6',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#4A4A68' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#F0ECE6'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-base font-heading font-semibold" style={{ color: '#1C1C2E' }}>
                Digital Twin Brain
              </span>
              <span className="text-xs ml-3" style={{ color: '#9494A8' }}>
                Last synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <button
            onClick={handleSync}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#EAF4F2', color: '#2A7C6F' }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#D0EDE9'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#EAF4F2'}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Twin
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* HEADER SCORE */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-heading font-light mb-1" style={{ color: '#1C1C2E' }}>
              {user?.name?.split(' ')[0]}'s Twin State
            </h1>
            <p style={{ color: '#9494A8' }}>
              A living model of your emotional and cognitive state — updated every 6 hours
            </p>
          </div>
          <div
            className="text-center px-6 py-4 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DDD6' }}
          >
            <div
              className="text-4xl font-heading font-semibold"
              style={{ color: overallWellbeing >= 60 ? '#2D9B6B' : overallWellbeing >= 40 ? '#D97706' : '#DC2626' }}
            >
              {overallWellbeing}
            </div>
            <div className="text-xs mt-1" style={{ color: '#9494A8' }}>Wellbeing Score</div>
          </div>
        </div>

        {/* TOP ROW: Radar + State Mirror */}
        <div className="grid lg:grid-cols-5 gap-6 mb-6">

          {/* Radar Chart */}
          <div
            className="lg:col-span-3 rounded-2xl p-6"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DDD6' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2A7C6F' }} />
              <h2 className="text-base font-heading font-semibold" style={{ color: '#1C1C2E' }}>
                State Mirror — Current Emotional Snapshot
              </h2>
            </div>
            <p className="text-xs mb-4" style={{ color: '#9494A8' }}>
              Outward = healthier. Each axis is normalised so higher always means better.
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#E2DDD6" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: '#4A4A68', fontSize: 12, fontFamily: 'Inter' }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#9494A8', fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  name="Current state"
                  dataKey="value"
                  stroke="#2A7C6F"
                  fill="#2A7C6F"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* State Mirror metrics */}
          <div
            data-testid="state-mirror-module"
            className="lg:col-span-2 rounded-2xl p-6"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DDD6' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2A7C6F' }} />
              <h2 className="text-base font-heading font-semibold" style={{ color: '#1C1C2E' }}>
                Live Metrics
              </h2>
            </div>
            <GaugeBar label="Stress Level" value={currentState?.stress_level || 0} />
            <GaugeBar label="Fatigue Index" value={currentState?.fatigue_index || 0} />
            <GaugeBar label="Emotional Stability" value={currentState?.emotional_stability || 0} inverted />
            <GaugeBar label="Cognitive Load" value={currentState?.cognitive_load || 0} />
            <GaugeBar label="Burnout Risk" value={(currentState?.burnout_risk || 0) * 100} />

            <div
              className="mt-4 rounded-xl p-3 text-xs"
              style={{ backgroundColor: '#EAF4F2', color: '#2A7C6F' }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" />
              Twin calibrated from {history.length} data points
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: Simulation Engine + Treatment Tester */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">

          {/* Simulation Engine */}
          <ModuleCard icon="⚗️" title="Simulation Engine — What-If Scenarios" accent="#E8A838">
            <div data-testid="simulation-engine-module">
              <p className="text-xs mb-4" style={{ color: '#9494A8' }}>
                Test how a life event would affect your emotional state before it happens.
              </p>

              {/* Custom dropdown */}
              <div className="relative mb-4">
                <button
                  data-testid="scenario-select"
                  onClick={() => setShowScenarioDropdown(!showScenarioDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors"
                  style={{
                    backgroundColor: '#F7F5F0',
                    border: '1px solid #E2DDD6',
                    color: scenario ? '#1C1C2E' : '#9494A8'
                  }}
                >
                  <span>
                    {scenario
                      ? `${SCENARIOS[scenario].icon} ${SCENARIOS[scenario].label}`
                      : 'Choose a scenario to simulate…'}
                  </span>
                  <ChevronDown className="w-4 h-4" style={{ color: '#9494A8' }} />
                </button>
                {showScenarioDropdown && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20 shadow-lg"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DDD6' }}
                  >
                    {Object.entries(SCENARIOS).map(([key, s]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setScenario(key);
                          setSimResult(null);
                          setShowScenarioDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors"
                        style={{ color: '#1C1C2E' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#F7F5F0'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span className="text-base">{s.icon}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {scenario && (
                <div
                  className="rounded-xl p-4 mb-4 text-sm"
                  style={{ backgroundColor: '#FEF9EE', border: '1px solid #E8A838' }}
                >
                  <p className="font-medium mb-1" style={{ color: '#C98D1E' }}>
                    Predicted impact on your twin:
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(SCENARIOS[scenario].deltas).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span style={{ color: '#4A4A68', textTransform: 'capitalize' }}>{k}</span>
                        <span
                          className="font-semibold"
                          style={{ color: v > 0 ? '#DC2626' : '#2D9B6B' }}
                        >
                          {v > 0 ? '+' : ''}{v}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs" style={{ color: '#9494A8' }}>
                    {SCENARIOS[scenario].duration}
                  </p>
                </div>
              )}

              <button
                onClick={runSimulation}
                disabled={!scenario || simRunning}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: scenario ? '#2A7C6F' : '#E8E2DA',
                  color: scenario ? '#FFFFFF' : '#9494A8',
                  cursor: scenario ? 'pointer' : 'not-allowed'
                }}
              >
                {simRunning ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Running simulation…</>
                ) : (
                  <><Play className="w-4 h-4" /> Run Simulation</>
                )}
              </button>

              {simResult && (
                <div className="mt-4">
                  <p className="text-xs font-medium mb-2" style={{ color: '#4A4A68' }}>
                    24-hour stress projection — baseline vs simulated
                  </p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={simResult.projection} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2A7C6F" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#2A7C6F" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E8A838" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#E8A838" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE6" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9494A8' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9494A8' }} />
                      <Tooltip content={<LightTooltip />} />
                      <Area type="monotone" dataKey="baseline" name="Baseline" stroke="#2A7C6F" fill="url(#baseGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="simulated" name="Simulated" stroke="#E8A838" fill="url(#simGrad)" strokeWidth={2} strokeDasharray="5 3" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-xs mt-2" style={{ color: '#9494A8' }}>
                    {simResult.scenario.description}
                  </p>
                </div>
              )}
            </div>
          </ModuleCard>

          {/* Treatment Tester */}
          <ModuleCard icon="💊" title="Treatment Tester — Virtual Intervention" accent="#2D9B6B">
            <div data-testid="treatment-tester-module">
              <p className="text-xs mb-4" style={{ color: '#9494A8' }}>
                See the projected effect of an intervention on your twin before applying it.
              </p>

              <div className="relative mb-4">
                <button
                  data-testid="intervention-select"
                  onClick={() => setShowInterventionDropdown(!showInterventionDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors"
                  style={{
                    backgroundColor: '#F7F5F0',
                    border: '1px solid #E2DDD6',
                    color: intervention ? '#1C1C2E' : '#9494A8'
                  }}
                >
                  <span>
                    {intervention
                      ? `${INTERVENTIONS[intervention].icon} ${INTERVENTIONS[intervention].label}`
                      : 'Choose an intervention to test…'}
                  </span>
                  <ChevronDown className="w-4 h-4" style={{ color: '#9494A8' }} />
                </button>
                {showInterventionDropdown && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20 shadow-lg"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DDD6' }}
                  >
                    {Object.entries(INTERVENTIONS).map(([key, iv]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setIntervention(key);
                          setTreatResult(null);
                          setShowInterventionDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors"
                        style={{ color: '#1C1C2E' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#F7F5F0'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span className="text-base">{iv.icon}</span>
                        <div>
                          <div>{iv.label}</div>
                          <div className="text-xs" style={{ color: '#9494A8' }}>
                            Confidence: {iv.confidence}%
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {intervention && (
                <div
                  className="rounded-xl p-4 mb-4 text-sm"
                  style={{ backgroundColor: '#EAFAF3', border: '1px solid #2D9B6B' }}
                >
                  <p className="font-medium mb-2" style={{ color: '#1F6B4A' }}>
                    Projected outcome for your profile:
                  </p>
                  {Object.entries(INTERVENTIONS[intervention].effect)
                    .filter(([k]) => k !== 'duration')
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between mb-1">
                        <span style={{ color: '#4A4A68', textTransform: 'capitalize' }}>{k}</span>
                        <span className="font-semibold" style={{ color: v < 0 ? '#2D9B6B' : '#DC2626' }}>
                          {v > 0 ? '+' : ''}{v} pts
                        </span>
                      </div>
                    ))}
                  <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid #B7E9D0' }}>
                    <Zap className="w-3.5 h-3.5" style={{ color: '#2D9B6B' }} />
                    <span className="text-xs" style={{ color: '#1F6B4A' }}>
                      Confidence: {INTERVENTIONS[intervention].confidence}% · Active over {INTERVENTIONS[intervention].effect.duration}h
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={runTreatment}
                disabled={!intervention || treatRunning}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: intervention ? '#2D9B6B' : '#E8E2DA',
                  color: intervention ? '#FFFFFF' : '#9494A8',
                  cursor: intervention ? 'pointer' : 'not-allowed'
                }}
              >
                {treatRunning ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Testing intervention…</>
                ) : (
                  <><FlaskConical className="w-4 h-4" /> Test on Twin</>
                )}
              </button>

              {treatResult && (
                <div className="mt-4">
                  <p className="text-xs font-medium mb-2" style={{ color: '#4A4A68' }}>
                    Stress trajectory — with vs without intervention
                  </p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={treatResult.projection} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="withoutGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#DC2626" stopOpacity={0.10} />
                          <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="withGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2D9B6B" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2D9B6B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE6" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9494A8' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9494A8' }} />
                      <Tooltip content={<LightTooltip />} />
                      <Area type="monotone" dataKey="without" name="Without" stroke="#DC2626" fill="url(#withoutGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="with" name="With intervention" stroke="#2D9B6B" fill="url(#withGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-xs mt-2" style={{ color: '#9494A8' }}>
                    {treatResult.intervention.description}
                  </p>
                </div>
              )}
            </div>
          </ModuleCard>
        </div>

        {/* TRAJECTORY RECORDER */}
        <div
          data-testid="trajectory-recorder-module"
          className="rounded-2xl p-6"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DDD6' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: '#EAF4F2' }}>
              <Clock className="w-4 h-4" style={{ color: '#2A7C6F' }} />
            </div>
            <div>
              <h2 className="text-base font-heading font-semibold" style={{ color: '#1C1C2E' }}>
                Trajectory Recorder — 30-Day Memory
              </h2>
              <p className="text-xs" style={{ color: '#9494A8' }}>
                Your twin's emotional memory. Each cell = one day. Hover for details.
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 mt-3">
            {[
              { label: 'Low stress', bg: '#EAFAF3', border: '#2D9B6B' },
              { label: 'Moderate', bg: '#FEF9EE', border: '#D97706' },
              { label: 'High stress', bg: '#FEF2F2', border: '#DC2626' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: l.bg, border: `1.5px solid ${l.border}` }}
                />
                <span className="text-xs" style={{ color: '#9494A8' }}>{l.label}</span>
              </div>
            ))}
          </div>

          {calendarDays.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ backgroundColor: '#F7F5F0' }}
            >
              <p style={{ color: '#9494A8' }}>
                No history yet. Your trajectory will build over the next 7–14 days.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="text-center text-xs font-medium pb-1" style={{ color: '#9494A8' }}>
                  {d}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                const { bg, border, label } = getCalendarColor(day.stress);
                return (
                  <div
                    key={idx}
                    className="rounded-xl flex flex-col items-center justify-center cursor-default transition-transform hover:scale-105"
                    style={{
                      backgroundColor: bg,
                      border: `1.5px solid ${border}`,
                      height: '56px',
                      padding: '6px'
                    }}
                    title={`${day.date.toLocaleDateString()} — Stress: ${day.stress.toFixed(0)} (${label})`}
                  >
                    <span className="text-xs font-medium" style={{ color: '#1C1C2E' }}>
                      {day.date.getDate()}
                    </span>
                    <span className="text-xs mt-0.5" style={{ color: '#9494A8' }}>
                      {day.stress.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div
          className="mt-6 rounded-xl p-4 text-center"
          style={{ backgroundColor: '#F7F5F0', border: '1px solid #E8E2DA' }}
        >
          <p className="text-xs" style={{ color: '#9494A8' }}>
            Simulations and projections are estimates based on your profile patterns. They are non-diagnostic and do not constitute medical advice.
          </p>
        </div>
      </main>
    </div>
  );
}

export default DigitalTwinBrain;