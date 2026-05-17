import React, { useState } from 'react';
import axios from 'axios';
import { X, Send, Smile } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: '#F7F5F0',
  white: '#FFFFFF',
  primary: '#2A7C6F',
  primaryLight: '#EAF4F2',
  primaryHover: '#1F5C52',
  text: '#1C1C2E',
  textMuted: '#4A4A68',
  textFaint: '#9494A8',
  border: '#E2DDD6',
  surfaceAlt: '#F0ECE6',
};

// ── Fixed emoji moods (no broken unicode) ─────────────────────────────────────
const MOODS = [
  { score: 1, emoji: '😢', label: 'Very Bad',   ring: '#DC2626', bg: '#FEF2F2' },
  { score: 2, emoji: '😟', label: 'Bad',        ring: '#F97316', bg: '#FFF7ED' },
  { score: 3, emoji: '😐', label: 'Okay',       ring: '#EAB308', bg: '#FEFCE8' },
  { score: 4, emoji: '🙂', label: 'Good',       ring: '#22C55E', bg: '#F0FDF4' },
  { score: 5, emoji: '😊', label: 'Great',      ring: '#2A7C6F', bg: '#EAF4F2' },
];

// ── Contextual prompts per mood score ─────────────────────────────────────────
const PROMPTS = {
  1: "That sounds really tough. What's been weighing on you most today?",
  2: "Sorry to hear that. Want to write about what's going on?",
  3: "A middling day — anything specific on your mind?",
  4: "Glad things are going well. What's been good today?",
  5: "That's great to hear! What's made today feel good?",
};

// ── Main component ────────────────────────────────────────────────────────────
function MoodCheckIn({ onClose }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [journal, setJournal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedMood) return;
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${API_URL}/api/mood/report`,
        {
          mood_score: selectedMood.score,
          notes: journal.trim(),
          timestamp: new Date().toISOString(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        toast.success('Mood logged — your twin has been updated.');
      }, 1800);
    } catch {
      toast.error('Could not save your entry. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(28,28,46,0.35)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto"
        style={{
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '440px',
          // Mobile: slide up from bottom
        }}
      >
        <div
          className="relative rounded-t-3xl md:rounded-3xl overflow-hidden"
          style={{
            backgroundColor: T.white,
            boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
            border: `1px solid ${T.border}`,
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl transition-colors"
            style={{ color: T.textFaint }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = T.surfaceAlt)}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="px-6 pt-6 pb-7">

            {/* Success state */}
            {submitted ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-4">{selectedMood?.emoji}</div>
                <p className="text-base font-semibold mb-1" style={{ color: T.text }}>
                  Got it, thanks.
                </p>
                <p className="text-sm" style={{ color: T.textFaint }}>
                  Your twin will reflect this in the next update.
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                  <Smile className="w-5 h-5" style={{ color: T.primary }} />
                  <h3 className="text-base font-heading font-semibold" style={{ color: T.text }}>
                    How are you feeling right now?
                  </h3>
                </div>
                <p className="text-xs mb-5" style={{ color: T.textFaint }}>
                  Takes 30 seconds. Helps your twin stay accurate.
                </p>

                {/* Mood selector */}
                <div className="flex justify-between gap-2 mb-5">
                  {MOODS.map(mood => {
                    const active = selectedMood?.score === mood.score;
                    return (
                      <button
                        key={mood.score}
                        data-testid={`mood-btn-${mood.score}`}
                        onClick={() => setSelectedMood(mood)}
                        className="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition-all"
                        style={{
                          backgroundColor: active ? mood.bg : T.surfaceAlt,
                          border: `2px solid ${active ? mood.ring : 'transparent'}`,
                          transform: active ? 'translateY(-3px)' : 'none',
                          boxShadow: active ? `0 4px 12px ${mood.ring}30` : 'none',
                        }}
                      >
                        <span className="text-2xl">{mood.emoji}</span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: active ? mood.ring : T.textFaint }}
                        >
                          {mood.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Journal — appears after mood is picked */}
                {selectedMood && (
                  <div
                    className="rounded-2xl p-1 mb-4 transition-all"
                    style={{
                      backgroundColor: selectedMood.bg,
                      border: `1.5px solid ${selectedMood.ring}30`,
                    }}
                  >
                    <textarea
                      data-testid="mood-journal-input"
                      autoFocus
                      value={journal}
                      onChange={e => setJournal(e.target.value)}
                      placeholder={PROMPTS[selectedMood.score]}
                      rows={3}
                      className="w-full resize-none text-sm p-3 rounded-xl outline-none bg-transparent leading-relaxed"
                      style={{ color: T.text, '::placeholder': { color: T.textFaint } }}
                    />
                  </div>
                )}

                {/* Submit */}
                <button
                  data-testid="mood-submit-btn"
                  onClick={handleSubmit}
                  disabled={!selectedMood || submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: selectedMood ? T.primary : T.border,
                    color: selectedMood ? '#FFFFFF' : T.textFaint,
                    cursor: selectedMood ? 'pointer' : 'not-allowed',
                  }}
                  onMouseOver={e => {
                    if (selectedMood) e.currentTarget.style.backgroundColor = T.primaryHover;
                  }}
                  onMouseOut={e => {
                    if (selectedMood) e.currentTarget.style.backgroundColor = T.primary;
                  }}
                >
                  {submitting ? (
                    'Saving…'
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {journal.trim() ? 'Log mood & note' : 'Log mood'}
                    </>
                  )}
                </button>

                <p className="text-center text-xs mt-3" style={{ color: T.textFaint }}>
                  Journal entries are private and only visible to you.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default MoodCheckIn;