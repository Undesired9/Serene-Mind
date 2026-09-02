# Production Deployment & Operations Guide

This guide covers deployment procedures, environment configuration, monitoring, and scaling for the **SereneMind** mental health platform.

---

## 1. Environment Configuration

### Root (`.env`)
```ini
PORT=5000
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_32_chars_min
GEMINI_API_KEY=your_gemini_production_key
CORS_ORIGIN=https://serenemind.app
```

### Frontend (`.env.production` at project root)
```ini
VITE_API_URL=https://api.serenemind.app
```

### Mobile App (`mobile/`)
Adjust API target in `mobile/src/services/api.js` or via the in-app settings screen:
```javascript
const API_BASE_URL = 'https://api.serenemind.app/api';
```

---

## 2. Health Monitoring & Observability

The platform exposes an active health endpoint:
- **Endpoint**: `GET /api/health`
- **Response**:
```json
{
  "status": "HEALTHY",
  "database": "CONNECTED",
  "uptimeSeconds": 1420,
  "memoryUsageMB": 42,
  "latencyMs": 2,
  "timestamp": "2026-08-21T11:30:00.000Z"
}
```

---

## 3. Automated Test Verification
Before promoting to staging or production, execute the NFR test suite:
```bash
npm test
```
All automated tests must report `PASS` with exit code `0`.
