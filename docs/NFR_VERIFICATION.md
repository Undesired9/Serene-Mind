# Non-Functional Requirements (NFR) Validation & Verification Specification

This document provides the compliance and verification matrix for the **SereneMind** mental health triage platform.

---

## 1. Quality & Non-Functional Attributes

### 🛡️ NFR-1: Data Integrity & Strict Field Validation
| Area | Validation Rule | Enforcement Layer | Failure Action |
| :--- | :--- | :--- | :--- |
| **User Registration** | Username: `^[a-zA-Z0-9_]{3,30}$`<br>Email: RFC 5322 regex<br>Password: Min 8 chars, mixed case, numbers | Frontend + `server/routes/auth.js` | HTTP 400 with specific error string |
| **Intake Form** | Legal & Preferred Name: Alphabetic characters<br>Age: $5 \le \text{age} \le 120$<br>Phone: E.164 compliant format | Frontend + `server/routes/auth.js` | HTTP 400 with field indicator |
| **Assessments** | PHQ-9: $0–27$<br>GAD-7: $0–21$<br>Items: $0–3$ | Mobile/Web UI + Backend | HTTP 400 |
| **Appointments** | Date: Future date ISO format<br>Doctor ID: Valid integer | `server/routes/appointments.js` | HTTP 400 |
| **Check-ins** | Mood Score: Integer $1–10$<br>Notes: Truncated to 500 chars | `server/routes/dashboard.js` | HTTP 400 |

---

### 🔒 NFR-2: Security, Privacy & Compliance
- **Cryptographic Security**: Passwords hashed with salted bcrypt (10 rounds).
- **Session Tokens**: JWT signed with secret and expiration.
- **SQL Injection Defense**: 100% parameterized SQLite statements with zero dynamic SQL concatenation.
- **Privacy Shielding**: Raw conversation transcripts are inaccessible via Clinician overviews to protect confidentiality.
- **Audit Logging**: Immutable logging for `LOGIN`, `INTAKE_COMPLETED`, `PHQ9_COMPLETED`, `GAD7_COMPLETED`, `SAFETY_SCREEN_COMPLETED`, `RISK_EVALUATED`, `CLINICIAN_VIEWED_PATIENT`.

---

### ⚡ NFR-3: Performance & Scalability
- **Database Query Latency**: Added 9 dedicated indexes on foreign keys (`user_id`, `session_id`, `doctor_id`) and timestamps.
- **Payload Minimization**: Pagination and bounding filters on historical logs (`LIMIT 14`, `LIMIT 30`).
- **Production Asset Optimization**: Minified single-page bundle with Vite asset chunking and CSS code-splitting.

---

### 🔄 NFR-4: Fault Tolerance & Resilience
- **Deterministic Crisis Preprocessing**: Pre-screens every prompt before AI model invocation.
- **AI Service Retry & Fallback**: Automatic retry mechanisms on external API failures.
- **Structured Error Responses**: Standardized JSON responses `{ error: string }`.
