import AsyncStorage from '@react-native-async-storage/async-storage';

// Default API Base URLs for different mobile environments
export const DEFAULT_API_URLS = {
    localWifi: 'http://172.28.250.3:5000/api', // Recommended for physical phone over same Wi-Fi
    androidEmulator: 'http://10.0.2.2:5000/api', // Android Studio Emulator
    localhost: 'http://localhost:5000/api',       // iOS Simulator / Web
    vercel: 'https://serenemind.vercel.app/api'   // Production Vercel Deployment
};

const DEFAULT_FALLBACK_URL = DEFAULT_API_URLS.localWifi;

export const setApiBaseUrl = async (url) => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem('serene_api_url', cleanUrl);
    return cleanUrl;
};

export const getApiBaseUrl = async () => {
    const saved = await AsyncStorage.getItem('serene_api_url');
    return saved || DEFAULT_FALLBACK_URL;
};

export const checkServerHealth = async (customUrl = null) => {
    const targetUrl = customUrl ? customUrl.trim().replace(/\/+$/, '') : await getApiBaseUrl();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${targetUrl}/dashboard/stats`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return { ok: true, status: res.status, url: targetUrl };
    } catch (err) {
        return { ok: false, error: err.message || 'Cannot reach server', url: targetUrl };
    }
};

const request = async (endpoint, options = {}) => {
    const baseUrl = await getApiBaseUrl();
    const token = await AsyncStorage.getItem('serene_token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || data.error || `Server responded with status ${response.status}`);
        }

        return data;
    } catch (err) {
        console.error(`API Error [${endpoint}] to ${baseUrl}:`, err);
        if (err.name === 'AbortError') {
            throw new Error(`Server connection timed out connecting to ${baseUrl}. Check your server IP.`);
        }
        if (err.message && err.message.toLowerCase().includes('network request failed')) {
            throw new Error(`Network error: Unable to reach backend at ${baseUrl}.\n\nPlease ensure your Node.js server is running and tap '⚙️ Server Settings' below to select your connection IP.`);
        }
        throw err;
    }
};

export const api = {
    // Auth
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    doctorLogin: (credentials) => request('/auth/doctor/login', { method: 'POST', body: JSON.stringify(credentials) }),
    
    // Intake & Assessment
    submitIntake: (data) => request('/auth/intake', { method: 'POST', body: JSON.stringify(data) }),
    submitAssessment: (data) => request('/auth/assessment', { method: 'POST', body: JSON.stringify(data) }),

    // Dashboard & Check-ins
    getDashboard: () => request('/dashboard/stats'),
    postCheckin: (checkinData) => request('/dashboard/mood', { method: 'POST', body: JSON.stringify(checkinData) }),

    // Chat
    getSessions: () => request('/chat/sessions'),
    createSession: () => request('/chat/sessions', { method: 'POST' }),
    deleteSession: (sessionId) => request(`/chat/sessions/${sessionId}`, { method: 'DELETE' }),
    getMessages: (sessionId) => request(`/chat/sessions/${sessionId}/history`),
    sendMessage: (sessionId, message, locale = 'en') => request('/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId, message, locale, stream: false })
    }),
    unlockChat: () => request('/chat/unlock', { method: 'POST' }),
    getEscalationStatus: () => request('/chat/escalation-status'),

    // Appointments
    getDoctors: () => request('/appointments/doctors'),
    getAppointments: () => request('/appointments'),
    bookAppointment: (doctor_id, appointment_date, notes) => request('/appointments', {
        method: 'POST',
        body: JSON.stringify({ doctor_id, appointment_date, notes })
    }),

    // Reports
    getReports: () => request('/dashboard/reports'),

    // Doctor Portal
    getDoctorPatients: () => request('/doctor/patients'),
    getDoctorAppointments: () => request('/appointments/doctor-appointments'),
    updateDoctorAppointment: (id, status) => request(`/appointments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    })
};
