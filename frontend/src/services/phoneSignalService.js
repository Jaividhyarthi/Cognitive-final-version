/**
 * phoneSignalService.js
 *
 * Stream 2 — Behavioural signal ingestion from browser APIs.
 *
 * What this reads (all available without native app):
 *   - Battery API: level, charging state → sleep rhythm proxy
 *   - Page Visibility API: hidden/visible → screen-on proxy
 *   - Navigator.onLine: connectivity → mobility proxy
 *   - Local session tracking: time-on-page, late night flag
 *   - Notification permission state
 *
 * What it CANNOT read in a browser (needs native app):
 *   - Call/SMS volume
 *   - Other apps' screen time
 *   - Exact notification counts
 *
 * Beacons every 5 minutes to /api/phone-signals.
 * Stores last reading in localStorage for offline resilience.
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;
const BEACON_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'cm_phone_signals';

let beaconInterval = null;
let sessionStartTime = Date.now();
let hiddenTime = 0;
let lastHiddenAt = null;
let notifCheckCount = 0;

// ── Visibility tracking ───────────────────────────────────────────────────────
function setupVisibilityTracking() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lastHiddenAt = Date.now();
    } else {
      if (lastHiddenAt) {
        hiddenTime += Date.now() - lastHiddenAt;
        lastHiddenAt = null;
      }
      // Returning to page = likely checking notifications
      notifCheckCount++;
    }
  });
}

// ── Battery API ───────────────────────────────────────────────────────────────
async function getBatterySignals() {
  try {
    if (!navigator.getBattery) return {};
    const battery = await navigator.getBattery();
    return {
      battery_level: Math.round(battery.level * 100),
      is_charging: battery.charging,
    };
  } catch {
    return {};
  }
}

// ── Session-derived signals ───────────────────────────────────────────────────
function getSessionSignals() {
  const now = Date.now();
  const sessionMinutes = (now - sessionStartTime) / (1000 * 60);
  const activeMinutes = sessionMinutes - hiddenTime / (1000 * 60);

  // Screen time proxy: active minutes in this session
  // Not total device screen time — but correlated
  const screenTimeMinutes = Math.round(activeMinutes);

  // Late night: 11 PM – 3 AM local time
  const hour = new Date().getHours();
  const lateNight = hour >= 23 || hour <= 3;

  // Notification check frequency: tab focus switches per hour
  const notifChecksPerHour = sessionMinutes > 0
    ? (notifCheckCount / sessionMinutes) * 60
    : 0;

  return {
    screen_time_minutes: screenTimeMinutes,
    late_night_usage: lateNight,
    notification_checks_per_hour: Math.round(notifChecksPerHour * 10) / 10,
    is_online: navigator.onLine,
    page_visible: !document.hidden,
    timestamp: new Date().toISOString(),
  };
}

// ── Build full signal payload ─────────────────────────────────────────────────
async function buildSignalPayload() {
  const battery = await getBatterySignals();
  const session = getSessionSignals();
  return { ...battery, ...session };
}

// ── Send to backend ───────────────────────────────────────────────────────────
async function sendSignals() {
  const token = localStorage.getItem('token');
  if (!token) return; // not logged in

  try {
    const payload = await buildSignalPayload();

    // Store locally regardless of network
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...payload,
      stored_at: new Date().toISOString(),
    }));

    const res = await fetch(`${API_URL}/api/phone-signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      // Optionally log λ weights for debugging
      if (data.lambda_weights) {
        console.debug('[PhoneSignals] λ weights:', data.lambda_weights);
      }
    }
  } catch (err) {
    // Silent fail — signals are best-effort
    console.debug('[PhoneSignals] beacon failed (offline?):', err.message);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start the phone signal service.
 * Call this once after the user logs in / onboarding completes.
 */
export function startPhoneSignalService() {
  if (beaconInterval) return; // already running

  setupVisibilityTracking();
  sessionStartTime = Date.now();

  // Send immediately on start
  sendSignals();

  // Then every 5 minutes
  beaconInterval = setInterval(sendSignals, BEACON_INTERVAL_MS);

  console.debug('[PhoneSignals] Service started');
}

/**
 * Stop the service (on logout).
 */
export function stopPhoneSignalService() {
  if (beaconInterval) {
    clearInterval(beaconInterval);
    beaconInterval = null;
  }
  console.debug('[PhoneSignals] Service stopped');
}

/**
 * Force an immediate beacon (call after mood log, alert acknowledgement etc.)
 */
export function forceSignalBeacon() {
  sendSignals();
}

/**
 * Get the last stored signal reading (for display in Settings / Developer panel).
 */
export function getLastSignalReading() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}