// Base URL for API calls. Uses relative /api paths so the Vite dev server
// proxies to the backend. Override with VITE_API_URL when the backend lives
// elsewhere (e.g. a deployed frontend hitting a remote API).
export const API_BASE = import.meta.env.VITE_API_URL || '';
