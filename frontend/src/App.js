import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { firebaseLogin, firebaseRegister, firebaseGoogleLogin, firebaseLogout } from './lib/firebase';
import LandingPage from './pages/LandingPage';
import OnboardingFlow from './pages/OnboardingFlow';
import StudentDashboard from './pages/StudentDashboard';
import DigitalTwinBrain from './pages/DigitalTwinBrain';
import CounselorPortal from './pages/CounselorPortal';
import AdminPortal from './pages/AdminPortal';
import Settings from './pages/Settings';
import TwinProfile from './pages/TwinProfile';
import MoodCheckIn from './components/MoodCheckIn';
import { Toaster } from './components/ui/sonner';
import './App.css';
import { startPhoneSignalService, stopPhoneSignalService } from './services/phoneSignalService';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ─── Smart root redirect ───────────────────────────────────────────────────
// Decides where a logged-in user lands:
//   - never completed onboarding → /onboarding
//   - counselor → /counselor
//   - admin    → /admin
//   - everyone else → /dashboard
function SmartRedirect({ user }) {
  if (!user) return <LandingPage />;
  if (!user.onboarding_completed) return <Navigate to="/onboarding" replace />;
  if (user.role === 'counselor') return <Navigate to="/counselor" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMoodCheckIn, setShowMoodCheckIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => { setUser(res.data); startPhoneSignalService(); })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const syncFirebaseUser = async (firebaseUser) => {
    const res = await axios.post(`${API_URL}/api/auth/firebase`, {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
    });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const login = async (email, password) => {
    try {
      const fbUser = await firebaseLogin(email, password);
      if (fbUser) return await syncFirebaseUser(fbUser);
    } catch (e) {}
    const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (userData) => {
    // 1. Try Firebase register
    try {
      const fbUser = await firebaseRegister(userData.email, userData.password, userData.name);
      if (fbUser) {
        try { await axios.post(`${API_URL}/api/auth/register`, userData); } catch (e) {}
        const loggedInUser = await syncFirebaseUser(fbUser);
        // Mark as new so SmartRedirect sends them to /onboarding
        const newUser = { ...loggedInUser, onboarding_completed: false };
        setUser(newUser);
        return newUser;
      }
    } catch (e) {}

    // 2. Fallback: REST-only register
    try { await axios.post(`${API_URL}/api/auth/register`, userData); } catch (e) {}
    const res = await axios.post(`${API_URL}/api/auth/login`, {
      email: userData.email,
      password: userData.password,
    });
    localStorage.setItem('token', res.data.token);
    // Force onboarding for new registrations
    const newUser = { ...res.data.user, onboarding_completed: false };
    setUser(newUser);
    startPhoneSignalService();
    return newUser;
  };

  const loginWithGoogle = async () => {
    const fbUser = await firebaseGoogleLogin();
    return await syncFirebaseUser(fbUser);
  };

  const logout = async () => {
    try { await firebaseLogout(); } catch (e) {}
    localStorage.removeItem('token');
    setUser(null);
    stopPhoneSignalService();
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
      } catch (e) {}
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F5F0' }}>
        <div style={{ color: '#2A7C6F' }} className="text-xl font-heading">Loading…</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, loginWithGoogle }}>
      <Router>
        <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0', color: '#1C1C2E' }}>
          <Routes>
            {/* Root: smart redirect based on user state */}
            <Route path="/" element={<SmartRedirect user={user} />} />

            {/* Onboarding: accessible to ANY logged-in user (including new ones) */}
            <Route
              path="/onboarding"
              element={user ? <OnboardingFlow /> : <Navigate to="/" replace />}
            />

            {/* Dashboard: only if onboarding is done */}
            <Route
              path="/dashboard"
              element={
                !user ? <Navigate to="/" replace /> :
                !user.onboarding_completed ? <Navigate to="/onboarding" replace /> :
                <StudentDashboard />
              }
            />

            {/* Digital Twin */}
            <Route
              path="/twin-brain"
              element={
                !user ? <Navigate to="/" replace /> :
                !user.onboarding_completed ? <Navigate to="/onboarding" replace /> :
                <DigitalTwinBrain />
              }
            />

            {/* Counselor portal */}
            <Route
              path="/counselor"
              element={
                user && user.role === 'counselor'
                  ? <CounselorPortal />
                  : <Navigate to="/" replace />
              }
            />

            {/* Admin portal */}
            <Route
              path="/admin"
              element={
                user && user.role === 'admin'
                  ? <AdminPortal />
                  : <Navigate to="/" replace />
              }
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={user ? <Settings /> : <Navigate to="/" replace />}
            />
            <Route
              path="/twin-profile"
              element={user ? <TwinProfile /> : <Navigate to="/" replace />}
            />
          </Routes>

          {/* Mood FAB — only after onboarding */}
          {user && user.onboarding_completed && (
            <>
              <button
                data-testid="mood-checkin-fab"
                onClick={() => setShowMoodCheckIn(true)}
                className="fixed bottom-6 right-6 rounded-full p-4 shadow-lg z-50 md:bottom-8 md:right-8 transition-transform hover:scale-105"
                style={{ backgroundColor: '#2A7C6F', color: '#FFFFFF' }}
                title="Log how you're feeling"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {showMoodCheckIn && <MoodCheckIn onClose={() => setShowMoodCheckIn(false)} />}
            </>
          )}

          <Toaster />
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;