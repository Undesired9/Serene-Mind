import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, ClipboardList, Clock, FileText, Heart, MessageSquare, Search, ShieldCheck, Users, X } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const formatDate = (value) => new Date(value).toLocaleDateString();
const formatDateTime = (value) => new Date(value).toLocaleString();

const riskBadgeClass = {
    HIGH: 'bg-rose-100 text-rose-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW: 'bg-emerald-100 text-emerald-700'
};

const severityClass = (severity) => {
    if (!severity) return 'text-[#3D5A80]';
    if (severity === 'Severe') return 'text-rose-600';
    if (severity === 'Moderate') return 'text-amber-600';
    return 'text-emerald-600';
};

const authFetch = async (path, options = {}) => {
    const token = localStorage.getItem('serene_token');
    return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        }
    });
};

const StatCard = ({ icon, label, value, tone }) => (
    <div className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${tone}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-[#3D5A80]">{label}</p>
            <p className="text-2xl font-bold text-[#0D1B2A] mt-1">{value}</p>
        </div>
    </div>
);

const DoctorDashboard = () => {
    const [patients, setPatients] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [patientDetails, setPatientDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState('');
    const [patientReports, setPatientReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(false);
    const [reportSaving, setReportSaving] = useState(false);
    const [reportError, setReportError] = useState('');
    const [reportSuccess, setReportSuccess] = useState('');
    const [reportForm, setReportForm] = useState({
        report_title: '',
        report_content: '',
        status: 'pending'
    });

    const fetchPatients = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await authFetch('/api/doctor/patients');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch patients');
            }

            setPatients(data);
        } catch (fetchError) {
            console.error('Failed to fetch patients', fetchError);
            setError(fetchError.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAppointments = async () => {
        try {
            const response = await authFetch('/api/appointments/doctor-appointments');
            const data = await response.json();

            if (response.ok) {
                setAppointments(data);
            }
        } catch (fetchError) {
            console.error('Failed to fetch appointments', fetchError);
        }
    };

    useEffect(() => {
        fetchPatients();
        fetchAppointments();
    }, []);

    const filteredPatients = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return patients;

        return patients.filter((patient) =>
            patient.username.toLowerCase().includes(query) ||
            patient.email.toLowerCase().includes(query) ||
            (patient.main_concern || '').toLowerCase().includes(query)
        );
    }, [patients, searchTerm]);

    const dashboardStats = useMemo(() => {
        const highRisk = patients.filter((patient) => patient.crisis_risk).length;
        const assessed = patients.filter((patient) => patient.total_score != null).length;
        const avgMoodCount = patients.filter((patient) => patient.avg_mood != null).length;
        const avgMood = avgMoodCount
            ? (patients.reduce((sum, patient) => sum + (patient.avg_mood || 0), 0) / avgMoodCount).toFixed(1)
            : '--';

        return { highRisk, assessed, avgMood };
    }, [patients]);

    const loadPatientReports = async (patientId) => {
        setReportsLoading(true);
        try {
            const response = await authFetch(`/api/reports/patient/${patientId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load reports');
            }

            setPatientReports(data);
        } catch (fetchError) {
            console.error('Failed to fetch reports', fetchError);
            setPatientReports([]);
            setReportError(fetchError.message);
        } finally {
            setReportsLoading(false);
        }
    };

    const handlePatientClick = async (id) => {
        setSelectedPatientId(id);
        setDetailsLoading(true);
        setDetailsError('');
        setReportError('');
        setReportSuccess('');
        setPatientDetails(null);
        setPatientReports([]);
        setReportForm({
            report_title: '',
            report_content: '',
            status: 'pending'
        });

        try {
            const [detailsResponse, reportsResponse] = await Promise.all([
                authFetch(`/api/doctor/patients/${id}`),
                authFetch(`/api/reports/patient/${id}`)
            ]);

            const detailsData = await detailsResponse.json();
            const reportsData = await reportsResponse.json();

            if (!detailsResponse.ok) {
                throw new Error(detailsData.error || 'Failed to fetch patient details');
            }

            if (!reportsResponse.ok) {
                throw new Error(reportsData.error || 'Failed to fetch patient reports');
            }

            setPatientDetails(detailsData);
            setPatientReports(reportsData);
            setReportForm({
                report_title: `${detailsData.user.username} follow-up note`,
                report_content: '',
                status: 'pending'
            });
        } catch (fetchError) {
            console.error('Failed to fetch patient details', fetchError);
            setDetailsError(fetchError.message);
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeModal = () => {
        setSelectedPatientId(null);
        setPatientDetails(null);
        setPatientReports([]);
        setDetailsError('');
        setReportError('');
        setReportSuccess('');
    };

    const handleCreateReport = async (event) => {
        event.preventDefault();

        if (!selectedPatientId) return;
        if (!reportForm.report_title.trim() || !reportForm.report_content.trim()) {
            setReportError('A title and report note are required.');
            return;
        }

        setReportSaving(true);
        setReportError('');
        setReportSuccess('');

        try {
            const response = await authFetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: selectedPatientId,
                    report_title: reportForm.report_title.trim(),
                    report_content: reportForm.report_content.trim(),
                    status: reportForm.status
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save report');
            }

            setReportSuccess('Clinical note saved successfully.');
            setReportForm((current) => ({
                ...current,
                report_content: '',
                status: 'pending'
            }));
            await loadPatientReports(selectedPatientId);
        } catch (saveError) {
            console.error('Failed to save report', saveError);
            setReportError(saveError.message);
        } finally {
            setReportSaving(false);
        }
    };

    const handleUpdateAppointmentStatus = async (appointmentId, status) => {
        try {
            const response = await authFetch(`/api/appointments/${appointmentId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                fetchAppointments();
            }
        } catch (error) {
            console.error('Failed to update appointment status', error);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto w-full p-4 lg:p-10 scroll-smooth relative z-10">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-[#0D1B2A] mb-2">Doctor Dashboard</h1>
                        <p className="text-[#3D5A80] max-w-2xl">Review patient screening results, monitor recent mood and chat risk signals, and record clinician notes from one workspace.</p>
                    </div>
                    <div className="bg-[#C2FFF0]/50 text-[#0E7C7B] px-4 py-2 rounded-xl border border-[#0E7C7B]/20 font-medium flex items-center gap-2 shadow-sm">
                        <Users size={18} /> {patients.length} active patients
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard icon={<Users className="text-[#0E7C7B]" />} label="Patients in care" value={patients.length} tone="bg-[#C2FFF0]/40 border-[#0E7C7B]/10 text-[#0E7C7B]" />
                    <StatCard icon={<AlertTriangle className="text-rose-600" />} label="Self-harm risk flags" value={dashboardStats.highRisk} tone="bg-rose-50 border-rose-100 text-rose-600" />
                    <StatCard icon={<Heart className="text-[#1B98E0]" />} label="Average logged mood" value={dashboardStats.avgMood === '--' ? '--' : `${dashboardStats.avgMood}/10`} tone="bg-sky-50 border-sky-100 text-[#1B98E0]" />
                </div>

                {/* Appointments Section */}
                <div className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 rounded-3xl p-4 md:p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-[#0D1B2A] mb-4 flex items-center gap-2">
                        <Calendar className="text-[#0E7C7B]" size={20} />
                        Upcoming Appointments
                    </h2>
                    {appointments.length === 0 ? (
                        <p className="text-[#3D5A80] text-sm">No upcoming appointments</p>
                    ) : (
                        <div className="space-y-3">
                            {appointments.map((appointment) => (
                                <div key={appointment.id} className="bg-white p-4 rounded-2xl border border-[#0E7C7B]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-[#0D1B2A]">{appointment.patient_name}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                appointment.risk_tier === 'CRITICAL' || appointment.risk_tier === 'HIGH' 
                                                ? 'bg-rose-100 text-rose-700' 
                                                : appointment.risk_tier === 'ELEVATED' 
                                                ? 'bg-amber-100 text-amber-700' 
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {appointment.risk_tier} Risk
                                            </span>
                                        </div>
                                        <p className="text-sm text-[#3D5A80] flex items-center gap-1">
                                            <Clock size={14} />
                                            {formatDateTime(appointment.appointment_datetime)}
                                        </p>
                                        {appointment.notes && (
                                            <p className="text-xs text-[#3D5A80] mt-1">{appointment.notes}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-[#3D5A80] uppercase">{appointment.status}</span>
                                        {appointment.status === 'SCHEDULED' && (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateAppointmentStatus(appointment.id, 'COMPLETED')}
                                                    className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg hover:bg-emerald-600 transition"
                                                >
                                                    Complete
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateAppointmentStatus(appointment.id, 'CANCELLED')}
                                                    className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 rounded-3xl p-4 md:p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-[#0D1B2A]">Patient roster</h2>
                            <p className="text-sm text-[#3D5A80]">{filteredPatients.length} of {patients.length} patients shown, {dashboardStats.assessed} with completed screening.</p>
                        </div>
                        <label className="flex items-center gap-3 bg-[#E8E8E8]/80 border border-[#0E7C7B]/10 rounded-2xl px-4 py-3 min-w-0 md:min-w-[320px]">
                            <Search size={18} className="text-[#3D5A80]" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search by name, email, or concern"
                                className="bg-transparent w-full outline-none text-sm text-[#0D1B2A] placeholder:text-[#3D5A80]"
                            />
                        </label>
                    </div>
                </div>

                {loading ? (
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <div className="w-8 h-8 border-t-2 border-[#1B98E0] animate-spin rounded-full"></div>
                    </div>
                ) : error ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 text-rose-700">{error}</div>
                ) : filteredPatients.length === 0 ? (
                    <div className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 rounded-3xl p-10 text-center text-[#3D5A80]">
                        No patients match the current search.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredPatients.map((patient) => (
                            <button
                                key={patient.id}
                                type="button"
                                onClick={() => handlePatientClick(patient.id)}
                                className="text-left bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 hover:border-[#0E7C7B]/30 transition-all duration-300 rounded-3xl p-6 group hover:shadow-lg relative overflow-hidden"
                            >
                                {patient.crisis_risk && (
                                    <div className="absolute top-0 right-0 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1 z-10">
                                        <AlertTriangle size={12} /> High risk
                                    </div>
                                )}

                                <div className="flex items-start gap-4 mb-5">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border text-lg font-bold ${patient.crisis_risk ? 'bg-rose-100 text-rose-600 border-rose-300' : 'bg-[#C2FFF0]/50 text-[#0E7C7B] border-[#0E7C7B]/20'}`}>
                                        {patient.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-[#0D1B2A] font-bold text-lg truncate">{patient.username}</h3>
                                        <p className="text-xs text-[#3D5A80] font-medium truncate">{patient.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <span className="text-[#3D5A80]">Screening severity</span>
                                        <span className={`font-semibold ${severityClass(patient.severity)}`}>{patient.severity || 'Not available'}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span className="text-[#3D5A80]">Overall score</span>
                                        <span className="font-semibold text-[#0D1B2A]">{patient.total_score != null ? `${patient.total_score} / 63` : 'Not available'}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span className="text-[#3D5A80]">Main concern</span>
                                        <span className="font-semibold text-[#0D1B2A] text-right">{patient.main_concern || 'Unspecified'}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span className="text-[#3D5A80]">Avg mood score</span>
                                        <span className="font-semibold text-[#0D1B2A]">{patient.avg_mood != null ? `${patient.avg_mood}/10` : 'No logs'}</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-[#0E7C7B]/10 flex justify-between items-center text-xs font-medium text-[#3D5A80]">
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} /> Joined {formatDate(patient.created_at)}
                                    </span>
                                    <span>{patient.total_sessions || 0} chat entries</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedPatientId && (
                <div className="fixed inset-0 bg-[#0D1B2A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#E8E8E8] border border-[#0E7C7B]/15 w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#0E7C7B]/15 flex items-center justify-between bg-[#C2FFF0]/30">
                            <h2 className="text-xl font-bold text-[#0D1B2A] flex items-center gap-2">
                                <ClipboardList className="text-[#0E7C7B]" size={24} /> Patient detail
                            </h2>
                            <button onClick={closeModal} className="p-2 rounded-full hover:bg-[#0E7C7B]/10 text-[#3D5A80] transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {detailsLoading ? (
                                <div className="h-64 flex items-center justify-center">
                                    <div className="w-8 h-8 border-t-2 border-[#1B98E0] animate-spin rounded-full"></div>
                                </div>
                            ) : detailsError ? (
                                <div className="h-64 flex items-center justify-center text-rose-700">{detailsError}</div>
                            ) : patientDetails ? (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        <div className="bg-white p-6 rounded-2xl border border-[#0E7C7B]/10 shadow-sm">
                                            <h3 className="text-lg font-semibold text-[#0D1B2A] mb-4 border-b border-[#0E7C7B]/10 pb-2">Profile</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="block text-xs text-[#3D5A80] mb-1">Username</span>
                                                    <span className="font-medium text-[#0D1B2A]">{patientDetails.user.username}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-[#3D5A80] mb-1">Email</span>
                                                    <span className="font-medium text-[#0D1B2A] break-all">{patientDetails.user.email}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-[#3D5A80] mb-1">Joined</span>
                                                    <span className="font-medium text-[#0D1B2A]">{formatDate(patientDetails.user.created_at)}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-[#3D5A80] mb-1">Recent interactions</span>
                                                    <span className="font-medium text-[#0D1B2A]">{patientDetails.sessions.length}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-2xl border border-[#0E7C7B]/10 shadow-sm">
                                            <h3 className="text-lg font-semibold text-[#0D1B2A] mb-4 border-b border-[#0E7C7B]/10 pb-2">Mental health screening</h3>
                                            {patientDetails.assessment ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="block text-xs text-[#3D5A80] mb-1">Severity</span>
                                                        <span className={`font-medium ${severityClass(patientDetails.assessment.severity)}`}>{patientDetails.assessment.severity}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-[#3D5A80] mb-1">Total score</span>
                                                        <span className="font-medium text-[#0D1B2A]">{patientDetails.assessment.total_score} / 63</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-[#3D5A80] mb-1">Main concern</span>
                                                        <span className="font-medium text-[#0D1B2A]">{patientDetails.assessment.main_concern || 'Unspecified'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-[#3D5A80] mb-1">Submitted</span>
                                                        <span className="font-medium text-[#0D1B2A]">{formatDate(patientDetails.assessment.timestamp)}</span>
                                                    </div>
                                                    {patientDetails.assessment.crisis_risk && (
                                                        <div className="sm:col-span-2 mt-2 bg-rose-50 text-rose-700 px-3 py-3 rounded-lg text-sm flex items-center gap-2 border border-rose-100">
                                                            <AlertTriangle size={16} /> Self-harm risk was flagged in the screening and should be reviewed promptly.
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-[#3D5A80] italic text-sm">No screening has been completed yet.</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        <div className="bg-white p-6 rounded-2xl border border-[#0E7C7B]/10 shadow-sm">
                                            <h3 className="text-lg font-semibold text-[#0D1B2A] mb-4 border-b border-[#0E7C7B]/10 pb-2 flex items-center gap-2">
                                                <Heart className="text-rose-400" size={18} /> Recent mood logs
                                            </h3>
                                            {patientDetails.mood_logs.length > 0 ? (
                                                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                                                    {patientDetails.mood_logs.map((log) => (
                                                        <div key={log.id} className="flex items-start gap-4 p-3 bg-[#C2FFF0]/20 rounded-xl">
                                                            <div className="w-10 h-10 rounded-full bg-[#C2FFF0]/50 flex items-center justify-center font-bold text-[#0E7C7B] shrink-0">
                                                                {log.mood_score}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-[#0D1B2A]">{log.notes || 'No notes provided'}</p>
                                                                <span className="text-xs text-[#3D5A80]">{formatDate(log.date)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-[#3D5A80] italic text-sm">No mood logs available.</div>
                                            )}
                                        </div>

                                        <div className="bg-white p-6 rounded-2xl border border-[#0E7C7B]/10 shadow-sm">
                                            <h3 className="text-lg font-semibold text-[#0D1B2A] mb-4 border-b border-[#0E7C7B]/10 pb-2 flex items-center gap-2">
                                                <MessageSquare className="text-[#1B98E0]" size={18} /> Chat risk overview
                                            </h3>
                                            <p className="text-sm text-[#3D5A80] mb-4">Conversation content stays hidden for privacy. Only sender and detected risk level are shown.</p>
                                            {patientDetails.sessions.length > 0 ? (
                                                <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-[#3D5A80] uppercase bg-[#C2FFF0]/20 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 rounded-tl-lg">Date</th>
                                                                <th className="px-4 py-2">Sender</th>
                                                                <th className="px-4 py-2 rounded-tr-lg">Risk</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {patientDetails.sessions.map((session) => (
                                                                <tr key={session.id} className="border-b border-[#0E7C7B]/5 last:border-0 hover:bg-[#C2FFF0]/10">
                                                                    <td className="px-4 py-3 font-medium text-[#0D1B2A]">{formatDateTime(session.timestamp)}</td>
                                                                    <td className="px-4 py-3 capitalize">{session.sender}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${riskBadgeClass[session.risk_level] || 'bg-slate-100 text-slate-600'}`}>
                                                                            {session.risk_level || 'UNKNOWN'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="text-[#3D5A80] italic text-sm">No chat interactions are available.</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-6">
                                        <div className="bg-white p-6 rounded-2xl border border-[#0E7C7B]/10 shadow-sm">
                                            <h3 className="text-lg font-semibold text-[#0D1B2A] mb-4 border-b border-[#0E7C7B]/10 pb-2 flex items-center gap-2">
                                                <FileText className="text-[#0E7C7B]" size={18} /> Clinician reports
                                            </h3>
                                            {reportsLoading ? (
                                                <div className="h-40 flex items-center justify-center">
                                                    <div className="w-8 h-8 border-t-2 border-[#1B98E0] animate-spin rounded-full"></div>
                                                </div>
                                            ) : patientReports.length > 0 ? (
                                                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                                                    {patientReports.map((report) => (
                                                        <div key={report.id} className="rounded-2xl border border-[#0E7C7B]/10 bg-[#F8FBFB] p-4">
                                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                                                                <div>
                                                                    <h4 className="font-semibold text-[#0D1B2A]">{report.report_title}</h4>
                                                                    <p className="text-xs text-[#3D5A80] mt-1">
                                                                        {report.doctor_name || 'Doctor'} · {formatDateTime(report.updated_at || report.created_at)}
                                                                    </p>
                                                                </div>
                                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-[#C2FFF0]/50 text-[#0E7C7B] self-start">
                                                                    {report.status || 'pending'}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-[#3D5A80] whitespace-pre-wrap">{report.report_content}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-[#3D5A80] italic text-sm">No clinician reports have been saved for this patient yet.</div>
                                            )}
                                        </div>

                                        <div className="bg-white p-6 rounded-2xl border border-[#0E7C7B]/10 shadow-sm">
                                            <h3 className="text-lg font-semibold text-[#0D1B2A] mb-4 border-b border-[#0E7C7B]/10 pb-2 flex items-center gap-2">
                                                <ShieldCheck className="text-emerald-500" size={18} /> Add clinician note
                                            </h3>

                                            <form onSubmit={handleCreateReport} className="space-y-4">
                                                <div>
                                                    <label className="block text-xs text-[#3D5A80] font-semibold uppercase tracking-wider mb-1">Title</label>
                                                    <input
                                                        value={reportForm.report_title}
                                                        onChange={(event) => setReportForm((current) => ({ ...current, report_title: event.target.value }))}
                                                        className="w-full rounded-xl border border-[#0E7C7B]/15 bg-[#F8FBFB] px-4 py-3 outline-none focus:border-[#1B98E0]"
                                                        placeholder="Follow-up summary"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs text-[#3D5A80] font-semibold uppercase tracking-wider mb-1">Status</label>
                                                    <select
                                                        value={reportForm.status}
                                                        onChange={(event) => setReportForm((current) => ({ ...current, status: event.target.value }))}
                                                        className="w-full rounded-xl border border-[#0E7C7B]/15 bg-[#F8FBFB] px-4 py-3 outline-none focus:border-[#1B98E0]"
                                                    >
                                                        <option value="pending">Pending review</option>
                                                        <option value="reviewed">Reviewed</option>
                                                        <option value="completed">Completed</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs text-[#3D5A80] font-semibold uppercase tracking-wider mb-1">Clinical note</label>
                                                    <textarea
                                                        value={reportForm.report_content}
                                                        onChange={(event) => setReportForm((current) => ({ ...current, report_content: event.target.value }))}
                                                        rows={8}
                                                        className="w-full rounded-xl border border-[#0E7C7B]/15 bg-[#F8FBFB] px-4 py-3 outline-none focus:border-[#1B98E0] resize-none"
                                                        placeholder="Summarize patient status, follow-up guidance, and any required action."
                                                    />
                                                </div>

                                                {reportError && <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">{reportError}</div>}
                                                {reportSuccess && <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">{reportSuccess}</div>}

                                                <button
                                                    type="submit"
                                                    disabled={reportSaving}
                                                    className="w-full bg-[#0E7C7B] hover:bg-[#0A5E5D] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                                                >
                                                    {reportSaving ? 'Saving note...' : 'Save clinician note'}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-[#3D5A80]">Unable to load patient profile.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;
