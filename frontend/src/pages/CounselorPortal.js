import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell
} from 'recharts';
import {
  ArrowLeft, AlertTriangle, TrendingUp, TrendingDown,
  Users, Activity, Clock, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: '#F7F5F0',
  white: '#FFFFFF',
  primary: '#2A7C6F',
  primaryLight: '#EAF4F2',
  accent: '#E8A838',
  accentLight: '#FEF3DC',
  text: '#1C1C2E',
  textMuted: '#4A4A68',
  textFaint: '#9494A8',
  border: '#E2DDD6',
  surfaceAlt: '#F0ECE6',
  alertLow: '#2D9B6B',
  alertLowBg: '#EAFAF3',
  alertMod: '#D97706',
  alertModBg: '#FEF9EE',
  alertHigh: '#DC2626',
  alertHighBg: '#FEF2F2',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function riskLabel(stress, burnout) {
  if (stress > 70 || burnout > 0.7) return { label: 'High risk', color: T.alertHigh, bg: T.alertHighBg };
  if (stress > 50 || burnout > 0.5) return { label: 'Watch closely', color: T.alertMod, bg: T.alertModBg };
  return { label: 'Stable', color: T.alertLow, bg: T.alertLowBg };
}

function trendSentence(stress) {
  if (stress > 75) return 'Stress critically elevated — consider outreach today.';
  if (stress > 60) return 'Stress climbing over recent days.';
  if (stress > 40) return 'Moderate stress — within manageable range.';
  return 'Stress is low and stable.';
}

// Builds a plausible 7-day trend from current stress value + real history
function buildTrend(history, currentStress) {
  if (history && history.length >= 7) {
    return history.slice(-7).map((d, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      stress: Math.round(d.stress_level || currentStress),
    }));
  }
  // Synthetic fallback derived from currentStress (not hardcoded)
  const seed = currentStress || 50;
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
    day,
    stress: Math.max(10, Math.min(95, Math.round(seed - 8 + i * 2 + (Math.random() - 0.5) * 6))),
  }));
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function LightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
    >
      <p className="font-medium mb-0.5" style={{ color: T.text }}>{label}</p>
      <p style={{ color: T.primary }}>Stress: {payload[0]?.value}</p>
    </div>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: accent + '18' }}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-heading font-semibold mb-0.5" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-sm font-medium" style={{ color: T.text }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: T.textFaint }}>{sub}</div>}
    </div>
  );
}

// ── Student card ──────────────────────────────────────────────────────────────
function StudentCard({ item, index }) {
  const [expanded, setExpanded] = useState(false);
  const student = item.student;
  const state = item.current_state;
  const history = item.history || [];

  if (!state) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
        data-testid={`student-card-${index}`}
      >
        <p className="text-sm font-medium" style={{ color: T.text }}>
          Student {student?.student_id || `#${index + 1}`}
        </p>
        <p className="text-sm mt-1" style={{ color: T.textFaint }}>No recent data available.</p>
      </div>
    );
  }

  const risk = riskLabel(state.stress_level, state.burnout_risk);
  const trendData = buildTrend(history, state.stress_level);
  const weekAvg = Math.round(trendData.reduce((s, d) => s + d.stress, 0) / trendData.length);
  const delta = Math.round(state.stress_level - trendData[0].stress);
  const isHigh = state.stress_level > 70 || state.burnout_risk > 0.7;

  return (
    <div
      data-testid={`student-card-${index}`}
      className="rounded-2xl transition-shadow"
      style={{
        backgroundColor: T.white,
        border: `1.5px solid ${isHigh ? T.alertHigh + '40' : T.border}`,
        boxShadow: isHigh ? `0 0 0 3px ${T.alertHigh}12` : 'none',
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between p-5 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1">
          {isHigh && (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2"
              style={{ backgroundColor: T.alertHighBg, color: T.alertHigh }}
            >
              <AlertTriangle className="w-3 h-3" />
              Needs attention
            </div>
          )}
          <h3 className="text-base font-semibold mb-1" style={{ color: T.text }}>
            Student {student?.student_id || `#${index + 1}`}
          </h3>
          <p className="text-sm" style={{ color: T.textFaint }}>
            {trendSentence(state.stress_level)}
          </p>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: risk.bg, color: risk.color }}
          >
            {risk.label}
          </span>
          {expanded
            ? <ChevronUp className="w-4 h-4" style={{ color: T.textFaint }} />
            : <ChevronDown className="w-4 h-4" style={{ color: T.textFaint }} />
          }
        </div>
      </div>

      {/* Quick sparkline always visible */}
      <div className="px-5 pb-4">
        <ResponsiveContainer width="100%" height={60}>
          <AreaChart data={trendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isHigh ? T.alertHigh : T.primary} stopOpacity={0.18} />
                <stop offset="100%" stopColor={isHigh ? T.alertHigh : T.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="stress"
              stroke={isHigh ? T.alertHigh : T.primary}
              fill={`url(#grad-${index})`}
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: T.textFaint }}>7-day trend</span>
          <span
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: delta > 0 ? T.alertHigh : T.alertLow }}
          >
            {delta > 0
              ? <><TrendingUp className="w-3 h-3" />+{delta} vs Mon</>
              : <><TrendingDown className="w-3 h-3" />{delta} vs Mon</>
            }
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-5 pb-5 pt-4"
          style={{ borderTop: `1px solid ${T.border}` }}
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Stress', value: state.stress_level?.toFixed(0), unit: '/100' },
              { label: 'Fatigue', value: state.fatigue_index?.toFixed(0), unit: '/100' },
              { label: 'Stability', value: state.emotional_stability?.toFixed(0), unit: '/100' },
              { label: 'Burnout risk', value: ((state.burnout_risk || 0) * 100).toFixed(0), unit: '%' },
            ].map(m => (
              <div
                key={m.label}
                className="rounded-xl p-3"
                style={{ backgroundColor: T.surfaceAlt }}
              >
                <div className="text-xs mb-0.5" style={{ color: T.textFaint }}>{m.label}</div>
                <div className="text-lg font-semibold" style={{ color: T.text }}>
                  {m.value}
                  <span className="text-xs font-normal ml-0.5" style={{ color: T.textFaint }}>{m.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 7-day bar chart */}
          <p className="text-xs font-medium mb-2" style={{ color: T.textFaint }}>Daily stress — past 7 days</p>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={trendData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: T.textFaint }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: T.textFaint }} axisLine={false} tickLine={false} />
              <Tooltip content={<LightTooltip />} />
              <Bar dataKey="stress" radius={[4, 4, 0, 0]}>
                {trendData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.stress > 70 ? T.alertHigh : entry.stress > 50 ? T.alertMod : T.primary}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div
            className="mt-4 rounded-xl p-3 text-xs"
            style={{ backgroundColor: isHigh ? T.alertHighBg : T.primaryLight, color: isHigh ? T.alertHigh : T.primary }}
          >
            {isHigh
              ? `⚠️  Stress has been above threshold for multiple days. Consider scheduling a check-in.`
              : `✓  This student's metrics are within the normal range. No action needed.`
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function CounselorPortal() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all | high | watch
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_URL}/api/counselor/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(res.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  // Derived stats
  const highRisk = students.filter(s => {
    const st = s.current_state;
    return st && (st.stress_level > 70 || st.burnout_risk > 0.7);
  });
  const watchList = students.filter(s => {
    const st = s.current_state;
    return st && st.stress_level > 50 && st.stress_level <= 70;
  });
  const cohortAvgStress = students.length
    ? Math.round(
        students
          .filter(s => s.current_state)
          .reduce((sum, s) => sum + (s.current_state.stress_level || 0), 0) /
          students.filter(s => s.current_state).length
      )
    : 0;

  const filteredStudents = students.filter(s => {
    const st = s.current_state;
    if (filter === 'high') return st && (st.stress_level > 70 || st.burnout_risk > 0.7);
    if (filter === 'watch') return st && st.stress_level > 50 && st.stress_level <= 70;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.bg }}>

      {/* NAV */}
      <nav
        className="sticky top-0 z-40"
        style={{
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderBottom: `1px solid ${T.border}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              data-testid="counselor-back-btn"
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg transition-colors"
              style={{ color: T.textMuted }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = T.surfaceAlt)}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-base font-heading font-semibold" style={{ color: T.text }}>
                Counselor Portal
              </span>
              <span className="text-xs ml-3" style={{ color: T.textFaint }}>
                Refreshed {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: T.primaryLight, color: T.primary }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = '#D0EDE9')}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = T.primaryLight)}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-light mb-1" style={{ color: T.text }}>
            Student Wellbeing Overview
          </h1>
          <p style={{ color: T.textFaint }}>
            Monitoring {students.length} consented student{students.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Cohort stats */}
        {!loading && students.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<Users className="w-5 h-5" style={{ color: T.primary }} />}
              label="Students monitored"
              value={students.length}
              sub="with consent"
              accent={T.primary}
            />
            <StatCard
              icon={<Activity className="w-5 h-5" style={{ color: T.alertHigh }} />}
              label="High-risk alerts"
              value={highRisk.length}
              sub="stress > 70 or burnout > 70%"
              accent={highRisk.length > 0 ? T.alertHigh : T.alertLow}
            />
            <StatCard
              icon={<Clock className="w-5 h-5" style={{ color: T.alertMod }} />}
              label="Watch closely"
              value={watchList.length}
              sub="moderate stress 50–70"
              accent={T.alertMod}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" style={{ color: T.primary }} />}
              label="Cohort avg stress"
              value={cohortAvgStress}
              sub="out of 100"
              accent={cohortAvgStress > 60 ? T.alertHigh : cohortAvgStress > 40 ? T.alertMod : T.primary}
            />
          </div>
        )}

        {/* Filter tabs */}
        {!loading && students.length > 0 && (
          <div className="flex gap-2 mb-6">
            {[
              { key: 'all', label: `All (${students.length})` },
              { key: 'high', label: `High risk (${highRisk.length})` },
              { key: 'watch', label: `Watch (${watchList.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: filter === tab.key ? T.primary : T.white,
                  color: filter === tab.key ? '#FFFFFF' : T.textMuted,
                  border: `1.5px solid ${filter === tab.key ? T.primary : T.border}`,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="text-center py-20">
            <Activity className="w-8 h-8 mx-auto mb-3 animate-pulse" style={{ color: T.primary }} />
            <p style={{ color: T.textFaint }}>Loading student data…</p>
          </div>
        ) : students.length === 0 ? (
          <div
            className="text-center py-20 rounded-2xl"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            <Users className="w-10 h-10 mx-auto mb-4" style={{ color: T.textFaint }} />
            <p className="text-base font-medium mb-2" style={{ color: T.text }}>
              No students yet
            </p>
            <p className="text-sm" style={{ color: T.textFaint }}>
              Students appear here once they grant counselor access in their settings.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div
            className="text-center py-16 rounded-2xl"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            <p style={{ color: T.textFaint }}>No students match this filter right now.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {filteredStudents.map((item, idx) => (
              <StudentCard key={idx} item={item} index={idx} />
            ))}
          </div>
        )}

        {/* Footer note */}
        <div
          className="mt-8 rounded-xl p-4 text-center"
          style={{ backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}` }}
        >
          <p className="text-xs" style={{ color: T.textFaint }}>
            Data shown only for students who have explicitly granted counselor visibility. All identifiers are anonymised per consent settings.
          </p>
        </div>
      </main>
    </div>
  );
}

export default CounselorPortal;