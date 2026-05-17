# Cognitive Mirror AI — PRD

## Original Problem Statement
Build a full-stack web application called "Cognitive Mirror AI" — a university mental health Digital Twin platform that monitors, predicts, and supports student emotional wellbeing. Includes: Landing page, onboarding wizard, student dashboard with 6 metrics, 24-hour prediction, real-time alerts (3 tiers), music therapy player, mood check-in, Digital Twin Brain 3D visualization, counselor portal, admin analytics, settings/consent management. Dark theme with teal/amber accents.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Recharts + react-force-graph-3d + Framer Motion
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key for metric explanations
- **Auth**: JWT-style token (user ID as token), role-based (student, counselor, admin)
- **Data**: Simulated wearable data (30 days historical + hourly updates)

## User Personas
- **Students**: Monitor emotional state, receive interventions, mood check-ins
- **Counselors**: View consented students' emotional trends, add notes
- **Admins**: View population-level aggregated analytics

## Core Requirements (Static)
1. Landing page with hero, feature cards, CTA
2. Multi-step onboarding wizard (5 steps)
3. Student dashboard with 6 metric cards + 24hr prediction
4. Real-time 3-tier alert system
5. Music therapy player (simulated)
6. Mood check-in (emoji + notes + stressor tags)
7. Digital Twin Brain 3D visualization
8. Counselor portal with student overview
9. Admin analytics dashboard
10. Settings with consent management, notifications, data export

## What's Been Implemented (April 13, 2026)
- [x] Landing page with hero section, feature cards, compliance badges
- [x] Auth modal (sign in / sign up toggle)
- [x] Multi-step onboarding wizard (5 steps)
- [x] Student dashboard with 6 metric cards, sparklines, progress bars
- [x] 24-hour stress prediction chart (Recharts AreaChart)
- [x] Real-time alert system (3 tiers with distinct UI)
- [x] Music therapy player (simulated, playlist categories)
- [x] Mood check-in (emoji scale, notes, stressor tags)
- [x] Digital Twin Brain (3D force graph visualization)
- [x] Counselor portal (student overview with trends)
- [x] Admin analytics (population stats, pie/bar charts)
- [x] Settings page (consent, notifications, music therapy, data management)
- [x] Demo seed endpoint with 30 days historical data
- [x] Backend API: 14+ endpoints all working
- [x] Claude Sonnet 4.5 AI explanations (with fallback)

## Prioritized Backlog
### P0 (Critical)
- None remaining

### P1 (High)
- Real wearable API integrations (Fitbit, Oura, Apple Watch)
- Firebase Authentication (credentials needed)
- Spotify/YouTube real music API integration (credentials needed)
- Mobile bottom navigation refinement
- Offline mode with local caching

### P2 (Medium)
- Parent/Guardian view
- False alarm reporting flow
- Notification center panel
- Data pipeline status page
- Counselor private notes
- CSV export for admin

### P3 (Low)
- Accessibility: color-blind palette, ARIA labels, high contrast mode
- Loading skeleton screens
- Page transitions with Framer Motion
- Streak indicator for mood check-ins
- Celebration micro-animations
- Pull-to-refresh on mobile

## Demo Accounts
- Student: demo@student.com / demo123
- Counselor: demo@counselor.com / demo123
- Admin: demo@admin.com / demo123
