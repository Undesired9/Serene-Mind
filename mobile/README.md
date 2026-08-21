# SereneMind Mobile App (Expo / React Native)

A cross-platform native iOS & Android mobile application for **SereneMind** built with React Native and Expo.

---

## 📱 Features

- **Authentication & Onboarding**:
  - Patient registration & login.
  - Doctor & Clinician authentication portal.
  - Initial medical & lifestyle intake questionnaire.
  - PHQ-9 (Depression) & GAD-7 (Anxiety) clinical questionnaires.
- **Patient Workspace**:
  - Daily mood check-in slider with instant logging.
  - Box Breathing visualizer & 5-4-3-2-1 panic grounding modal.
  - Real-time AI companion chat session switcher with voice dictation & quick prompt chips.
  - Clinician session booking with upcoming schedule manager.
  - Mental health reports with printable clinical export cards.
- **Clinician Triage Portal**:
  - Patient risk level monitoring (High vs Moderate/Low risk badges).
  - Appointment approval & status manager.
  - Medical history & PHQ-9/GAD-7 score inspection.
- **Customization & Config**:
  - Dynamic API server endpoint configuration (`http://localhost:5000/api` or local IP).
  - Multilingual support (English, Spanish, Urdu).
  - Theme mode toggle.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Expo CLI (`npm install -g expo-cli` or `npx expo`)
- **Expo Go** app installed on your physical mobile device (Android or iOS), or **Android Studio Emulator** / **Xcode Simulator**.

### 2. Installation & Launch

1. Navigate to the `mobile/` directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

4. Run on your preferred environment:
   - Press `a` to run on **Android Emulator**.
   - Press `i` to run on **iOS Simulator** (macOS).
   - Scan the displayed QR code with the **Expo Go** app on your phone.

---

## 🔌 Connecting to Backend API

- **Android Emulator**: Set API URL in app Settings screen to `http://10.0.2.2:5000/api`.
- **iOS Simulator / Local Wi-Fi**: Set API URL to `http://<your-local-ip>:5000/api` (e.g. `http://192.168.1.10:5000/api`).
