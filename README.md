# SereneMind: AI-Assisted Mental Wellness & Clinical Triage Platform

**SereneMind** is a privacy-conscious, risk-aware mental wellness companion and clinical triage platform designed around a closed-loop care model: **Onboard ➔ Establish Baseline ➔ Detect Risk ➔ Respond ➔ Reassess ➔ Escalate ➔ Clinician Review ➔ Continuous Care**.

---

## 🌟 Core Pillars

1. **Multi-Signal Risk Engine**: Moves beyond static single-threshold scoring by synthesizing PHQ-9/GAD-7 assessments, dedicated safety items, conversational signals, and longitudinal mood trajectories.
2. **Structured Interventions**: Delivers evidence-based CBT exercises, interactive 4-4-4-4 Box Breathing, and 5-4-3-2-1 sensory grounding techniques.
3. **Deterministic Safety Architecture**: Keeps clinical escalation and emergency safety protocols strictly governed by validated server-side logic rather than relying solely on generative AI.
4. **Clinician Triage Portal**: Equips doctors with prioritized patient queues (*Critical Attention*, *High Priority*, *Monitoring*, *Stable*), risk analytics, appointment scheduling, and care planning tools.
5. **Cross-Platform Parity**: Full-featured **React (Vite) Web Application** and native **React Native (Expo) Mobile App** powered by a unified Express/SQLite backend.

---

## 📐 High-Level Workflow

```
Patient ➔ Registration / Login ➔ Consent & Privacy ➔ Structured Intake ➔ PHQ-9 + GAD-7 Assessment
                                                                               │
                                                                               ▼
                                                                     Multi-Signal Risk Engine
                                                                               │
       ┌─────────────────────┬──────────────────────────┬──────────────────────┴──────────────────────┐
       ▼                     ▼                          ▼                                             ▼
   [Low Risk]         [Moderate Risk]              [High Risk]                                 [Critical Risk]
  Wellness Plan      Enhanced Monitoring      Clinical Review Queue                       Immediate Safety Protocol
       │                     │                          │                                             │
       └─────────────────────┼──────────────────────────┼─────────────────────────────────────────────┘
                             ▼                          ▼
                      AI Companion Chat         Clinician Review Portal ➔ Appointment & Care Plan
                             │                          │
                             └──────────────────────────┴──────────────➔ Follow-up & Continuous Care
```

---

## 📁 Repository Structure

```
Serene-Mind/
├── backend/                  # Node.js & Express REST API Server
│   ├── database/             # SQLite database schemas and migrations
│   ├── middleware/           # JWT auth and role validation guards
│   ├── routes/               # API route modules (auth, chat, dashboard, doctor, reports, appointments)
│   ├── services/             # Google Gemini AI and business logic services
│   └── server.js             # API entry point (Port 5000)
│
├── frontend/                 # React + Vite Web Application
│   ├── src/
│   │   ├── components/       # Patient dashboard, chat interface, doctor portal, intake, assessment
│   │   ├── i18n.js           # Multilingual localization (English, Spanish, Urdu)
│   │   ├── App.jsx           # Routing & responsive layout container
│   │   └── main.jsx
│   └── package.json
│
├── mobile/                   # React Native (Expo) Native Mobile App
│   ├── src/
│   │   ├── screens/          # Login, Dashboard, Chat, Appointments, Reports, Doctor Triage, Settings
│   │   ├── components/       # Grounding & Box Breathing modal visualizer
│   │   └── services/         # Mobile REST API client with AsyncStorage
│   ├── App.js                # React Navigation Container (Auth + Bottom Tabs)
│   └── package.json
│
└── docs/                     # Technical specifications & documentation
    ├── WORKFLOW.md           # End-to-end system workflow & logical architecture
    └── ERD.md                # Database entity relationship diagram
```

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
node server.js
```
*Runs on `http://localhost:5000`*

### 2. Frontend Web App
```bash
cd frontend
npm install
npm run dev
```
*Runs on `http://localhost:5173`*

### 3. Mobile App (Expo)
```bash
cd mobile
npm install
npx expo start
```
*Scan the QR code with **Expo Go** or press `a` for Android Emulator / `i` for iOS Simulator.*

---

## 📖 Detailed Documentation

- [Complete Workflow & Architecture Specification](file:///g:/Serene-Mind/docs/WORKFLOW.md)
- [Database Schema (ERD)](file:///g:/Serene-Mind/docs/ERD.md)
- [Mobile App Guide](file:///g:/Serene-Mind/mobile/README.md)