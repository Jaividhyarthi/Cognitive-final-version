import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Brain, Shield, TrendingUp, Music, Bell, Users, X, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

function LandingPage() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    university: '',
    student_id: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        await register(formData);
        toast.success('Account created successfully!');
        navigate('/onboarding');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Authentication failed');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      toast.success('Welcome!');
      if (!user.onboarding_completed) {
        navigate('/onboarding');
      }
    } catch (error) {
      toast.error(error.message || 'Google sign-in failed');
    }
  };

  const handleDemoLogin = async () => {
    try {
      await login('demo@student.com', 'demo123');
      toast.success('Demo login — Welcome, Sarah Johnson!');
    } catch (error) {
      toast.error('Demo failed: ' + (error?.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0', color: '#1C1C2E' }}>

      {/* NAV */}
      <nav style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2DDD6' }} className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-7 h-7" style={{ color: '#2A7C6F' }} />
            <span className="text-xl font-heading font-semibold" style={{ color: '#1C1C2E' }}>
              Cognitive Mirror
            </span>
          </div>
          <Button
            data-testid="nav-get-started-btn"
            onClick={() => setShowAuth(true)}
            style={{ backgroundColor: '#2A7C6F', color: '#FFFFFF' }}
            className="hover:opacity-90 transition-opacity"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* HERO */}
      <section
        className="relative min-h-[88vh] flex items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #EAF4F2 0%, #F7F5F0 50%, #FEF9EE 100%)'
        }}
      >
        {/* Decorative soft circles */}
        <div
          className="absolute"
          style={{
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(42,124,111,0.08) 0%, transparent 70%)',
            top: '-100px',
            right: '-100px',
            pointerEvents: 'none'
          }}
        />
        <div
          className="absolute"
          style={{
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,168,56,0.07) 0%, transparent 70%)',
            bottom: '-60px',
            left: '-60px',
            pointerEvents: 'none'
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
            style={{ backgroundColor: '#EAF4F2', color: '#2A7C6F', border: '1px solid #4DB6A8' }}
          >
            <span className="w-2 h-2 rounded-full bg-current inline-block" />
            Non-diagnostic wellbeing support — not a medical device
          </div>

          <h1
            className="text-5xl sm:text-6xl font-heading font-light tracking-tight mb-6 leading-tight"
            style={{ color: '#1C1C2E' }}
          >
            Stay ahead of stress.<br />
            <span style={{ color: '#2A7C6F' }}>Before it catches up.</span>
          </h1>

          <p
            className="text-lg sm:text-xl mb-10 leading-relaxed max-w-2xl mx-auto"
            style={{ color: '#4A4A68' }}
          >
            Cognitive Mirror creates a personalised Digital Twin of your mental state —
            predicting stress 24 hours ahead and nudging you toward balance before
            things spiral.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              data-testid="hero-get-started-btn"
              onClick={() => setShowAuth(true)}
              size="lg"
              style={{ backgroundColor: '#2A7C6F', color: '#FFFFFF' }}
              className="text-lg px-8 py-6 hover:opacity-90 transition-opacity"
            >
              Create Your Twin
            </Button>
            <button
              onClick={handleDemoLogin}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg text-base font-medium transition-colors"
              style={{
                border: '1.5px solid #2A7C6F',
                color: '#2A7C6F',
                backgroundColor: 'transparent'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#EAF4F2'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Zap className="w-4 h-4" />
              Try Demo
            </button>
          </div>

          {/* Social proof strip */}
          <div className="flex items-center justify-center gap-6 mt-12 flex-wrap">
            {[
              { label: 'GDPR Compliant' },
              { label: 'FERPA Compliant' },
              { label: 'Non-Diagnostic' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: '#2A7C6F' }} />
                <span className="text-sm" style={{ color: '#9494A8' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-heading tracking-tight mb-4"
              style={{ color: '#1C1C2E' }}
            >
              How your Digital Twin works
            </h2>
            <p style={{ color: '#4A4A68' }} className="text-lg max-w-xl mx-auto">
              Three steps from data to calm.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <TrendingUp className="w-6 h-6" style={{ color: '#2A7C6F' }} />,
                bg: '#EAF4F2',
                step: '01',
                title: 'Monitor',
                desc: 'Continuous tracking of stress, fatigue, emotional stability, and cognitive load through wearable data and behavioural signals — updated every 6 hours.'
              },
              {
                icon: <Brain className="w-6 h-6" style={{ color: '#E8A838' }} />,
                bg: '#FEF3DC',
                step: '02',
                title: 'Predict',
                desc: '24-hour emotional forecasting using your Digital Twin. See stress peaks before they arrive, with confidence bands and upcoming event markers.'
              },
              {
                icon: <Bell className="w-6 h-6" style={{ color: '#2D9B6B' }} />,
                bg: '#EAFAF3',
                step: '03',
                title: 'Intervene',
                desc: 'Scaled responses: gentle nudges for mild stress, guided breathing for moderate, and music therapy plus counsellor alerts for high-risk states.'
              }
            ].map(card => (
              <div
                key={card.title}
                className="rounded-xl p-8 transition-shadow hover:shadow-md"
                style={{ border: '1px solid #E2DDD6', backgroundColor: '#FFFFFF' }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: card.bg }}
                >
                  {card.icon}
                </div>
                <div
                  className="text-xs font-mono font-semibold mb-2"
                  style={{ color: '#9494A8' }}
                >
                  {card.step}
                </div>
                <h3 className="text-xl font-heading mb-3" style={{ color: '#1C1C2E' }}>
                  {card.title}
                </h3>
                <p className="leading-relaxed text-sm" style={{ color: '#4A4A68' }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORM FEATURES */}
      <section className="py-24" style={{ backgroundColor: '#F7F5F0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-heading tracking-tight"
              style={{ color: '#1C1C2E' }}
            >
              Platform features
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            {[
              {
                icon: <Music className="w-5 h-5" style={{ color: '#2A7C6F' }} />,
                bg: '#EAF4F2',
                title: 'Music Therapy Integration',
                desc: 'Adaptive playlists triggered by your emotional state. Supports Spotify, YouTube, and Apple Music. Calm activates automatically so you don\'t have to think about it.'
              },
              {
                icon: <Shield className="w-5 h-5" style={{ color: '#E8A838' }} />,
                bg: '#FEF3DC',
                title: 'Privacy-First Design',
                desc: 'Granular consent toggles per data stream. GDPR and FERPA compliant. Data encrypted at rest and in transit. You can revoke any stream at any time.'
              },
              {
                icon: <Users className="w-5 h-5" style={{ color: '#2D9B6B' }} />,
                bg: '#EAFAF3',
                title: 'Counsellor Portal',
                desc: 'Therapists see anonymised cohort trends for consented students. Flag high-risk individuals early. 7-day alert history. No raw data is exposed without consent.'
              },
              {
                icon: <Brain className="w-5 h-5" style={{ color: '#2A7C6F' }} />,
                bg: '#EAF4F2',
                title: 'Interactive Digital Twin',
                desc: 'Run what-if simulations — "what happens if I don\'t sleep tonight?" Test interventions before they\'re applied. View your emotional trajectory over weeks.'
              }
            ].map(f => (
              <div key={f.title} className="flex gap-5">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mt-1"
                  style={{ backgroundColor: f.bg }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-base font-heading font-semibold mb-2" style={{ color: '#1C1C2E' }}>
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#4A4A68' }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-24" style={{ backgroundColor: '#2A7C6F' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-heading mb-4 text-white font-light">
            Start understanding yourself better.
          </h2>
          <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Takes 5 minutes to set up. No wearable required to get started.
          </p>
          <Button
            data-testid="footer-get-started-btn"
            onClick={() => setShowAuth(true)}
            size="lg"
            style={{ backgroundColor: '#FFFFFF', color: '#2A7C6F' }}
            className="text-lg px-8 py-6 font-semibold hover:opacity-90 transition-opacity"
          >
            Create Your Digital Twin
          </Button>
          <p className="mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Non-diagnostic wellbeing tool. Does not replace professional mental health services.
          </p>
        </div>
      </section>

      {/* AUTH MODAL */}
      {showAuth && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-2xl p-8 max-w-md w-full relative shadow-2xl"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DDD6' }}
          >
            <button
              data-testid="auth-close-btn"
              onClick={() => setShowAuth(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
              style={{ color: '#9494A8' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#F0ECE6'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-2xl font-heading mb-1" style={{ color: '#1C1C2E' }}>
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm mb-6" style={{ color: '#9494A8' }}>
              {isLogin ? 'Sign in to your Cognitive Mirror account' : 'Set up your Digital Twin in 5 minutes'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <>
                  <Input
                    data-testid="auth-name-input"
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required={!isLogin}
                    style={{ borderColor: '#E2DDD6', backgroundColor: '#F7F5F0' }}
                  />
                  <Input
                    data-testid="auth-university-input"
                    type="text"
                    placeholder="University"
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    style={{ borderColor: '#E2DDD6', backgroundColor: '#F7F5F0' }}
                  />
                  <Input
                    data-testid="auth-student-id-input"
                    type="text"
                    placeholder="Student ID"
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    style={{ borderColor: '#E2DDD6', backgroundColor: '#F7F5F0' }}
                  />
                </>
              )}
              <Input
                data-testid="auth-email-input"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                style={{ borderColor: '#E2DDD6', backgroundColor: '#F7F5F0' }}
              />
              <Input
                data-testid="auth-password-input"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                style={{ borderColor: '#E2DDD6', backgroundColor: '#F7F5F0' }}
              />
              <Button
                data-testid="auth-submit-btn"
                type="submit"
                className="w-full"
                style={{ backgroundColor: '#2A7C6F', color: '#FFFFFF' }}
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid #E2DDD6' }} />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white" style={{ color: '#9494A8' }}>or</span>
              </div>
            </div>

            <Button
              data-testid="google-signin-btn"
              type="button"
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full flex items-center justify-center gap-3"
              style={{ borderColor: '#E2DDD6', color: '#1C1C2E', backgroundColor: '#FFFFFF' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="mt-3">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  border: '1.5px dashed #E8A838',
                  color: '#C98D1E',
                  backgroundColor: '#FEF9EE'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEF3DC'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#FEF9EE'}
              >
                <Zap className="w-4 h-4" />
                Demo Login (Presentation Mode)
              </button>
              <p className="text-center text-xs mt-1" style={{ color: '#9494A8' }}>
                demo@student.com · demo123
              </p>
            </div>

            <div className="mt-4 text-center">
              <button
                data-testid="auth-toggle-btn"
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm transition-colors"
                style={{ color: '#2A7C6F' }}
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;