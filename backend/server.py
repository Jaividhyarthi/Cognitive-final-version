from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
import random
import uuid
import httpx

from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

spotipy = None
SpotifyClientCredentials = None
from googleapiclient.discovery import build
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    university: Optional[str] = None
    student_id: Optional[str] = None
    role: str = "student"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    onboarding_completed: bool = False

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    university: Optional[str] = None
    student_id: Optional[str] = None
    role: str = "student"

class LoginRequest(BaseModel):
    email: str
    password: str

class Consent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category: str
    granted: bool
    granted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    withdrawn_at: Optional[datetime] = None

class BaselineProfileCreate(BaseModel):
    stress_personality: Dict[str, Any]
    sleep_baseline: Dict[str, Any]
    social_baseline: Dict[str, Any]
    academic_relationship: Dict[str, Any]
    treatment_preferences: Dict[str, Any]
    emotional_awareness: Dict[str, Any] = {}
    phone_signals: Dict[str, Any] = {}
    consents: Dict[str, Any] = {}

class BaselineProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    stress_personality: Dict[str, Any]
    sleep_baseline: Dict[str, Any]
    social_baseline: Dict[str, Any]
    academic_relationship: Dict[str, Any]
    treatment_preferences: Dict[str, Any]
    emotional_awareness: Dict[str, Any]
    phone_signals: Dict[str, Any] = {}
    consents: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TwinState(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stress_level: float
    fatigue_index: float
    emotional_stability: float
    cognitive_load: float
    burnout_risk: float
    crisis_risk: float
    # Stream 2 component scores (for paper evidence)
    p_physical: float = 0.0
    b_behavioural: float = 0.0
    a_academic: float = 0.0
    lambda_phys: float = 0.33
    lambda_beh: float = 0.33
    lambda_acad: float = 0.34
    unified_input_vector: Dict[str, Any] = {}
    contributing_factors: List[Dict[str, Any]] = []

class PhoneSignalUpdate(BaseModel):
    screen_time_minutes: Optional[float] = None
    late_night_usage: Optional[bool] = None
    notification_checks_per_hour: Optional[float] = None
    battery_level: Optional[float] = None
    is_charging: Optional[bool] = None
    is_online: Optional[bool] = None
    page_visible: Optional[bool] = None
    timestamp: Optional[str] = None

class Intervention(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str
    severity_tier: int
    triggered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "shown"
    outcome_delta: Optional[float] = None
    contributing_factors: List[str] = []

class MoodReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    mood_score: int
    notes: Optional[str] = None
    stressor_tags: List[str] = []
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    severity_tier: int
    trigger_metric: str
    trigger_value: float
    acknowledged: bool = False
    false_alarm_reported: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: str = ""
    recommended_action: str = ""

# ─────────────────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────────────────

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    token = credentials.credentials
    user = await db.users.find_one({"id": token}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return user

# ─────────────────────────────────────────────────────────────────────────────
# STREAM 2 ENGINE — λ-weighted twin state computation
# ─────────────────────────────────────────────────────────────────────────────

def compute_lambda_weights(baseline: Dict) -> Dict[str, float]:
    """
    Derive personalised λ_phys, λ_beh, λ_acad from the user's baseline profile.
    These weights control how much each stream contributes to the unified state.

    Rules grounded in the paper's personalisation logic:
    - High stress response type → higher λ_beh (behaviour signals dominate)
    - High academic identity → higher λ_acad
    - Late night frequency / phone usage → higher λ_beh
    - Poor sleep → higher λ_phys
    """
    stress_p = baseline.get("stress_personality", {})
    sleep_b  = baseline.get("sleep_baseline", {})
    social_b = baseline.get("social_baseline", {})
    acad_r   = baseline.get("academic_relationship", {})

    # Start from equal thirds
    lp, lb, la = 0.33, 0.33, 0.34

    # Stress response type shifts
    response_type = stress_p.get("response_type", "")
    if response_type in ("threshold", "combined"):
        lb += 0.06   # threshold responders are more reactive to behavioural cues
        lp -= 0.03
        la -= 0.03
    elif response_type == "slow-build":
        la += 0.05   # slow builders accumulate academic load
        lb -= 0.02
        lp -= 0.03

    # Sleep quality shifts λ_phys
    sleep_hours = float(sleep_b.get("typical_hours", 7))
    if sleep_hours < 6:
        lp += 0.08
        lb -= 0.04
        la -= 0.04
    elif sleep_hours >= 8:
        lp -= 0.04
        lb += 0.02
        la += 0.02

    # Late night phone usage → λ_beh
    late_freq = sleep_b.get("late_night_frequency", "rarely")
    if late_freq in ("often", "almost_always"):
        lb += 0.07
        lp -= 0.04
        la -= 0.03
    elif late_freq == "sometimes":
        lb += 0.03
        lp -= 0.02
        la -= 0.01

    # Academic identity → λ_acad
    identity = acad_r.get("identity_weight", "medium")
    if identity in ("high", "very-high", "validated", "temporary"):
        la += 0.08
        lb -= 0.04
        lp -= 0.04
    elif identity in ("indifferent", "low"):
        la -= 0.05
        lb += 0.03
        lp += 0.02

    # Social isolation response → λ_beh
    isolation = social_b.get("isolation_response", "okay")
    if isolation in ("low_mood", "distressed"):
        lb += 0.05
        la -= 0.03
        lp -= 0.02

    # Normalise to sum = 1.0
    total = lp + lb + la
    lp = round(max(0.10, lp / total), 3)
    lb = round(max(0.10, lb / total), 3)
    la = round(1.0 - lp - lb, 3)

    return {"lambda_phys": lp, "lambda_beh": lb, "lambda_acad": la}


def compute_physical_component(baseline: Dict, timestamp: datetime) -> Dict[str, float]:
    """
    P(t) — Physical stream.
    Uses chronotype from onboarding + time of day + sleep deprivation proxy.
    Wearable HRV/steps deferred — will plug in here when connected.
    """
    sleep_b = baseline.get("sleep_baseline", {})
    hour = timestamp.hour
    day = timestamp.weekday()  # 0=Mon, 6=Sun

    # Chronotype-adjusted energy curve
    chronotype = sleep_b.get("chronotype", "morning")
    peak_hours = {
        "early":   (6, 14),
        "morning": (8, 16),
        "midday":  (10, 18),
        "late":    (12, 20),
        "night":   (14, 22),
    }.get(chronotype, (8, 16))

    peak_start, peak_end = peak_hours
    peak_mid = (peak_start + peak_end) / 2

    # Sinusoidal energy: peaks at chronotype midpoint
    energy_curve = math.sin(math.pi * max(0, hour - peak_start) / max(1, peak_end - peak_start))
    energy_curve = max(0.0, energy_curve)

    # Fatigue baseline from sleep hours
    sleep_hours = float(sleep_b.get("typical_hours", 7))
    sleep_deficit = max(0, 7.5 - sleep_hours)  # deficit from optimal
    base_fatigue = 30 + sleep_deficit * 8  # each hour under 7.5 adds ~8 fatigue points

    # Weekend recovery
    if day >= 5:
        base_fatigue *= 0.75

    # Late night frequency adds chronic fatigue
    late_freq_map = {"rarely": 0, "sometimes": 5, "often": 12, "almost_always": 20}
    chronic_fatigue_add = late_freq_map.get(sleep_b.get("late_night_frequency", "rarely"), 0)

    fatigue = min(100, base_fatigue + chronic_fatigue_add + random.gauss(0, 6))
    # Physical stress: inverse of energy, amplified by fatigue
    physical_stress = max(0, min(100,
        (1 - energy_curve) * 40 + fatigue * 0.3 + random.gauss(0, 5)
    ))

    return {
        "physical_stress": physical_stress,
        "fatigue": fatigue,
        "energy_curve": energy_curve,
    }


def compute_behavioural_component(
    baseline: Dict,
    phone_signals: Dict,
    timestamp: datetime
) -> Dict[str, float]:
    """
    B(t) — Behavioural stream.
    Uses:
    - Phone signal consents & patterns from onboarding baseline
    - Live phone signals if submitted via /api/phone-signals endpoint
    - Social media pattern, notification stress, coping style from onboarding
    """
    stress_p = baseline.get("stress_personality", {})
    social_b = baseline.get("social_baseline", {})
    sleep_b  = baseline.get("sleep_baseline", {})
    hour = timestamp.hour
    day  = timestamp.weekday()

    # --- Notification stress component ---
    notif_stress_map = {
        "immediate_action": 5,
        "mild_anxiety": 20,
        "strong_avoidance": 38,
        "paralysis": 55,
    }
    notif_base = notif_stress_map.get(stress_p.get("notification_stress", "mild_anxiety"), 20)

    # Live signal: notification check frequency amplifies baseline
    notif_checks = phone_signals.get("notification_checks_per_hour", None)
    if notif_checks is not None:
        # >20 checks/hr = high anxiety behaviour
        notif_live = min(40, notif_checks * 1.8)
        notif_component = (notif_base * 0.5) + (notif_live * 0.5)
    else:
        notif_component = notif_base

    # --- Late night phone usage component ---
    late_night_live = phone_signals.get("late_night_usage", None)
    is_late_hour = hour >= 23 or hour <= 3
    if late_night_live is True or (late_night_live is None and is_late_hour):
        late_penalty = 18
    else:
        late_penalty = 0

    # --- Screen time component ---
    screen_time = phone_signals.get("screen_time_minutes", None)
    if screen_time is not None:
        # >4 hours = high behavioural stress signal
        screen_component = min(35, max(0, (screen_time - 120) * 0.12))
    else:
        # Estimate from time of day and social media pattern
        sm_pattern = social_b.get("social_media_pattern", "neutral")
        sm_base = {"positive": 5, "neutral": 10, "compare_down": 25, "fomo": 30, "numbing": 35}.get(sm_pattern, 10)
        screen_component = sm_base * (1.2 if 18 <= hour <= 24 else 0.8)

    # --- Social withdrawal signal ---
    isolation_resp = social_b.get("isolation_response", "okay")
    withdrawal_map = {"recharged": 0, "okay": 5, "low_mood": 20, "distressed": 35}
    withdrawal_component = withdrawal_map.get(isolation_resp, 5)

    # Weekend reduces withdrawal signal (expected to be alone)
    if day >= 5:
        withdrawal_component *= 0.6

    # --- Battery / rhythm signal ---
    battery = phone_signals.get("battery_level", None)
    is_charging = phone_signals.get("is_charging", None)
    # Very low battery + not charging at late hours = disrupted routine
    rhythm_disruption = 0
    if battery is not None and battery < 15 and not is_charging and is_late_hour:
        rhythm_disruption = 15

    # --- Aggregate behavioural stress ---
    b_stress = min(100, max(0,
        notif_component * 0.35 +
        screen_component * 0.25 +
        withdrawal_component * 0.20 +
        late_penalty * 0.12 +
        rhythm_disruption * 0.08 +
        random.gauss(0, 5)
    ))

    return {
        "behavioural_stress": b_stress,
        "notif_component": notif_component,
        "screen_component": screen_component,
        "withdrawal_component": withdrawal_component,
    }


def compute_academic_component(baseline: Dict, timestamp: datetime) -> Dict[str, float]:
    """
    A(t) — Academic stream.
    Uses onboarding data: stressors, grade impact, work style, academic identity.
    Modulated by day of week (Mon/Thu highest), time of day (9-17 peak).
    """
    acad_r   = baseline.get("academic_relationship", {})
    stress_p = baseline.get("stress_personality", {})
    hour = timestamp.hour
    day  = timestamp.weekday()  # 0=Mon

    # Day-of-week academic pressure curve
    # Mon/Thu highest (assignment days), Wed moderate, Fri/weekend low
    day_pressure = {0: 0.90, 1: 0.75, 2: 0.65, 3: 0.85, 4: 0.60, 5: 0.30, 6: 0.25}
    day_factor = day_pressure.get(day, 0.65)

    # Time-of-day academic pressure (peaks during study hours)
    if 9 <= hour <= 12:
        time_factor = 0.85
    elif 13 <= hour <= 17:
        time_factor = 0.90
    elif 18 <= hour <= 22:
        time_factor = 0.75
    elif hour >= 23 or hour <= 5:
        time_factor = 0.45  # late night studying
    else:
        time_factor = 0.30

    # Grade impact on mood → scales academic stress
    grade_impact_map = {
        "minutes": 0.15,
        "day": 0.35,
        "days": 0.60,
        "week": 0.85,
    }
    grade_sensitivity = grade_impact_map.get(acad_r.get("grade_impact", "day"), 0.35)

    # Academic identity weight
    identity_map = {
        "validated": 0.90, "temporary": 0.80, "relieved": 0.55,
        "satisfied": 0.40, "indifferent": 0.20,
        "very-high": 0.90, "high": 0.70, "medium": 0.50, "low": 0.25,
    }
    identity_weight = identity_map.get(acad_r.get("identity_weight", "medium"), 0.50)

    # Active stressors count amplifies base
    stressors = acad_r.get("stressors", [])
    if not isinstance(stressors, list):
        stressors = []
    stressor_amplifier = 1.0 + len(stressors) * 0.08

    # Work style: avoiders accumulate more stress
    work_style_map = {
        "plan_steady": 0.70,
        "sprint_end": 0.85,
        "overthink": 0.90,
        "avoid_burst": 1.00,
    }
    work_amplifier = work_style_map.get(acad_r.get("work_style", "sprint_end"), 0.85)

    # Recovery speed from stress personality
    recovery_map = {"hours": 0.5, "day": 0.7, "days": 0.85, "week": 1.0}
    recovery_weight = recovery_map.get(stress_p.get("recovery_speed", "day"), 0.7)

    # Base academic stress
    base_academic = 35 * day_factor * time_factor
    academic_stress = min(100, max(0,
        base_academic
        * (0.4 + identity_weight * 0.6)
        * stressor_amplifier
        * work_amplifier
        * (0.7 + recovery_weight * 0.3)
        + random.gauss(0, 7)
    ))

    return {
        "academic_stress": academic_stress,
        "day_factor": day_factor,
        "time_factor": time_factor,
        "grade_sensitivity": grade_sensitivity,
        "stressor_count": len(stressors),
    }


def compute_unified_twin_state(
    user_id: str,
    baseline: Dict,
    phone_signals: Dict,
    timestamp: datetime
) -> TwinState:
    """
    The core Stream 2 engine.

    S(t) = λ_phys · P(t) + λ_beh · B(t) + λ_acad · A(t)

    Each component is computed from real baseline data.
    λ weights are personalised per user from their onboarding profile.
    """
    lambdas = compute_lambda_weights(baseline)
    lp = lambdas["lambda_phys"]
    lb = lambdas["lambda_beh"]
    la = lambdas["lambda_acad"]

    phys = compute_physical_component(baseline, timestamp)
    beh  = compute_behavioural_component(baseline, phone_signals, timestamp)
    acad = compute_academic_component(baseline, timestamp)

    P = phys["physical_stress"]
    B = beh["behavioural_stress"]
    A = acad["academic_stress"]

    # Unified stress: the core formula
    unified_stress = lp * P + lb * B + la * A

    # Secondary metrics derived from component scores
    fatigue = min(100, max(0,
        phys["fatigue"] * 0.65 +
        beh["behavioural_stress"] * 0.20 +
        acad["academic_stress"] * 0.15 +
        random.gauss(0, 4)
    ))

    emotional_stability = min(100, max(0,
        100
        - unified_stress * 0.45
        - beh["withdrawal_component"] * 0.30
        - acad["academic_stress"] * 0.15
        - fatigue * 0.10
        + random.gauss(0, 6)
    ))

    cognitive_load = min(100, max(0,
        acad["academic_stress"] * 0.50
        + beh["notif_component"] * 0.25
        + beh["screen_component"] * 0.15
        + phys["physical_stress"] * 0.10
        + random.gauss(0, 5)
    ))

    burnout_risk = min(1.0, max(0,
        (unified_stress * 0.40
         + fatigue * 0.30
         + (100 - emotional_stability) * 0.20
         + cognitive_load * 0.10) / 100
    ))

    crisis_risk = min(1.0, max(0,
        (unified_stress * 0.55
         + (100 - emotional_stability) * 0.35
         - 25) / 100
    ))

    # Build contributing factors for dashboard display
    factors = []
    component_map = [
        ("Physical load",        P,    lp),
        ("Behavioural signals",  B,    lb),
        ("Academic pressure",    A,    la),
    ]
    for name, val, weight in sorted(component_map, key=lambda x: x[1] * x[2], reverse=True):
        if val > 15:
            factors.append({
                "factor": name,
                "weight": round(val * weight / max(unified_stress, 1), 3),
                "raw_value": round(val, 1),
                "lambda": weight,
            })

    # Sub-factor details
    if beh["notif_component"] > 20:
        factors.append({"factor": "Notification stress", "weight": round(beh["notif_component"] / 100, 3), "raw_value": round(beh["notif_component"], 1)})
    if acad["stressor_count"] > 2:
        factors.append({"factor": f"{acad['stressor_count']} active academic stressors", "weight": round(acad["academic_stress"] / 200, 3), "raw_value": acad["stressor_count"]})
    if phys["fatigue"] > 60:
        factors.append({"factor": "Sleep quality deficit", "weight": round(phys["fatigue"] / 200, 3), "raw_value": round(phys["fatigue"], 1)})

    return TwinState(
        user_id=user_id,
        timestamp=timestamp,
        stress_level=round(unified_stress, 2),
        fatigue_index=round(fatigue, 2),
        emotional_stability=round(emotional_stability, 2),
        cognitive_load=round(cognitive_load, 2),
        burnout_risk=round(burnout_risk, 4),
        crisis_risk=round(max(0, crisis_risk), 4),
        p_physical=round(P, 2),
        b_behavioural=round(B, 2),
        a_academic=round(A, 2),
        lambda_phys=lp,
        lambda_beh=lb,
        lambda_acad=la,
        unified_input_vector={
            "P_t": round(P, 2),
            "B_t": round(B, 2),
            "A_t": round(A, 2),
            "lambda_phys": lp,
            "lambda_beh": lb,
            "lambda_acad": la,
            "unified_stress": round(unified_stress, 2),
            "timestamp": timestamp.isoformat(),
        },
        contributing_factors=factors[:5],
    )


def generate_alert_if_needed(state: TwinState) -> Optional[Alert]:
    """
    Generate a real threshold-based alert from computed state.
    Tiers:
      1 — stress 55-65 OR burnout 0.45-0.60
      2 — stress 65-75 OR burnout 0.60-0.75
      3 — stress >75 OR crisis_risk >0.40
    """
    s = state.stress_level
    b = state.burnout_risk
    c = state.crisis_risk

    if s > 75 or c > 0.40:
        tier = 3
        metric = "stress_level" if s > 75 else "crisis_risk"
        value = s if s > 75 else c * 100
        message = (
            f"Your stress has reached a high level ({s:.0f}/100). "
            "Your twin has detected elevated signals across multiple streams. "
            "This is a good moment to pause."
        )
        action = "Step away from your screen. Try 4-7-8 breathing: inhale 4 counts, hold 7, exhale 8. Open music therapy below."
    elif s > 65 or b > 0.60:
        tier = 2
        metric = "stress_level" if s > 65 else "burnout_risk"
        value = s if s > 65 else b * 100
        message = (
            f"Stress has been elevated for a while ({s:.0f}/100). "
            "Your behavioural and academic signals are both active. "
            "A short break now prevents it climbing further."
        )
        action = "Take a 10-minute break — walk, stretch, or get some water. Avoid opening new tasks for the next 20 minutes."
    elif s > 55 or b > 0.45:
        tier = 1
        metric = "stress_level"
        value = s
        message = (
            f"Your stress is mildly elevated ({s:.0f}/100) — "
            "nothing urgent, but worth noticing. "
            "Your twin flagged this so you can catch it early."
        )
        action = "Stay hydrated, take a short break when you get a chance, and avoid adding new commitments today."
    else:
        return None

    return Alert(
        user_id=state.user_id,
        severity_tier=tier,
        trigger_metric=metric,
        trigger_value=round(value, 2),
        message=message,
        recommended_action=action,
    )


# ─────────────────────────────────────────────────────────────────────────────
# AUTH ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@api_router.post("/auth/register", response_model=User)
async def register(input: UserCreate):
    existing = await db.users.find_one({"email": input.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(**input.model_dump(exclude={"password"}))
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['password'] = input.password
    await db.users.insert_one(doc)
    return user

@api_router.post("/auth/login")
async def login(input: LoginRequest):
    user = await db.users.find_one({"email": input.email}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": user["id"], "user": user}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return user

@api_router.post("/auth/firebase")
async def firebase_auth(token_data: dict):
    firebase_uid = token_data.get("uid")
    email = token_data.get("email")
    name = token_data.get("name", "")
    if not firebase_uid or not email:
        raise HTTPException(status_code=400, detail="Missing uid or email")
    existing = await db.users.find_one({"email": email}, {"_id": 0, "password": 0})
    if existing:
        await db.users.update_one({"email": email}, {"$set": {"firebase_uid": firebase_uid}})
        return {"token": existing["id"], "user": existing}
    user = User(name=name or email.split("@")[0], email=email, onboarding_completed=False)
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['firebase_uid'] = firebase_uid
    await db.users.insert_one(doc)
    return {"token": user.id, "user": user.model_dump()}

# ─────────────────────────────────────────────────────────────────────────────
# ONBOARDING
# ─────────────────────────────────────────────────────────────────────────────

@api_router.post("/onboarding/complete")
async def complete_onboarding(baseline: BaselineProfileCreate, user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401)

    profile = BaselineProfile(user_id=user["id"], **baseline.model_dump())
    doc = profile.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.baseline_profiles.insert_one(doc)
    await db.users.update_one({"id": user["id"]}, {"$set": {"onboarding_completed": True}})

    # Generate 30-day history using the REAL engine with this user's baseline
    baseline_dict = profile.model_dump()
    now = datetime.now(timezone.utc)
    historical_states = []

    for days_ago in range(30, 0, -1):
        for hour_offset in range(0, 24, 3):
            ts = now - timedelta(days=days_ago) + timedelta(hours=hour_offset)
            state = compute_unified_twin_state(user["id"], baseline_dict, {}, ts)
            state_doc = state.model_dump()
            state_doc['timestamp'] = state_doc['timestamp'].isoformat()
            historical_states.append(state_doc)

    if historical_states:
        await db.twin_states.insert_many(historical_states)

    # Compute λ weights and store for reference
    lambdas = compute_lambda_weights(baseline_dict)
    await db.lambda_weights.update_one(
        {"user_id": user["id"]},
        {"$set": {**lambdas, "user_id": user["id"], "updated_at": now.isoformat()}},
        upsert=True,
    )

    return {
        "message": "Onboarding completed",
        "historical_records": len(historical_states),
        "lambda_weights": lambdas,
    }

# ─────────────────────────────────────────────────────────────────────────────
# PHONE SIGNALS — live Stream 2 ingestion
# ─────────────────────────────────────────────────────────────────────────────

@api_router.post("/phone-signals")
async def ingest_phone_signals(signals: PhoneSignalUpdate, user=Depends(get_current_user)):
    """
    Receives live phone signal data from the frontend browser APIs.
    Stores as time-series and triggers a twin state recompute if enough new data.
    """
    if not user:
        raise HTTPException(status_code=401)

    doc = signals.model_dump()
    doc["user_id"] = user["id"]
    doc["received_at"] = datetime.now(timezone.utc).isoformat()
    await db.phone_signals.insert_one(doc)

    # Recompute twin state with fresh phone signals
    baseline_doc = await db.baseline_profiles.find_one(
        {"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)]
    )
    if baseline_doc:
        now = datetime.now(timezone.utc)
        phone_dict = signals.model_dump(exclude_none=True)
        state = compute_unified_twin_state(user["id"], baseline_doc, phone_dict, now)
        state_doc = state.model_dump()
        state_doc['timestamp'] = state_doc['timestamp'].isoformat()
        await db.twin_states.insert_one(state_doc)

        # Check if this new state should fire an alert
        alert = generate_alert_if_needed(state)
        if alert:
            # Only insert if no unacknowledged alert of same tier in last 2 hours
            recent = await db.alerts.find_one({
                "user_id": user["id"],
                "severity_tier": alert.severity_tier,
                "acknowledged": False,
                "created_at": {"$gte": (now - timedelta(hours=2)).isoformat()}
            })
            if not recent:
                alert_doc = alert.model_dump()
                alert_doc['created_at'] = alert_doc['created_at'].isoformat()
                await db.alerts.insert_one(alert_doc)

        return {"message": "Signals ingested", "new_stress": state.stress_level, "lambda_weights": {
            "lambda_phys": state.lambda_phys,
            "lambda_beh": state.lambda_beh,
            "lambda_acad": state.lambda_acad,
        }}

    return {"message": "Signals stored — no baseline found yet"}

@api_router.get("/phone-signals/latest")
async def get_latest_phone_signals(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401)
    latest = await db.phone_signals.find_one(
        {"user_id": user["id"]}, {"_id": 0}, sort=[("received_at", -1)]
    )
    return latest or {}

# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@api_router.get("/dashboard/current-state", response_model=TwinState)
async def get_current_state(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401)

    latest = await db.twin_states.find_one(
        {"user_id": user["id"]}, {"_id": 0}, sort=[("timestamp", -1)]
    )

    if latest:
        if isinstance(latest['timestamp'], str):
            latest['timestamp'] = datetime.fromisoformat(latest['timestamp'])
        # If last update was within 6 hours, return it
        age_hours = (datetime.now(timezone.utc) - latest['timestamp'].replace(tzinfo=timezone.utc)).total_seconds() / 3600
        if age_hours < 6:
            return TwinState(**latest)

    # Compute fresh state using real engine
    baseline_doc = await db.baseline_profiles.find_one(
        {"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)]
    )

    if baseline_doc:
        # Get latest phone signals
        phone_doc = await db.phone_signals.find_one(
            {"user_id": user["id"]}, {"_id": 0}, sort=[("received_at", -1)]
        )
        phone_signals = phone_doc or {}
        now = datetime.now(timezone.utc)
        state = compute_unified_twin_state(user["id"], baseline_doc, phone_signals, now)
        state_doc = state.model_dump()
        state_doc['timestamp'] = state_doc['timestamp'].isoformat()
        await db.twin_states.insert_one(state_doc)

        # Check for alerts
        alert = generate_alert_if_needed(state)
        if alert:
            recent = await db.alerts.find_one({
                "user_id": user["id"],
                "severity_tier": alert.severity_tier,
                "acknowledged": False,
                "created_at": {"$gte": (now - timedelta(hours=4)).isoformat()}
            })
            if not recent:
                alert_doc = alert.model_dump()
                alert_doc['created_at'] = alert_doc['created_at'].isoformat()
                await db.alerts.insert_one(alert_doc)

        return state

    # No baseline yet — generate minimal state
    fallback = TwinState(
        user_id=user["id"],
        timestamp=datetime.now(timezone.utc),
        stress_level=35, fatigue_index=40, emotional_stability=65,
        cognitive_load=30, burnout_risk=0.15, crisis_risk=0.02,
    )
    return fallback

@api_router.get("/dashboard/history")
async def get_history(days: int = 7, user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401)
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    cursor = db.twin_states.find(
        {"user_id": user["id"], "timestamp": {"$gte": start_date}},
        {"_id": 0}
    ).sort("timestamp", 1)
    history = await cursor.to_list(length=None)
    for item in history:
        if isinstance(item.get('timestamp'), str):
            item['timestamp'] = datetime.fromisoformat(item['timestamp'])
    return history

@api_router.get("/dashboard/prediction")
async def get_prediction(hours: int = 24, user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401)

    baseline_doc = await db.baseline_profiles.find_one(
        {"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)]
    )
    current = await get_current_state(user)
    predictions = []

    for h in range(0, hours + 1, 2):
        future_time = datetime.now(timezone.utc) + timedelta(hours=h)
        if baseline_doc:
            # Use real engine for each future timestep
            future_state = compute_unified_twin_state(user["id"], baseline_doc, {}, future_time)
            predicted_stress = future_state.stress_level
        else:
            # Fallback: decay toward mean
            predicted_stress = current.stress_level * (0.97 ** h) + 45 * (1 - 0.97 ** h)
            predicted_stress = max(0, min(100, predicted_stress + random.gauss(0, 3)))

        # Confidence decreases with time
        confidence = max(0.45, 1.0 - (h / hours) * 0.45)
        predictions.append({
            "timestamp": future_time.isoformat(),
            "stress_level": round(predicted_stress, 2),
            "confidence": round(confidence, 3),
        })

    return predictions

# ─────────────────────────────────────────────────────────────────────────────
# PAPER EVIDENCE — λ decay logger and component breakdown
# ─────────────────────────────────────────────────────────────────────────────

@api_router.get("/paper/lambda-history")
async def get_lambda_history(user=Depends(get_current_user)):
    """Returns λ weight history for paper Figure — decay weight logger."""
    if not user:
        raise HTTPException(status_code=401)
    cursor = db.twin_states.find(
        {"user_id": user["id"]},
        {"_id": 0, "timestamp": 1, "lambda_phys": 1, "lambda_beh": 1,
         "lambda_acad": 1, "p_physical": 1, "b_behavioural": 1, "a_academic": 1,
         "stress_level": 1}
    ).sort("timestamp", -1).limit(100)
    records = await cursor.to_list(length=None)
    return records

@api_router.get("/paper/component-breakdown")
async def get_component_breakdown(user=Depends(get_current_user)):
    """Returns P/B/A breakdown for the most recent state — paper evidence."""
    if not user:
        raise HTTPException(status_code=401)
    latest = await db.twin_states.find_one(
        {"user_id": user["id"]}, {"_id": 0}, sort=[("timestamp", -1)]
    )
    if not latest:
        raise HTTPException(status_code=404, detail="No twin state found")
    return {
        "unified_stress": latest.get("stress_level"),
        "P_physical": latest.get("p_physical"),
        "B_behavioural": latest.get("b_behavioural"),
        "A_academic": latest.get("a_academic"),
        "lambda_phys": latest.get("lambda_phys"),
        "lambda_beh": latest.get("lambda_beh"),
        "lambda_acad": latest.get("lambda_acad"),
        "formula": "S(t) = λ_phys·P(t) + λ_beh·B(t) + λ_acad·A(t)",
        "timestamp": latest.get("timestamp"),
    }

# ─────────────────────────────────────────────────────────────────────────────
# MOOD, ALERTS, INTERVENTIONS
# ─────────────────────────────────────────────────────────────────────────────

@api_router.post("/mood/report", response_model=MoodReport)
async def report_mood(
    mood_score: int,
    notes: Optional[str] = None,
    stressor_tags: List[str] = [],
    user=Depends(get_current_user)
):
    if not user:
        raise HTTPException(status_code=401)
    report = MoodReport(user_id=user["id"], mood_score=mood_score,
                        notes=notes, stressor_tags=stressor_tags)
    doc = report.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.mood_reports.insert_one(doc)

    # Mood score feeds back into twin state
    # Low mood (1-2) adds behavioural stress signal
    if mood_score <= 2:
        baseline_doc = await db.baseline_profiles.find_one(
            {"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)]
        )
        if baseline_doc:
            # Inject mood as a phone signal proxy
            mood_signal = {"user_id": user["id"], "mood_override": mood_score,
                           "received_at": datetime.now(timezone.utc).isoformat()}
            await db.phone_signals.insert_one(mood_signal)

    return report

@api_router.get("/alerts")
async def get_alerts(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401)
    cursor = db.alerts.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(10)
    alerts = await cursor.to_list(length=None)
    for a in alerts:
        if isinstance(a.get('created_at'), str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
    return alerts

@api_router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401)
    await db.alerts.update_one(
        {"id": alert_id, "user_id": user["id"]},
        {"$set": {"acknowledged": True}}
    )
    return {"message": "Alert acknowledged"}

@api_router.get("/interventions")
async def get_interventions(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401)
    cursor = db.interventions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("triggered_at", -1).limit(20)
    items = await cursor.to_list(length=None)
    for item in items:
        if isinstance(item.get('triggered_at'), str):
            item['triggered_at'] = datetime.fromisoformat(item['triggered_at'])
    return items

# ─────────────────────────────────────────────────────────────────────────────
# AI EXPLAIN
# ─────────────────────────────────────────────────────────────────────────────

@api_router.get("/ai/explain")
async def explain_metric(
    metric: str, value: float,
    contributing_factors: str = "",
    user=Depends(get_current_user)
):
    if not user:
        raise HTTPException(status_code=401)
    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"explain_{user['id']}",
            system_message=(
                "You are a compassionate student wellbeing assistant. "
                "Explain metrics in warm, plain English — no clinical jargon. "
                "Always under 3 sentences. Never alarming. Always supportive. "
                "End with one specific, actionable suggestion."
            )
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        response = await chat.send_message(UserMessage(
            text=f"A student's {metric.replace('_',' ')} is {value:.0f}/100. "
                 f"Contributing factors: {contributing_factors or 'general patterns'}. "
                 "Explain what this means for them right now in 2-3 supportive sentences."
        ))
        return {"metric": metric, "explanation": response,
                "disclaimer": "Wellbeing support tool — not a clinical diagnosis."}
    except Exception as e:
        logger.error(f"AI explain error: {e}")
        return {"metric": metric,
                "explanation": f"Your {metric.replace('_',' ')} is at {value:.0f}/100 based on recent patterns.",
                "disclaimer": "Wellbeing support tool — not a clinical diagnosis."}

# ─────────────────────────────────────────────────────────────────────────────
# MUSIC
# ─────────────────────────────────────────────────────────────────────────────

@api_router.get("/music/playlists")
async def get_music_playlists(source: str = "all"):
    playlists = []

    if source in ("all", "spotify") and spotipy:
        try:
            sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
                client_id=os.environ.get('SPOTIFY_CLIENT_ID'),
                client_secret=os.environ.get('SPOTIFY_CLIENT_SECRET')
            ))
            for name, query in [
                ("Deep Calm", "calming ambient meditation"),
                ("Focus Recovery", "focus study instrumental"),
                ("Sleep Wind-Down", "sleep relaxation piano"),
            ]:
                results = sp.search(q=query, type="playlist", limit=1)
                if results and results.get("playlists", {}).get("items"):
                    pl = results["playlists"]["items"][0]
                    tracks_data = sp.playlist_tracks(pl["id"], limit=5)
                    tracks = []
                    for item in tracks_data.get("items", []):
                        t = item.get("track")
                        if t:
                            tracks.append({
                                "id": t["id"], "title": t["name"],
                                "artist": ", ".join(a["name"] for a in t.get("artists", [])),
                                "duration": t.get("duration_ms", 0) // 1000,
                                "preview_url": t.get("preview_url"),
                                "external_url": t.get("external_urls", {}).get("spotify"),
                                "album_art": t.get("album", {}).get("images", [{}])[0].get("url"),
                            })
                    playlists.append({
                        "id": f"spotify-{pl['id']}", "name": name,
                        "source": "spotify", "tracks": tracks,
                        "image": pl.get("images", [{}])[0].get("url"),
                    })
        except Exception as e:
            logger.warning(f"Spotify error: {e}")

    if source in ("all", "youtube"):
        try:
            youtube = build("youtube", "v3",
                            developerKey=os.environ.get('YOUTUBE_API_KEY'),
                            cache_discovery=False)
            for name, query in [
                ("Deep Calm", "calming ambient music stress relief"),
                ("Focus Recovery", "study focus music instrumental"),
            ]:
                req = youtube.search().list(
                    part="snippet", q=query, type="video",
                    videoCategoryId="10", maxResults=5, order="relevance"
                )
                resp = req.execute()
                tracks = []
                for item in resp.get("items", []):
                    vid_id = item.get("id", {}).get("videoId")
                    if vid_id:
                        s = item.get("snippet", {})
                        tracks.append({
                            "id": vid_id, "title": s.get("title", ""),
                            "artist": s.get("channelTitle", ""),
                            "duration": 0, "preview_url": None,
                            "external_url": f"https://www.youtube.com/watch?v={vid_id}",
                            "album_art": s.get("thumbnails", {}).get("medium", {}).get("url"),
                            "embed_url": f"https://www.youtube.com/embed/{vid_id}",
                        })
                playlists.append({
                    "id": f"youtube-{name.lower().replace(' ','-')}",
                    "name": f"{name}", "source": "youtube", "tracks": tracks,
                    "image": tracks[0]["album_art"] if tracks else None,
                })
        except Exception as e:
            logger.warning(f"YouTube error: {e}")

    if not playlists:
        playlists = [
            {"id": "deep-calm", "name": "Deep Calm", "source": "simulated",
             "description": "Slow ambient tracks for deep relaxation",
             "tracks": [
                 {"id": "1", "title": "Weightless", "artist": "Marconi Union", "duration": 480},
                 {"id": "2", "title": "Electra", "artist": "Airstream", "duration": 360},
             ]},
            {"id": "focus-recovery", "name": "Focus Recovery", "source": "simulated",
             "description": "Gentle instrumental music to restore concentration",
             "tracks": [
                 {"id": "3", "title": "Piano Peace", "artist": "Calm Collective", "duration": 420},
                 {"id": "4", "title": "Morning Light", "artist": "Meditation Sound", "duration": 390},
             ]},
        ]
    return playlists

# ─────────────────────────────────────────────────────────────────────────────
# COUNSELOR + ADMIN
# ─────────────────────────────────────────────────────────────────────────────

@api_router.get("/counselor/students")
async def get_counselor_students(user=Depends(get_current_user)):
    if not user or user.get("role") != "counselor":
        raise HTTPException(status_code=403)
    consented = await db.consents.find(
        {"category": "counselor_access", "granted": True}, {"_id": 0}
    ).to_list(length=None)
    student_ids = [c["user_id"] for c in consented]
    students = []
    for sid in student_ids:
        student = await db.users.find_one({"id": sid}, {"_id": 0, "email": 0})
        if student:
            latest_state = await db.twin_states.find_one(
                {"user_id": sid}, {"_id": 0}, sort=[("timestamp", -1)]
            )
            history = await db.twin_states.find(
                {"user_id": sid}, {"_id": 0, "timestamp": 1, "stress_level": 1}
            ).sort("timestamp", -1).limit(7).to_list(length=None)
            students.append({
                "student": student,
                "current_state": latest_state,
                "history": list(reversed(history)),
            })
    return students

@api_router.get("/admin/analytics")
async def get_admin_analytics(user=Depends(get_current_user)):
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403)
    total_users = await db.users.count_documents({"role": "student"})
    recent_states = await db.twin_states.find(
        {"timestamp": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}},
        {"_id": 0}
    ).to_list(length=1000)
    avg_stress = sum(s.get('stress_level', 0) for s in recent_states) / max(len(recent_states), 1)
    avg_burnout = sum(s.get('burnout_risk', 0) for s in recent_states) / max(len(recent_states), 1)
    total_interventions = await db.interventions.count_documents({})
    completed = await db.interventions.count_documents({"status": "completed"})
    return {
        "total_active_users": total_users,
        "average_stress_level": avg_stress,
        "average_burnout_risk": avg_burnout,
        "total_interventions": total_interventions,
        "intervention_completion_rate": completed / total_interventions if total_interventions > 0 else 0,
    }

# ─────────────────────────────────────────────────────────────────────────────
# DEMO SEED
# ─────────────────────────────────────────────────────────────────────────────

@api_router.post("/seed/demo")
async def seed_demo_data():
    demo_accounts = [
        {"name": "Sarah Johnson", "email": "demo@student.com", "password": "demo123",
         "role": "student", "university": "Stanford University", "student_id": "STU12345"},
        {"name": "Dr. Emily Chen", "email": "demo@counselor.com", "password": "demo123",
         "role": "counselor", "university": "Stanford University", "student_id": ""},
        {"name": "Admin User", "email": "demo@admin.com", "password": "demo123",
         "role": "admin", "university": "Stanford University", "student_id": ""},
    ]
    created = []
    for account_data in demo_accounts:
        existing = await db.users.find_one({"email": account_data["email"]}, {"_id": 0})
        if existing:
            created.append({"email": account_data["email"], "status": "already exists"})
            continue
        user = User(
            name=account_data["name"], email=account_data["email"],
            role=account_data["role"], university=account_data["university"],
            student_id=account_data["student_id"], onboarding_completed=True,
        )
        doc = user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['password'] = account_data["password"]
        await db.users.insert_one(doc)

        if account_data["role"] == "student":
            # Use a realistic baseline for the demo student
            demo_baseline = {
                "stress_personality": {"response_type": "threshold", "recovery_speed": "days",
                                       "notification_stress": "strong_avoidance", "coping_style": "isolate"},
                "sleep_baseline": {"late_night_frequency": "often", "typical_hours": 6.0,
                                   "chronotype": "late", "sleep_disruptor": "deadlines"},
                "social_baseline": {"type": "neutral", "stress_behavior": "talk_later",
                                    "isolation_response": "low_mood", "social_media_pattern": "fomo"},
                "academic_relationship": {"work_style": "sprint_end", "grade_impact": "days",
                                          "identity_weight": "validated",
                                          "stressors": ["exams", "deadlines", "presentations"]},
                "emotional_awareness": {"awareness_level": "aware_delay", "expression_style": "masked",
                                        "burnout_signs": ["procrastination", "social_withdraw"],
                                        "regulation_style": "distract_out"},
                "treatment_preferences": {"music_receptivity": "high",
                                          "effective_interventions": ["breathing", "sleep", "music"],
                                          "preferred_modality": "quick_fixes",
                                          "help_seeking": "willing"},
                "phone_signals": {"screen_time": True, "notifications": True, "battery": True},
                "consents": {"mood": True, "academic": True},
            }
            profile = BaselineProfile(user_id=user.id, **demo_baseline)
            profile_doc = profile.model_dump()
            profile_doc['created_at'] = profile_doc['created_at'].isoformat()
            await db.baseline_profiles.insert_one(profile_doc)

            # Generate history with real engine
            now = datetime.now(timezone.utc)
            states = []
            for days_ago in range(30, 0, -1):
                for h in range(0, 24, 3):
                    ts = now - timedelta(days=days_ago) + timedelta(hours=h)
                    state = compute_unified_twin_state(user.id, demo_baseline, {}, ts)
                    sd = state.model_dump()
                    sd['timestamp'] = sd['timestamp'].isoformat()
                    states.append(sd)
            if states:
                await db.twin_states.insert_many(states)

            # Store λ weights
            lambdas = compute_lambda_weights(demo_baseline)
            await db.lambda_weights.update_one(
                {"user_id": user.id},
                {"$set": {**lambdas, "user_id": user.id, "updated_at": now.isoformat()}},
                upsert=True,
            )

            # Counselor consent
            consent_doc = Consent(user_id=user.id, category="counselor_access", granted=True).model_dump()
            consent_doc['granted_at'] = consent_doc['granted_at'].isoformat()
            await db.consents.insert_one(consent_doc)

        created.append({"email": account_data["email"], "status": "created", "id": user.id})
    return {"accounts": created, "message": "Demo seeded with real λ-weighted data. Password: demo123"}

# ─────────────────────────────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────────────────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

class COOPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        return response

app.add_middleware(COOPMiddleware)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()