import AsyncStorage from '@react-native-async-storage/async-storage';

// Default API Base URL (defaults to production Vercel deployment with fallback)
export const DEFAULT_API_URLS = {
    vercel: 'https://serenemind.vercel.app/api',
    local: 'http://localhost:5000/api',
    androidEmulator: 'http://10.0.2.2:5000/api'
};

const API_BASE_URL = DEFAULT_API_URLS.vercel;

export const setApiBaseUrl = async (url) => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem('serene_api_url', cleanUrl);
};

export const getApiBaseUrl = async () => {
    const saved = await AsyncStorage.getItem('serene_api_url');
    return saved || API_BASE_URL;
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
        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Server error occurred');
        }

        return data;
    } catch (err) {
        console.error(`API Error [${endpoint}]:`, err);
        throw err;
    }
};

export const api = {
    // Auth
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    doctorLogin: (credentials) => request('/auth/doctor-login', { method: 'POST', body: JSON.stringify(credentials) }),
    
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
