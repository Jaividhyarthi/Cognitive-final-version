import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  ChevronRight, ChevronLeft, Check, Shield, Smartphone,
  Battery, Bell, Clock, Wifi, Activity
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const T = {
  bg: '#F7F5F0', white: '#FFFFFF', primary: '#2A7C6F',
  primaryLight: '#EAF4F2', primaryHover: '#1F5C52',
  accent: '#E8A838', accentLight: '#FEF3DC',
  text: '#1C1C2E', textMuted: '#4A4A68', textFaint: '#9494A8',
  border: '#E2DDD6', surfaceAlt: '#F0ECE6',
};

const SECTIONS = [
  { id: 'welcome',   label: 'Welcome',             icon: '🧠', color: T.primaryLight },
  { id: 'stress',    label: 'Stress Personality',  icon: '⚡', color: '#FEF3DC' },
  { id: 'sleep',     label: 'Sleep Baseline',      icon: '🌙', color: '#EEF0FF' },
  { id: 'social',    label: 'Social Baseline',     icon: '🤝', color: '#FFF0F3' },
  { id: 'academic',  label: 'Academic Self',       icon: '📚', color: '#F0FDF4' },
  { id: 'emotional', label: 'Emotional Awareness', icon: '💚', color: '#EAF4F2' },
  { id: 'treatment', label: 'What Helps You',      icon: '🎵', color: '#FEF9EE' },
  { id: 'phone',     label: 'Phone Signals',       icon: '📱', color: '#F0F4FF' },
  { id: 'consent',   label: 'Privacy & Consent',   icon: '🔒', color: '#F7F5F0' },
  { id: 'done',      label: 'Ready',               icon: '✨', color: T.primaryLight },
];

// ─── SVG Scene Illustrations ───────────────────────────────────────────────
const SCENES = {
  exam_desk: (
    <svg viewBox="0 0 280 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="160" fill="#FEF9EE" rx="12"/>
      <rect x="20" y="100" width="240" height="8" rx="3" fill="#E8D5A3"/>
      <rect x="30" y="55" width="80" height="60" rx="4" fill="#F5E6C8" stroke="#D4A853" strokeWidth="1.5"/>
      <line x1="40" y1="70" x2="100" y2="70" stroke="#C9A96E" strokeWidth="1.5"/>
      <line x1="40" y1="80" x2="90" y2="80" stroke="#C9A96E" strokeWidth="1.5"/>
      <line x1="40" y1="90" x2="95" y2="90" stroke="#C9A96E" strokeWidth="1.5"/>
      <rect x="120" y="45" width="60" height="70" rx="4" fill="#E8F4F2" stroke="#2A7C6F" strokeWidth="1.5"/>
      <rect x="130" y="57" width="40" height="5" rx="2" fill="#2A7C6F" opacity="0.4"/>
      <rect x="130" y="67" width="35" height="5" rx="2" fill="#2A7C6F" opacity="0.4"/>
      <rect x="130" y="77" width="38" height="5" rx="2" fill="#2A7C6F" opacity="0.4"/>
      <circle cx="212" cy="80" r="22" fill="#FFE4B5" stroke="#D4A853" strokeWidth="1.5"/>
      <text x="212" y="86" textAnchor="middle" fontSize="20">☕</text>
      <rect x="22" y="20" width="110" height="22" rx="5" fill="#FEE2E2" stroke="#FCA5A5" strokeWidth="1"/>
      <text x="30" y="34" fontSize="10" fill="#DC2626" fontFamily="sans-serif">📅 Tomorrow: Final Exam</text>
    </svg>
  ),
  social_party: (
    <svg viewBox="0 0 280 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="160" fill="#FFF0F3" rx="12"/>
      {[50,100,150,200].map((x,i)=>(
        <g key={i}>
          <circle cx={x} cy={68} r={18} fill={['#FFD6D6','#D6EAFF','#D6FFE4','#FFE4D6'][i]}
            stroke={['#FF8A8A','#5B9BD5','#5DB87A','#FF9A5C'][i]} strokeWidth="1.5"/>
          <text x={x} y={75} textAnchor="middle" fontSize="18">{['😄','🤔','😊','😐'][i]}</text>
          <rect x={x-8} y={88} width={16} height={28} rx={4}
            fill={['#FFAEAE','#AEC6FF','#AEFFCC','#FFCBAE'][i]}/>
        </g>
      ))}
      <text x="140" y="148" textAnchor="middle" fontSize="10" fill={T.textFaint}>A social gathering — people you know a bit</text>
    </svg>
  ),
  late_night_phone: (
    <svg viewBox="0 0 280 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="160" fill="#1C1C2E" rx="12"/>
      <ellipse cx="140" cy="80" rx="55" ry="68" fill="#1F2A4A" opacity="0.5"/>
      <rect x="110" y="38" width="60" height="100" rx="8" fill="#0F172A" stroke="#334155" strokeWidth="1.5"/>
      <rect x="115" y="46" width="50" height="84" rx="4" fill="#1E3A5F"/>
      <rect x="120" y="52" width="40" height="12" rx="3" fill="#2A7C6F" opacity="0.8"/>
      <rect x="120" y="68" width="40" height="8" rx="3" fill="#334155"/>
      <rect x="120" y="80" width="30" height="8" rx="3" fill="#334155"/>
      <text x="28" y="22" fontSize="11" fill="#9494A8" fontFamily="sans-serif">2:47 AM</text>
      <text x="220" y="22" fontSize="16">🌙</text>
    </svg>
  ),
  empty_room: (
    <svg viewBox="0 0 280 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="160" fill="#EEF0FF" rx="12"/>
      <rect x="0" y="132" width="280" height="28" fill="#D8DCF0"/>
      <rect x="22" y="42" width="236" height="90" rx="4" fill="#DFE3F5" stroke="#B8C0E8" strokeWidth="1"/>
      <rect x="80" y="54" width="120" height="6" rx="3" fill="#B8C0E8" opacity="0.5"/>
      <rect x="90" y="64" width="90" height="4" rx="2" fill="#B8C0E8" opacity="0.35"/>
      <circle cx="140" cy="102" r="18" fill="#E8ECFF" stroke="#8890D8" strokeWidth="1.5"/>
      <text x="140" y="109" textAnchor="middle" fontSize="22">🪑</text>
      <text x="140" y="22" textAnchor="middle" fontSize="10" fill={T.textFaint}>Study room — empty, quiet, 48h alone</text>
    </svg>
  ),
  two_paths: (
    <svg viewBox="0 0 280 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="160" fill="#F0FDF4" rx="12"/>
      <polygon points="140,20 50,148 230,148" fill="#D1FAE5" stroke="#6EE7B7" strokeWidth="1.5"/>
      <line x1="140" y1="75" x2="85" y2="148" stroke="#059669" strokeWidth="2" strokeDasharray="6 3"/>
      <line x1="140" y1="75" x2="195" y2="148" stroke="#059669" strokeWidth="2" strokeDasharray="6 3"/>
      <circle cx="140" cy="75" r="6" fill="#059669"/>
      <text x="70" y="158" textAnchor="middle" fontSize="9" fill="#059669">Slow &amp; safe</text>
      <text x="210" y="158" textAnchor="middle" fontSize="9" fill="#059669">Fast &amp; risky</text>
      <text x="140" y="14" textAnchor="middle" fontSize="10" fill={T.textFaint}>An assignment due in 3 days</text>
    </svg>
  ),
  inbox_flood: (
    <svg viewBox="0 0 280 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="160" fill="#FFF7ED" rx="12"/>
      {[0,1,2,3,4].map(i=>(
        <g key={i}>
          <rect x={30+i*3} y={50+i*10} width={220-i*6} height={32} rx={4}
            fill={['#FEF3C7','#FDE68A','#FCD34D','#FBBF24','#F59E0B'][i]}
            stroke="#E8A838" strokeWidth="1" opacity={1-i*0.1}/>
          <rect x={44+i*3} y={59+i*10} width={75} height={4} rx={2} fill="#92400E" opacity="0.3"/>
          <rect x={44+i*3} y={67+i*10} width={55} height={3} rx={2} fill="#92400E" opacity="0.2"/>
          <circle cx={222} cy={66+i*10} r={7} fill="#EF4444" opacity={0.9-i*0.12}/>
          <text x={222} y={70+i*10} textAnchor="middle" fontSize="7" fill="white">{[12,5,3,8,2][i]}</text>
        </g>
      ))}
      <text x="140" y="22" textAnchor="middle" fontSize="10" fill={T.textFaint}>You open your phone to 47 unread notifications</text>
    </svg>
  ),
};

// ─── Question Bank ─────────────────────────────────────────────────────────
const SECTION_QUESTIONS = {
  stress: [
    {
      id: 'stress_scenario_1', type: 'scenario_image', scene: 'exam_desk',
      prompt: "It's 10 PM. Your biggest exam is tomorrow morning. Which reaction is closest to yours?",
      subtext: 'Go with your first instinct — not what you wish you felt.',
      options: [
        { value: 'calm_ready',    emoji: '😌', label: "Calm — I've prepared enough" },
        { value: 'focused_push',  emoji: '😤', label: 'Tense but focused — I\'ll push through' },
        { value: 'overwhelmed',   emoji: '😰', label: "Overwhelmed — can't think straight" },
        { value: 'numb_shutdown', emoji: '😶', label: 'Gone blank — mind completely shut down' },
      ],
      maps_to: 'stress_response_type',
    },
    {
      id: 'stress_recovery', type: 'situation_choice',
      prompt: 'The exam is over. It went badly. How long before you genuinely feel okay again?',
      subtext: 'Think about the last time something academic went wrong.',
      options: [
        { value: 'hours', emoji: '⚡', label: 'A few hours — I reset quickly' },
        { value: 'day',   emoji: '🌅', label: 'By the next morning' },
        { value: 'days',  emoji: '📅', label: '2–3 days to fully process it' },
        { value: 'week',  emoji: '🗓️', label: 'A week or more' },
      ],
      maps_to: 'stress_recovery_speed',
    },
    {
      id: 'inbox_scenario', type: 'scenario_image', scene: 'inbox_flood',
      prompt: 'You see this on your phone. What happens inside you in the first 3 seconds?',
      subtext: 'Your immediate physical reaction — before you start reading.',
      options: [
        { value: 'immediate_action', emoji: '🎯', label: "Slight buzz — I'll just clear them" },
        { value: 'mild_anxiety',     emoji: '😬', label: 'Mild tension in my chest' },
        { value: 'strong_avoidance', emoji: '😖', label: 'Strong urge to put the phone face-down' },
        { value: 'paralysis',        emoji: '🫥', label: "Freeze — can't start with this many" },
      ],
      maps_to: 'notification_stress',
    },
    {
      id: 'coping_when_overwhelmed', type: 'situation_choice',
      prompt: "Deadline in 2 hours, you're not done. What do you actually do?",
      subtext: "Not what you'd advise someone else — what YOU do.",
      options: [
        { value: 'social',      emoji: '💬', label: 'Call or text someone immediately' },
        { value: 'isolate',     emoji: '🚪', label: 'Shut everyone out and grind alone' },
        { value: 'move',        emoji: '🚶', label: 'Step away briefly — walk, pace, breathe' },
        { value: 'distract',    emoji: '📱', label: 'Spiral into phone or Netflix for a bit' },
        { value: 'freeze_push', emoji: '🧱', label: 'Freeze then force myself through it' },
      ],
      maps_to: 'coping_style',
    },
  ],
  sleep: [
    {
      id: 'sleep_scenario', type: 'scenario_image', scene: 'late_night_phone',
      prompt: "This is you at 2 AM on a Sunday. How often does this actually happen?",
      subtext: 'Be honest — your twin needs accurate data, not aspirational answers.',
      options: [
        { value: 'rarely',       emoji: '😇', label: "Rarely — I'm usually asleep by midnight" },
        { value: 'sometimes',    emoji: '🤷', label: 'Once or twice a week' },
        { value: 'often',        emoji: '😴', label: '3–4 nights a week' },
        { value: 'almost_always',emoji: '🌙', label: 'Almost every night' },
      ],
      maps_to: 'late_night_frequency',
    },
    {
      id: 'sleep_hours', type: 'scale_visual',
      prompt: 'On most nights, how many hours do you actually sleep?',
      subtext: 'Drag to your real average — not your goal.',
      min: 3, max: 12, step: 0.5, default: 7, unit: 'hours',
      maps_to: 'sleep_hours',
    },
    {
      id: 'chronotype', type: 'situation_choice',
      prompt: 'If you had no alarms and no obligations — when would you naturally wake up?',
      subtext: "Your body's honest preference.",
      options: [
        { value: 'early',   emoji: '🌅', label: "Before 7 AM — I'm a natural early riser" },
        { value: 'morning', emoji: '☀️', label: '7–9 AM — morning person' },
        { value: 'midday',  emoji: '🕙', label: '9–11 AM — I take my time' },
        { value: 'late',    emoji: '🌆', label: "After 11 AM — definitely not morning" },
      ],
      maps_to: 'chronotype',
    },
    {
      id: 'sleep_quality_driver', type: 'single_pill',
      prompt: 'What most often ruins your sleep?',
      subtext: 'Pick the single biggest culprit.',
      options: [
        { value: 'rumination',   label: "Mind won't stop — replaying things" },
        { value: 'phone',        label: 'Phone in bed — can\'t put it down' },
        { value: 'deadlines',    label: 'Deadline anxiety the night before' },
        { value: 'schedule',     label: 'Irregular schedule — no fixed bedtime' },
        { value: 'environment',  label: 'Noise / light / temperature' },
        { value: 'fine',         label: 'Nothing — I sleep fine usually' },
      ],
      maps_to: 'sleep_disruptor',
    },
  ],
  social: [
    {
      id: 'social_scenario', type: 'scenario_image', scene: 'social_party',
      prompt: "You walk into this gathering — people you know a bit but aren't close to. Gut reaction?",
      subtext: "First instinct only — don't overthink.",
      options: [
        { value: 'energised', emoji: '✨', label: 'Energised — this is fun' },
        { value: 'neutral',   emoji: '😐', label: "Neutral — I'll see how it goes" },
        { value: 'managing',  emoji: '🎭', label: "I'll manage but prefer smaller groups" },
        { value: 'drained',   emoji: '🔋', label: 'Already dreading the small talk' },
      ],
      maps_to: 'social_energy_type',
    },
    {
      id: 'social_stress_behavior', type: 'situation_choice',
      prompt: "You're stressed and a friend asks if you want to talk. What do you actually want?",
      subtext: "In the moment — not what you know you should do.",
      options: [
        { value: 'talk_immediately',  emoji: '💬', label: 'Yes — talking out loud helps me process' },
        { value: 'talk_later',        emoji: '⏰', label: 'Later maybe — I need to sit with it first' },
        { value: 'presence_no_talk',  emoji: '🤝', label: "Just be nearby — don't need to talk about it" },
        { value: 'full_alone',        emoji: '🚪', label: 'Alone completely — contact makes it worse' },
      ],
      maps_to: 'stress_social_behavior',
    },
    {
      id: 'isolation_scenario', type: 'scenario_image', scene: 'empty_room',
      prompt: "You've been alone and quiet for 48 hours with no meaningful contact. How do you feel?",
      subtext: 'Think of the last time this actually happened.',
      options: [
        { value: 'recharged',  emoji: '🔋', label: 'Recharged — exactly what I needed' },
        { value: 'okay',       emoji: '😌', label: 'Okay, but ready to reconnect now' },
        { value: 'low_mood',   emoji: '😔', label: 'Noticeably lower mood and energy' },
        { value: 'distressed', emoji: '😟', label: 'Unsettled — silence amplifies bad thoughts' },
      ],
      maps_to: 'isolation_response',
    },
    {
      id: 'social_media', type: 'single_pill',
      prompt: 'Social media and your mood — what\'s the honest relationship?',
      subtext: "Most people's answer surprises them.",
      options: [
        { value: 'positive',     label: 'Usually lifts my mood — I enjoy it' },
        { value: 'neutral',      label: "Neither helps nor hurts" },
        { value: 'compare_down', label: 'Leaves me comparing and feeling worse' },
        { value: 'fomo',         label: 'Induces FOMO — restless after scrolling' },
        { value: 'numbing',      label: 'I use it to avoid feeling things' },
      ],
      maps_to: 'social_media_pattern',
    },
  ],
  academic: [
    {
      id: 'paths_scenario', type: 'scenario_image', scene: 'two_paths',
      prompt: "A major assignment is due in 3 days. Which path feels like you?",
      subtext: "The one you actually take — not the one you wish you took.",
      options: [
        { value: 'plan_steady',  emoji: '🗺️', label: 'Methodical — plan it out, work steadily' },
        { value: 'sprint_end',   emoji: '⚡', label: 'I always sprint at the end regardless' },
        { value: 'overthink',    emoji: '🔄', label: 'Overthink the plan and lose time planning' },
        { value: 'avoid_burst',  emoji: '🎯', label: 'Avoid it until pressure makes me burst through' },
      ],
      maps_to: 'academic_work_style',
    },
    {
      id: 'grade_impact', type: 'situation_choice',
      prompt: 'You get a lower grade than expected. How long does it genuinely affect your mood?',
      subtext: 'Your honest emotional duration — not what you wish it were.',
      options: [
        { value: 'minutes', emoji: '⚡', label: 'I shrug it off within the hour' },
        { value: 'day',     emoji: '🌅', label: 'Bothers me for the rest of the day' },
        { value: 'days',    emoji: '📅', label: '2–3 days before I stop thinking about it' },
        { value: 'week',    emoji: '🗓️', label: 'A week or more — grades hit my self-worth hard' },
      ],
      maps_to: 'grade_impact',
    },
    {
      id: 'academic_identity', type: 'single_pill',
      prompt: 'Complete: "When I do well academically, I feel..."',
      subtext: 'First word that comes to mind.',
      options: [
        { value: 'validated',   label: "Validated — like I'm worth something" },
        { value: 'satisfied',   label: "Satisfied — good but it's just one measure" },
        { value: 'relieved',    label: 'Relieved — pressure off' },
        { value: 'indifferent', label: "Indifferent — grades don't define me" },
        { value: 'temporary',   label: 'Briefly good, then anxious about the next thing' },
      ],
      maps_to: 'academic_identity',
    },
    {
      id: 'academic_stressor', type: 'multi_select',
      prompt: 'Which academic situations stress you the most?',
      subtext: 'Select all that apply.',
      options: [
        { value: 'exams',         emoji: '📝', label: 'High-stakes exams' },
        { value: 'deadlines',     emoji: '⏰', label: 'Multiple simultaneous deadlines' },
        { value: 'group_work',    emoji: '👥', label: 'Group work and depending on others' },
        { value: 'presentations', emoji: '🎤', label: 'Presentations or public speaking' },
        { value: 'uncertainty',   emoji: '❓', label: "Not knowing what to expect" },
        { value: 'comparison',    emoji: '📊', label: 'Being compared to peers' },
      ],
      maps_to: 'academic_stressors',
    },
  ],
  emotional: [
    {
      id: 'emotional_awareness', type: 'situation_choice',
      prompt: 'A friend asks "how are you really doing?" — how easy is it to actually answer?',
      subtext: 'Your relationship with your own emotional states.',
      options: [
        { value: 'very_aware',   emoji: '🔍', label: "Easy — I'm quite tuned in to how I feel" },
        { value: 'aware_delay',  emoji: '⏱️', label: 'I know after a delay — it takes time to identify' },
        { value: 'vague',        emoji: '🌫️', label: "Vague sense — I can't always name it" },
        { value: 'disconnected', emoji: '🫥', label: "I often don't know until I break down" },
      ],
      maps_to: 'emotional_awareness_level',
    },
    {
      id: 'emotional_expression', type: 'single_pill',
      prompt: "When you're going through something hard, what do most people around you think?",
      subtext: 'What they actually perceive — not what you tell them.',
      options: [
        { value: 'open',      label: "They know — I'm an open book" },
        { value: 'selective', label: "A few close people know, most don't" },
        { value: 'masked',    label: "Most assume I'm fine — I hide it well" },
        { value: 'isolated',  label: "Nobody knows — I keep everything inside" },
      ],
      maps_to: 'emotional_expression_style',
    },
    {
      id: 'burnout_early_signs', type: 'multi_select',
      prompt: "When you're heading toward burnout, what are YOUR first signs?",
      subtext: 'These become your personal early warning triggers in your twin.',
      options: [
        { value: 'irritability',    emoji: '😠', label: 'Irritability — small things enrage me' },
        { value: 'sleep_change',    emoji: '😴', label: 'Sleep changes — too much or too little' },
        { value: 'procrastination', emoji: '🔄', label: 'Procrastination spikes dramatically' },
        { value: 'social_withdraw', emoji: '🚪', label: 'Withdrawing from people I normally enjoy' },
        { value: 'physical_signs',  emoji: '🤢', label: 'Physical signs — headaches, nausea' },
        { value: 'cynicism',        emoji: '🌑', label: 'Everything feels pointless' },
        { value: 'appetite',        emoji: '🍽️', label: 'Appetite changes significantly' },
      ],
      maps_to: 'burnout_early_signs',
    },
    {
      id: 'mood_regulation', type: 'situation_choice',
      prompt: "You're in a bad mood for no clear reason. What happens next?",
      subtext: 'The most honest description of your typical pattern.',
      options: [
        { value: 'investigate',  emoji: '🔍', label: 'I examine it — journal, think, talk to myself' },
        { value: 'distract_out', emoji: '🎮', label: 'Distract myself out of it — activity, media' },
        { value: 'ride_out',     emoji: '🌊', label: 'I just ride it out — let time do it' },
        { value: 'amplify',      emoji: '📢', label: 'I often make it worse by overthinking' },
      ],
      maps_to: 'mood_regulation_style',
    },
  ],
  treatment: [
    {
      id: 'music_response', type: 'situation_choice',
      prompt: "You're anxious before something important. Someone puts on music. What happens?",
      subtext: 'Your actual physiological response to music when stressed.',
      options: [
        { value: 'high',    emoji: '🎵', label: 'Noticeably calms me — strong effect' },
        { value: 'medium',  emoji: '🎶', label: 'Helps a bit — mild background effect' },
        { value: 'depends', emoji: '🤔', label: 'Depends entirely on the genre' },
        { value: 'low',     emoji: '🔇', label: 'No effect — or it distracts me more' },
      ],
      maps_to: 'music_receptivity',
    },
    {
      id: 'intervention_preference', type: 'multi_select',
      prompt: 'Which of these have ever genuinely helped you when stressed?',
      subtext: "Not what you've heard is good — what's actually worked for you.",
      options: [
        { value: 'breathing',  emoji: '🌬️', label: 'Breathing exercises or box breathing' },
        { value: 'physical',   emoji: '🏃', label: 'Physical activity — walk, gym, stretch' },
        { value: 'journaling', emoji: '📓', label: 'Writing things out — journaling' },
        { value: 'talking',    emoji: '💬', label: 'Talking to someone I trust' },
        { value: 'nature',     emoji: '🌿', label: 'Being outside — fresh air, sunlight' },
        { value: 'structure',  emoji: '📋', label: 'Making a plan or to-do list' },
        { value: 'sleep',      emoji: '😴', label: 'Sleep — just resting it away' },
        { value: 'creative',   emoji: '🎨', label: 'Creative outlet — music, art, cooking' },
      ],
      maps_to: 'effective_interventions',
    },
    {
      id: 'preferred_modality', type: 'single_pill',
      prompt: 'When you need help managing stress, you prefer...',
      subtext: 'How your twin delivers recommendations to you.',
      options: [
        { value: 'self_directed', label: 'Tools to work through it myself' },
        { value: 'guided',        label: 'Someone walking me through step by step' },
        { value: 'information',   label: 'Understanding why I feel this way first' },
        { value: 'quick_fixes',   label: 'Quick practical things I can do right now' },
      ],
      maps_to: 'preferred_modality',
    },
    {
      id: 'help_seeking', type: 'single_pill',
      prompt: 'When things get genuinely difficult, how do you feel about asking for professional help?',
      subtext: 'Your honest current attitude — not the ideal one.',
      options: [
        { value: 'open',      label: "Completely open — I'd reach out without hesitation" },
        { value: 'willing',   label: "Willing but I'd wait to see if it passes first" },
        { value: 'reluctant', label: "Reluctant — feels like admitting weakness" },
        { value: 'resistant', label: "I'd strongly avoid it unless absolutely forced" },
      ],
      maps_to: 'help_seeking_attitude',
    },
  ],
};

// ─── Phone Permissions ─────────────────────────────────────────────────────
const PHONE_PERMISSIONS = [
  {
    id: 'screen_time', icon: <Clock className="w-5 h-5"/>,
    label: 'Screen Time & App Usage',
    desc: 'Total daily screen time, which apps you use most, usage patterns across the day.',
    why: 'Heavy phone use after 10 PM is one of the strongest predictors of next-day stress.',
    color: '#EEF0FF', iconColor: '#6366F1', risk: 'low',
  },
  {
    id: 'notifications', icon: <Bell className="w-5 h-5"/>,
    label: 'Notification Volume',
    desc: 'How many notifications you receive per hour and when you check them.',
    why: 'Notification density correlates strongly with cognitive load and emotional fragmentation.',
    color: '#FFF7ED', iconColor: '#F59E0B', risk: 'low',
  },
  {
    id: 'battery', icon: <Battery className="w-5 h-5"/>,
    label: 'Battery & Charging Patterns',
    desc: "When your phone charges — a reliable proxy for sleep schedule and daily rhythm.",
    why: 'Charging patterns are a passive proxy for sleep timing without needing sleep tracking.',
    color: '#F0FDF4', iconColor: '#22C55E', risk: 'low',
  },
  {
    id: 'connectivity', icon: <Wifi className="w-5 h-5"/>,
    label: 'Connectivity Patterns',
    desc: "Wi-Fi and location change frequency — how often you're moving vs. isolated at home.",
    why: 'Reduced mobility is an early behavioural indicator of social withdrawal.',
    color: '#F0F4FF', iconColor: '#3B82F6', risk: 'medium',
  },
  {
    id: 'call_sms', icon: <Smartphone className="w-5 h-5"/>,
    label: 'Call & Message Frequency',
    desc: 'Volume and timing of calls and messages — never content.',
    why: 'Drop in outbound communication is the most reliable early sign of social withdrawal.',
    color: '#FFF0F3', iconColor: '#EC4899', risk: 'medium',
  },
];

// ─── UI Sub-Components ─────────────────────────────────────────────────────
function OptionButton({ option, selected, onClick, multiSelect }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all"
      style={{
        backgroundColor: selected ? T.primaryLight : T.surfaceAlt,
        border: `2px solid ${selected ? T.primary : 'transparent'}`,
        transform: selected ? 'translateX(4px)' : 'none',
        boxShadow: selected ? '0 2px 12px rgba(42,124,111,0.12)' : 'none',
      }}
    >
      {option.emoji && <span className="text-xl w-8 text-center flex-shrink-0">{option.emoji}</span>}
      {multiSelect && (
        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: selected ? T.primary : T.white, border: `2px solid ${selected ? T.primary : T.border}` }}>
          {selected && <Check className="w-3 h-3 text-white"/>}
        </div>
      )}
      {!multiSelect && !option.emoji && (
        <div className="w-5 h-5 rounded-full flex-shrink-0"
          style={{ border: `2px solid ${selected ? T.primary : T.border}`, backgroundColor: selected ? T.primary : T.white }}/>
      )}
      <span className="text-sm font-medium leading-snug" style={{ color: T.text }}>{option.label}</span>
    </button>
  );
}

function PillOption({ option, selected, onClick }) {
  return (
    <button onClick={onClick}
      className="px-4 py-2.5 rounded-full text-sm font-medium transition-all"
      style={{
        backgroundColor: selected ? T.primary : T.white,
        color: selected ? '#FFFFFF' : T.textMuted,
        border: `1.5px solid ${selected ? T.primary : T.border}`,
        transform: selected ? 'translateY(-2px)' : 'none',
        boxShadow: selected ? '0 4px 12px rgba(42,124,111,0.2)' : 'none',
      }}
    >
      {option.label}
    </button>
  );
}

function SleepSlider({ value, onChange }) {
  const getColor = (v) => v < 5 ? '#DC2626' : v < 6.5 ? '#D97706' : '#2D9B6B';
  const getMessage = (v) =>
    v < 5 ? 'Significantly below healthy range' :
    v < 6.5 ? 'Below recommended amount' :
    v <= 9 ? 'Within healthy range' :
    'Above average — may indicate fatigue or depression';
  return (
    <div className="mt-6">
      <div className="text-center mb-4">
        <span className="text-5xl font-heading font-light" style={{ color: getColor(value) }}>{value}</span>
        <span className="text-xl ml-1" style={{ color: T.textFaint }}>hrs</span>
        <div className="text-sm mt-1" style={{ color: T.textFaint }}>{getMessage(value)}</div>
      </div>
      <input type="range" min={3} max={12} step={0.5} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full" style={{ accentColor: getColor(value) }}/>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: T.textFaint }}>3h</span>
        <span className="text-xs" style={{ color: T.textFaint }}>12h</span>
      </div>
    </div>
  );
}

function QuestionBlock({ question, answers, onAnswer }) {
  const val = answers[question.id];
  const toggle = (optVal) => {
    if (question.type === 'multi_select') {
      const cur = val || [];
      onAnswer(question.id, cur.includes(optVal) ? cur.filter(v => v !== optVal) : [...cur, optVal]);
    } else {
      onAnswer(question.id, optVal);
    }
  };
  return (
    <div className="mb-8">
      <p className="text-base font-semibold mb-1 leading-snug" style={{ color: T.text }}>{question.prompt}</p>
      {question.subtext && <p className="text-sm mb-4" style={{ color: T.textFaint }}>{question.subtext}</p>}

      {question.type === 'scenario_image' && SCENES[question.scene] && (
        <div className="rounded-2xl overflow-hidden mb-4" style={{ height: '160px', border: `2px solid ${val ? T.primary : T.border}` }}>
          {SCENES[question.scene]}
        </div>
      )}

      {question.type === 'scale_visual' && (
        <SleepSlider value={val ?? 7} onChange={v => onAnswer(question.id, v)}/>
      )}

      {question.type === 'single_pill' && (
        <div className="flex flex-wrap gap-2 mt-3">
          {question.options.map(opt => (
            <PillOption key={opt.value} option={opt} selected={val === opt.value} onClick={() => toggle(opt.value)}/>
          ))}
        </div>
      )}

      {['scenario_image','situation_choice','multi_select'].includes(question.type) && (
        <div className="space-y-2 mt-2">
          {question.options.map(opt => (
            <OptionButton key={opt.value} option={opt}
              selected={question.type === 'multi_select' ? (val||[]).includes(opt.value) : val === opt.value}
              onClick={() => toggle(opt.value)}
              multiSelect={question.type === 'multi_select'}/>
          ))}
        </div>
      )}
    </div>
  );
}

function PhonePermissionsScreen({ permissions, onChange }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div>
      <div className="flex items-start gap-3 p-4 rounded-2xl mb-5"
        style={{ backgroundColor: '#EEF0FF', border: '1.5px solid #C7D2FE' }}>
        <Activity className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#6366F1' }}/>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#3730A3' }}>Why phone signals matter</p>
          <p className="text-xs mt-0.5" style={{ color: '#4338CA' }}>
            Passive phone data fills the gaps between your check-ins. Your twin updates every 6 hours
            even when you're not actively logging.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {PHONE_PERMISSIONS.map(perm => {
          const isOn = permissions[perm.id] ?? false;
          const isExp = expanded === perm.id;
          return (
            <div key={perm.id} className="rounded-2xl overflow-hidden transition-all"
              style={{ backgroundColor: isOn ? perm.color : T.surfaceAlt, border: `1.5px solid ${isOn ? perm.iconColor+'40' : 'transparent'}` }}>
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => onChange(perm.id, !isOn)}
                  className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: isOn ? T.primary : T.border }}>
                  <div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
                    style={{ left: isOn ? '24px' : '4px' }}/>
                </button>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: perm.iconColor+'18', color: perm.iconColor }}>
                  {perm.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: T.text }}>{perm.label}</p>
                    {perm.risk === 'medium' && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: T.accentLight, color: T.accent }}>sensitive</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: T.textFaint }}>{perm.desc}</p>
                </div>
                <button onClick={() => setExpanded(isExp ? null : perm.id)}
                  className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
                  style={{ color: T.textFaint, backgroundColor: isExp ? T.border : 'transparent' }}>
                  {isExp ? '▲' : 'Why?'}
                </button>
              </div>
              {isExp && (
                <div className="px-4 pb-4" style={{ borderTop: `1px solid ${T.border}` }}>
                  <p className="text-xs pt-3 leading-relaxed" style={{ color: T.textMuted }}>
                    <span className="font-semibold">Why this matters: </span>{perm.why}
                  </p>
                  <p className="text-xs mt-2" style={{ color: T.textFaint }}>
                    We never access content — only metadata and usage patterns. Revoke anytime in Settings.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 p-3 rounded-xl text-center text-xs" style={{ backgroundColor: T.surfaceAlt, color: T.textFaint }}>
        🔒 All phone signals are processed on-device and stored encrypted. No content is ever read.
      </div>
    </div>
  );
}

function ConsentScreen({ consents, onChange }) {
  const items = [
    { key: 'mood',     icon: '💬', label: 'Mood check-ins',    desc: 'Journal entries and mood logs you submit manually' },
    { key: 'academic', icon: '📚', label: 'Academic schedule', desc: 'Course load context for stress calibration' },
    { key: 'research', icon: '🔬', label: 'Anonymous research',desc: 'Help improve the model for all students (fully anonymised, opt-out anytime)' },
  ];
  return (
    <div>
      <div className="p-4 rounded-2xl mb-5" style={{ backgroundColor: T.primaryLight, border: `1.5px solid ${T.primary}30` }}>
        <p className="text-sm" style={{ color: T.primary }}>
          <span className="font-semibold">Your data, your rules.</span> You can change any of these later in Settings.
        </p>
      </div>
      <div className="space-y-3">
        {items.map(item => {
          const isOn = consents[item.key] ?? false;
          return (
            <div key={item.key} className="flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer"
              style={{ backgroundColor: isOn ? T.primaryLight : T.surfaceAlt, border: `1.5px solid ${isOn ? T.primary+'40' : 'transparent'}` }}
              onClick={() => onChange(item.key, !isOn)}>
              <button className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors mt-0.5"
                style={{ backgroundColor: isOn ? T.primary : T.border }}>
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: isOn ? '24px' : '4px' }}/>
              </button>
              <div>
                <div className="text-sm font-medium" style={{ color: T.text }}>
                  <span className="mr-1.5">{item.icon}</span>{item.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: T.textFaint }}>{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phonePermissions, setPhonePermissions] = useState({
    screen_time: false, notifications: false, battery: false, connectivity: false, call_sms: false,
  });
  const [consents, setConsents] = useState({ mood: true, academic: false, research: false });
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef(null);
  const currentSection = SECTIONS[sectionIdx];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [sectionIdx]);

  const handleAnswer = (qId, val) => setAnswers(p => ({ ...p, [qId]: val }));
  const handlePhone = (id, val) => setPhonePermissions(p => ({ ...p, [id]: val }));
  const handleConsent = (key, val) => setConsents(p => ({ ...p, [key]: val }));

  const canProceed = () => {
    if (['welcome','phone','consent','done'].includes(currentSection.id)) return true;
    const qs = SECTION_QUESTIONS[currentSection.id] || [];
    return qs.some(q => {
      const a = answers[q.id];
      if (q.type === 'scale_visual') return true;
      if (q.type === 'multi_select') return (a||[]).length > 0;
      return !!a;
    });
  };

  const handleComplete = async () => {
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/api/onboarding/complete`, {
        stress_personality: {
          response_type: answers.stress_scenario_1,
          recovery_speed: answers.stress_recovery,
          notification_stress: answers.inbox_scenario,
          coping_style: answers.coping_when_overwhelmed,
        },
        sleep_baseline: {
          late_night_frequency: answers.sleep_scenario,
          typical_hours: answers.sleep_hours ?? 7,
          chronotype: answers.chronotype,
          sleep_disruptor: answers.sleep_quality_driver,
        },
        social_baseline: {
          type: answers.social_scenario,
          stress_behavior: answers.social_stress_behavior,
          isolation_response: answers.isolation_scenario,
          social_media_pattern: answers.social_media,
        },
        academic_relationship: {
          work_style: answers.paths_scenario,
          grade_impact: answers.grade_impact,
          identity_weight: answers.academic_identity,
          stressors: answers.academic_stressor || [],
        },
        emotional_awareness: {
          awareness_level: answers.emotional_awareness,
          expression_style: answers.emotional_expression,
          burnout_signs: answers.burnout_early_signs || [],
          regulation_style: answers.mood_regulation,
        },
        treatment_preferences: {
          music_receptivity: answers.music_response,
          effective_interventions: answers.intervention_preference || [],
          preferred_modality: answers.preferred_modality,
          help_seeking: answers.help_seeking,
        },
        phone_signals: phonePermissions,
        consents: {
          ...consents,
          phone_screen_time: phonePermissions.screen_time,
          phone_notifications: phonePermissions.notifications,
          phone_battery: phonePermissions.battery,
          phone_connectivity: phonePermissions.connectivity,
          phone_call_sms: phonePermissions.call_sms,
        },
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Profile saved — building your Digital Twin…');
      if (refreshUser) await refreshUser();
      navigate('/dashboard');
    } catch {
      toast.error('Something went wrong. Try again.');
      setSubmitting(false);
    }
  };

  const progress = (sectionIdx / (SECTIONS.length - 1)) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: T.bg }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-40"
        style={{ backgroundColor: 'rgba(247,245,240,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
        <div className="max-w-lg mx-auto px-5 py-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2" style={{ scrollbarWidth: 'none' }}>
            {SECTIONS.slice(1, -1).map((s, i) => {
              const realIdx = i + 1;
              const done = sectionIdx > realIdx;
              const active = sectionIdx === realIdx;
              return (
                <div key={s.id} className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: done ? T.primaryLight : active ? T.primary : T.white,
                    color: done ? T.primary : active ? '#FFFFFF' : T.textFaint,
                    border: `1px solid ${done ? T.primary+'40' : active ? T.primary : T.border}`,
                  }}>
                  {done ? <Check className="w-2.5 h-2.5"/> : <span>{s.icon}</span>}
                  {active && <span className="ml-0.5">{s.label}</span>}
                </div>
              );
            })}
          </div>
          <div className="w-full rounded-full h-1" style={{ backgroundColor: T.border }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: T.primary }}/>
          </div>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 py-8">

          {currentSection.id === 'welcome' && (
            <div data-testid="onboarding-step-1">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
                style={{ backgroundColor: T.primaryLight }}>🧠</div>
              <h1 className="text-3xl font-heading font-semibold mb-3 leading-tight" style={{ color: T.text }}>
                Hey {user?.name?.split(' ')[0] || 'there'}.<br/>
                <span style={{ color: T.primary }}>Let's understand you.</span>
              </h1>
              <p className="text-base leading-relaxed mb-8" style={{ color: T.textMuted }}>
                These questions aren't a quiz — they're how your Digital Twin learns
                <em> your specific patterns</em>. There are no right answers. The more
                honest you are, the more accurate your twin becomes.
              </p>
              <div className="space-y-3">
                {[
                  { icon: '🖼️', title: 'Image scenarios', desc: "You'll react to situations, not abstract questions" },
                  { icon: '🧬', title: '7 psychological dimensions', desc: 'Stress, sleep, social, academic, emotional, treatment preferences' },
                  { icon: '📱', title: 'Passive phone signals', desc: 'Optional — fills gaps between your check-ins automatically' },
                  { icon: '⏱️', title: '6–8 minutes', desc: 'Take your time — rushing gives your twin inaccurate data' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-2xl"
                    style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: T.text }}>{item.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: T.textFaint }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {SECTION_QUESTIONS[currentSection.id] && (
            <div data-testid={`onboarding-section-${currentSection.id}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: currentSection.color }}>{currentSection.icon}</div>
                <div>
                  <h2 className="text-xl font-heading font-semibold" style={{ color: T.text }}>{currentSection.label}</h2>
                  <p className="text-xs" style={{ color: T.textFaint }}>
                    {SECTION_QUESTIONS[currentSection.id].length} questions — go with your first instinct
                  </p>
                </div>
              </div>
              {SECTION_QUESTIONS[currentSection.id].map(q => (
                <QuestionBlock key={q.id} question={q} answers={answers} onAnswer={handleAnswer}/>
              ))}
            </div>
          )}

          {currentSection.id === 'phone' && (
            <div data-testid="onboarding-phone-signals">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#F0F4FF' }}>📱</div>
                <div>
                  <h2 className="text-xl font-heading font-semibold" style={{ color: T.text }}>Phone Signals</h2>
                  <p className="text-xs" style={{ color: T.textFaint }}>Passive data — no content ever accessed</p>
                </div>
              </div>
              <PhonePermissionsScreen permissions={phonePermissions} onChange={handlePhone}/>
            </div>
          )}

          {currentSection.id === 'consent' && (
            <div data-testid="onboarding-consent">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: T.primaryLight }}>
                  <Shield className="w-6 h-6" style={{ color: T.primary }}/>
                </div>
                <div>
                  <h2 className="text-xl font-heading font-semibold" style={{ color: T.text }}>Privacy & Consent</h2>
                  <p className="text-xs" style={{ color: T.textFaint }}>Final step — your data choices</p>
                </div>
              </div>
              <ConsentScreen consents={consents} onChange={handleConsent}/>
            </div>
          )}

          {currentSection.id === 'done' && (
            <div data-testid="onboarding-done" className="text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6"
                style={{ backgroundColor: T.primaryLight }}>✨</div>
              <h2 className="text-3xl font-heading font-semibold mb-3" style={{ color: T.text }}>You're all set.</h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: T.textMuted }}>
                Your Digital Twin is being initialised with your psychological profile.
                It sharpens significantly over the first 7 days as it learns your real patterns.
              </p>
              <div className="rounded-2xl p-5 text-left mb-5"
                style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: T.textFaint }}>
                  Your baseline snapshot
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'Stress pattern', value: answers.stress_scenario_1?.replace(/_/g,' ') },
                    { label: 'Sleep', value: `${answers.sleep_hours ?? 7}h typical` },
                    { label: 'Chronotype', value: answers.chronotype },
                    { label: 'Recovery speed', value: answers.stress_recovery?.replace(/-/g,' ') },
                    { label: 'Phone signals', value: `${Object.values(phonePermissions).filter(Boolean).length} of ${PHONE_PERMISSIONS.length} enabled` },
                  ].filter(r => r.value).map(row => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: T.textFaint }}>{row.label}</span>
                      <span className="text-sm font-semibold capitalize" style={{ color: T.text }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl p-5" style={{ backgroundColor: T.primaryLight, border: `1px solid ${T.primary}20` }}>
                <div className="flex justify-between text-xs mb-2" style={{ color: T.primary }}>
                  <span className="font-semibold">Twin calibration timeline</span>
                  <span>Day 0</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: T.border }}>
                  <div className="h-full rounded-full" style={{ width: '3%', backgroundColor: T.primary }}/>
                </div>
                <div className="flex justify-between mt-3 text-xs" style={{ color: T.textFaint }}>
                  <span>First prediction: ~24h</span>
                  <span>Full calibration: Day 7–14</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer nav */}
      <div className="sticky bottom-0 z-40"
        style={{ backgroundColor: 'rgba(247,245,240,0.97)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${T.border}` }}>
        <div className="max-w-lg mx-auto px-5 py-4 flex gap-3">
          {sectionIdx > 0 && currentSection.id !== 'done' && (
            <button data-testid="onboarding-back-btn" onClick={() => setSectionIdx(s => s-1)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium"
              style={{ backgroundColor: T.white, border: `1.5px solid ${T.border}`, color: T.textMuted }}>
              <ChevronLeft className="w-4 h-4"/> Back
            </button>
          )}
          {currentSection.id !== 'done' && (
            <button data-testid="onboarding-next-btn" onClick={() => setSectionIdx(s => s+1)}
              disabled={!canProceed()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: canProceed() ? T.primary : T.border,
                color: canProceed() ? '#FFFFFF' : T.textFaint,
                cursor: canProceed() ? 'pointer' : 'not-allowed',
              }}>
              {sectionIdx === 0 ? "Let's begin" : 'Continue'}
              <ChevronRight className="w-4 h-4"/>
            </button>
          )}
          {currentSection.id === 'done' && (
            <button data-testid="onboarding-complete-btn" onClick={handleComplete} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold"
              style={{ backgroundColor: T.primary, color: '#FFFFFF' }}>
              {submitting ? 'Building your twin…' : <><Check className="w-4 h-4"/> Go to my dashboard</>}
            </button>
          )}
        </div>
        {SECTION_QUESTIONS[currentSection.id] && (
          <p className="text-center text-xs pb-3" style={{ color: T.textFaint }}>
            Skip questions you'd rather not answer — your twin uses population averages for those.
          </p>
        )}
      </div>
    </div>
  );
}