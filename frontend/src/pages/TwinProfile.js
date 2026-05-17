import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { ArrowLeft, RefreshCw, Zap, Moon, Users, BookOpen, Heart, Music } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

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

// Derive stress archetype from λ weights + component values
function deriveArchetype(breakdown) {
  if (!breakdown) return null;
  const { lambda_phys: lp, lambda_beh: lb, lambda_acad: la,
          P_physical: P, B_behavioural: B, A_academic: A } = breakdown;

  const physScore = lp * P;
  const behScore  = lb * B;
  const acadScore = la * A;
  const dominant  = Math.max(physScore, behScore, acadScore);

  if (dominant === acadScore && la > 0.38) return {
    name: 'Academic Pressure Accumulator',
    emoji: '📚',
    desc: 'Your stress builds primarily from academic load — deadlines, performance expectations, and study pressure. Your twin weights academic signals most heavily because of how you described your relationship with grades.',
    tip: 'Your biggest win is scheduling — break work into visible chunks before pressure builds. Your twin uses Thursday/Monday signals most heavily.',
    color: '#F0FDF4', accent: T.low,
  };
  if (dominant === behScore && lb > 0.38) return {
    name: 'Behavioural Signal Reactor',
    emoji: '📱',
    desc: "Your stress is most strongly driven by behavioural cues — phone usage, notification patterns, and social signals. You're reactive to your environment in ways that show up in your data before you notice them consciously.",
    tip: 'Phone-free periods before bed will have the highest measurable impact on your twin state. The behavioural stream updates every 5 minutes.',
    color: '#FFF0F3', accent: '#EC4899',
  };
  if (dominant === physScore && lp > 0.38) return {
    name: 'Physical Rhythm Responder',
    emoji: '🔋',
    desc: "Your wellbeing is most tightly coupled to physical patterns — sleep quality, energy cycles, and your chronotype. When your physical rhythm breaks, everything else follows.",
    tip: 'Sleep consistency matters more than sleep duration for your twin. Even 30 minutes earlier to bed improves your physical score noticeably.',
    color: T.primaryLight, accent: T.primary,
  };
  return {
    name: 'Balanced State Navigator',
    emoji: '⚖️',
    desc: 'Your stress draws relatively equally from all three streams. This means no single intervention dominates — but it also means small improvements across all three add up quickly.',
    tip: 'Consistent small wins across sleep, behaviour, and study habits compound for you more than dramatic changes in one area.',
    color: '#FEF9EE', accent: T.accent,
  };
}

function LightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
      <p className="font-medium mb-1" style={{ color: T.text }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || T.primary }}>{p.name}: {p.value?.toFixed?.(1) ?? p.value}</p>
      ))}
    </div>
  );
}

export default function TwinProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [breakdown, setBreakdown] = useState(null);
  const [history, setHistory] = useState([]);
  const [lambdaHistory, setLambdaHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const token = localStorage.getItem('token');
    try {
      const [bRes, hRes, lRes] = await Promise.all([
        axios.get(`${API_URL}/api/paper/component-breakdown`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/dashboard/history?days=30`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/paper/lambda-history`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setBreakdown(bRes.data);
      setHistory(hRes.data);
      setLambdaHistory(lRes.data.slice(0, 30).reverse());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const archetype = deriveArchetype(breakdown);

  // Radar data from breakdown
  const radarData = breakdown ? [
    { metric: 'Physical', value: Math.round(breakdown.P_physical || 0), fullMark: 100 },
    { metric: 'Behavioural', value: Math.round(breakdown.B_behavioural || 0), fullMark: 100 },
    { metric: 'Academic', value: Math.round(breakdown.A_academic || 0), fullMark: 100 },
    { metric: 'λ Balance', value: Math.round(100 - Math.abs(breakdown.lambda_phys - breakdown.lambda_beh) * 200), fullMark: 100 },
  ] : [];

  // λ weight chart
  const lambdaChartData = lambdaHistory.slice(-20).map((r, i) => ({
    t: i,
    phys: r.lambda_phys ? Math.round(r.lambda_phys * 100) : null,
    beh: r.lambda_beh ? Math.round(r.lambda_beh * 100) : null,
    acad: r.lambda_acad ? Math.round(r.lambda_acad * 100) : null,
  })).filter(r => r.phys !== null);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: T.bg }}>
      <div className="text-center">
        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: T.primary }} />
        <p style={{ color: T.textFaint }}>Loading your Twin Profile…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.bg }}>
      <nav className="sticky top-0 z-40"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${T.border}`, backdropFilter: 'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl transition-colors" style={{ color: T.textFaint }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = T.surfaceAlt}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-heading font-semibold" style={{ color: T.text }}>
            Twin Profile
          </span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-5 py-7 space-y-5">

        {/* Archetype card */}
        {archetype && (
          <div className="rounded-3xl p-7"
            style={{ backgroundColor: archetype.color, border: `1.5px solid ${archetype.accent}30` }}>
            <div className="flex items-start gap-4">
              <div className="text-5xl">{archetype.emoji}</div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: archetype.accent }}>Your Stress Archetype</p>
                <h2 className="text-xl font-heading font-semibold mb-3" style={{ color: T.text }}>
                  {archetype.name}
                </h2>
                <p className="text-sm leading-relaxed mb-4" style={{ color: T.textMuted }}>
                  {archetype.desc}
                </p>
                <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: archetype.accent }}>💡 What helps you most</p>
                  <p className="text-sm" style={{ color: T.textMuted }}>{archetype.tip}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* λ weights */}
        {breakdown && (
          <div className="rounded-2xl p-6"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
            <h2 className="text-base font-heading font-semibold mb-1" style={{ color: T.text }}>
              Your Personalised λ Weights
            </h2>
            <p className="text-xs mb-5" style={{ color: T.textFaint }}>
              S(t) = λ_phys · P(t) + λ_beh · B(t) + λ_acad · A(t) — computed from your onboarding profile
            </p>
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: 'λ Physical', key: 'lambda_phys', icon: <Moon className="w-4 h-4"/>, color: '#6366F1' },
                { label: 'λ Behavioural', key: 'lambda_beh', icon: <Zap className="w-4 h-4"/>, color: '#EC4899' },
                { label: 'λ Academic', key: 'lambda_acad', icon: <BookOpen className="w-4 h-4"/>, color: T.primary },
              ].map(w => (
                <div key={w.key} className="rounded-2xl p-4 text-center"
                  style={{ backgroundColor: T.surfaceAlt }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: w.color + '18', color: w.color }}>
                    {w.icon}
                  </div>
                  <div className="text-2xl font-heading font-semibold"
                    style={{ color: w.color }}>
                    {((breakdown[w.key] || 0) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: T.textFaint }}>{w.label}</div>
                </div>
              ))}
            </div>

            {/* Current component values */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'P(t) Physical', val: breakdown.P_physical, color: '#6366F1' },
                { label: 'B(t) Behavioural', val: breakdown.B_behavioural, color: '#EC4899' },
                { label: 'A(t) Academic', val: breakdown.A_academic, color: T.primary },
              ].map(c => (
                <div key={c.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs" style={{ color: T.textFaint }}>{c.label}</span>
                    <span className="text-xs font-semibold" style={{ color: c.color }}>
                      {c.val?.toFixed(0) ?? '—'}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ backgroundColor: T.surfaceAlt }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${c.val ?? 0}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 rounded-xl p-3 text-center text-xs"
              style={{ backgroundColor: T.surfaceAlt, borderTop: 'none' }}>
              <span style={{ color: T.textFaint }}>Unified stress: </span>
              <span className="font-semibold" style={{ color: T.text }}>
                {breakdown.unified_stress?.toFixed(1)} = {((breakdown.lambda_phys || 0) * 100).toFixed(0)}% ·
                {((breakdown.P_physical || 0)).toFixed(0)} + {((breakdown.lambda_beh || 0) * 100).toFixed(0)}% ·
                {((breakdown.B_behavioural || 0)).toFixed(0)} + {((breakdown.lambda_acad || 0) * 100).toFixed(0)}% ·
                {((breakdown.A_academic || 0)).toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {/* Stream radar + λ over time */}
        <div className="grid lg:grid-cols-2 gap-5">

          {/* Radar */}
          {radarData.length > 0 && (
            <div className="rounded-2xl p-6"
              style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
              <h2 className="text-base font-heading font-semibold mb-4" style={{ color: T.text }}>
                Stream Balance
              </h2>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke={T.border} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: T.textFaint, fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]}
                    tick={{ fill: T.textFaint, fontSize: 9 }} axisLine={false} />
                  <Radar name="Current" dataKey="value"
                    stroke={T.primary} fill={T.primary} fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* λ over time */}
          {lambdaChartData.length > 0 && (
            <div className="rounded-2xl p-6"
              style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
              <h2 className="text-base font-heading font-semibold mb-1" style={{ color: T.text }}>
                λ Weight Stability
              </h2>
              <p className="text-xs mb-4" style={{ color: T.textFaint }}>
                How your stream weights have evolved — flatter = more stable personalisation
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={lambdaChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    {[['phys','#6366F1'],['beh','#EC4899'],['acad',T.primary]].map(([k,c]) => (
                      <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={c} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={c} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.surfaceAlt} />
                  <XAxis dataKey="t" tick={{ fill: T.textFaint, fontSize: 9 }} />
                  <YAxis domain={[0, 60]} tick={{ fill: T.textFaint, fontSize: 9 }} />
                  <Tooltip content={<LightTooltip />} />
                  <Area type="monotone" dataKey="phys" name="λ Physical (%)"
                    stroke="#6366F1" fill="url(#grad-phys)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="beh" name="λ Behavioural (%)"
                    stroke="#EC4899" fill="url(#grad-beh)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="acad" name="λ Academic (%)"
                    stroke={T.primary} fill="url(#grad-acad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 30-day stress pattern */}
        {history.length > 0 && (
          <div className="rounded-2xl p-6"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
            <h2 className="text-base font-heading font-semibold mb-1" style={{ color: T.text }}>
              30-Day Stress Pattern
            </h2>
            <p className="text-xs mb-4" style={{ color: T.textFaint }}>
              Your personal stress trajectory — computed from your λ-weighted twin model
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart
                data={history.slice(-80).map(h => ({ t: h.timestamp, v: h.stress_level }))}
                margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="histGrad30" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={T.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.surfaceAlt} vertical={false} />
                <XAxis dataKey="t" tick={{ fill: T.textFaint, fontSize: 9 }}
                  tickFormatter={v => { const d = new Date(v); return isNaN(d) ? '' : `${d.getMonth()+1}/${d.getDate()}`; }}
                  interval={10} />
                <YAxis domain={[0,100]} tick={{ fill: T.textFaint, fontSize: 9 }} />
                <Tooltip content={<LightTooltip />} />
                <Area type="monotone" dataKey="v" name="Stress"
                  stroke={T.primary} fill="url(#histGrad30)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: T.surfaceAlt }}>
          <p className="text-xs" style={{ color: T.textFaint }}>
            Your twin profile updates continuously as new signals arrive. λ weights were set at onboarding and evolve slowly over time.
          </p>
        </div>
      </main>
    </div>
  );
}