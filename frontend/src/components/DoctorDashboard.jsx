import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, ShieldCheck, FileText, ChevronRight, X, Clock, Heart, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DoctorDashboard = () => {
    const { t } = useTranslation();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [patientDetails, setPatientDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const token = localStorage.getItem('serene_token');
                const response = await fetch('http://localhost:5000/api/doctor/patients', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    setPatients(await response.json());
                }
            } catch (error) {
                console.error('Failed to fetch patients', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, []);

    const handlePatientClick = async (id) => {
        setSelectedPatientId(id);
        setDetailsLoading(true);
        setPatientDetails(null);
        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch(`http://localhost:5000/api/doctor/patients/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setPatientDetails(await response.json());
            }
        } catch (error) {
            console.error('Failed to fetch patient details', error);
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeModal = () => {
        setSelectedPatientId(null);
        setPatientDetails(null);
    };

    return (
        <div className="flex-1 overflow-y-auto w-full p-4 lg:p-10 scroll-smooth relative z-10">
            <header className="mb-10 max-w-6xl mx-auto flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#0D1B2A] mb-2">Doctor View</h1>
                    <p className="text-[#3D5A80]">Overview of all active patients and their mental wellness reports.</p>
                </div>
                <div className="bg-[#C2FFF0]/50 text-[#0E7C7B] px-4 py-2 rounded-xl border border-[#0E7C7B]/20 font-medium flex items-center gap-2 shadow-sm">
                    <Users size={18}/> {patients.length} Active Patients
                </div>
            </header>

            {loading ? (
                <div className="h-[300px] w-full flex items-center justify-center">
                    <div className="w-8 h-8 border-t-2 border-[#1B98E0] animate-spin rounded-full"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 w-full max-w-6xl mx-auto">
                    {patients.map(patient => (
                        <div 
                            key={patient.id} 
                            onClick={() => handlePatientClick(patient.id)}
                            className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 hover:border-[#0E7C7B]/30 transition-all duration-300 rounded-3xl p-6 cursor-pointer group hover:shadow-lg relative overflow-hidden"
                        >
                            {patient.crisis_risk && (
                                <div className="absolute top-0 right-0 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1 z-10 animate-pulse">
                                    <AlertTriangle size={12}/> High Risk
                                </div>
                            )}
                            <div className="flex items-start gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border text-lg font-bold
                                    ${patient.crisis_risk ? 'bg-rose-100 text-rose-600 border-rose-300' : 'bg-[#C2FFF0]/50 text-[#0E7C7B] border-[#0E7C7B]/20'}
                                `}>
                                    {patient.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-[#0D1B2A] font-bold text-lg">{patient.username}</h3>
                                    <p className="text-xs text-[#3D5A80] font-medium truncate max-w-[150px]">{patient.email}</p>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-[#3D5A80]">PHQ-9 Severity</span>
                                    <span className={`font-semibold ${
                                        patient.severity && patient.severity.toLowerCase().includes('severe') ? 'text-rose-600' : 
                                        patient.severity && patient.severity.toLowerCase().includes('moderate') ? 'text-amber-600' : 'text-emerald-600'
                                    }`}>
                                        {patient.severity || 'Unknown'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-[#3D5A80]">Avg Mood Score</span>
                                    <span className="font-semibold text-[#0D1B2A]">{patient.avg_mood ? `${patient.avg_mood}/10` : 'None'}</span>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-[#0E7C7B]/10 flex justify-between items-center">
                                <span className="text-xs font-medium text-[#3D5A80] flex items-center gap-1">
                                    <Clock size={12}/> Joined {new Date(patient.created_at).toLocaleDateString()}
                                </span>
                                <div className="p-1.5 rounded-full bg-[#C2FFF0]/50 text-[#0E7C7B] group-hover:bg-[#0E7C7B] group-hover:text-white transition-colors">
                                    <ChevronRight size={16}/>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Patient Details Modal */}
            {selectedPatientId && (
                <div className="fixed inset-0 bg-[#0D1B2A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#E8E8E8] border border-[#0E7C7B]/15 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-[#0E7C7B]/15 flex items-center justify-between bg-[#C2FFF0]/30">
                            <h2 className="text-xl font-bold text-[#0D1B2A] flex items-center gap-2">
                                <FileText className="text-[#0E7C7B]" size={24}/> Patient Report Detail
                            </h2>
                            <button onClick={closeModal} className="p-2 rounded-full hover:bg-[#0E7C7B]/10 text-[#3D5A80] transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {detailsLoading ? (
                                <div className="h-64 flex items-center justify-center">
                                    <div className="w-8 h-8 border-t-2 border-[#1B98E0] animate-spin rounded-full"></div>
                                </div>
                            ) : patientDetails ? (
                                <div className="space-y-8">
                                    {/* Overview Header */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className="bg-white p-6 rounded-2xl border border-[#0E7C7B]/10 shadow-sm flex-1 w-full">
                                            <h3 className="text-lg font-semibold text-[#0D1B2A] mb-4 border-b border-[#0E7C7B]/10 pb-2">Profile</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="block text-xs text-[#3D5A80] mb-1">Username</span>
                                                    <span className="font-medium text-[#0D1B2A]">{patientDetails.user.username}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-[#3D5A80] mb-1">Email</span>
                                                    <span className="font-medium text-[#0D1B2A]">{patientDetails.user.email}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-2xl border border-[#0E7C7B]/10 shadow-sm flex-1 w-full">
                                            <h3 className="text-lg font-semibold text-[#0D1B2A] mb-4 border-b border-[#0E7C7B]/10 pb-2">Assessment (PHQ-9)</h3>
                                            {patientDetails.assessment ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="block text-xs text-[#3D5A80] mb-1">Severity</span>
                                                        <span className="font-medium text-[#0D1B2A]">{patientDetails.assessment.severity}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-[#3D5A80] mb-1">Total Score</span>
                                                        <span className="font-medium text-[#0D1B2A]">{patientDetails.assessment.total_score} / 27</span>
                                                    </div>
                                                    {patientDetails.assessment.crisis_risk && (
                                                        <div className="col-span-2 mt-2 bg-rose-50 text-rose-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2 border border-rose-100">
                                                            <AlertTriangle size={16}/> Indicates crisis / self-harm risk.
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-[#3D5A80] italic text-sm">No assessment completed.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mood Logs */}
                                    <div className="bg-white p-6 rounded-2xl border border-[#0E7C7B]/10 shadow-sm">
                                        <h3 className="text-lg font-semibold text-[#0D1B2A] mb-4 border-b border-[#0E7C7B]/10 pb-2 flex items-center gap-2">
                                            <Heart className="text-rose-400" size={18}/> Recent Mood Logs
                                        </h3>
                                        {patientDetails.mood_logs.length > 0 ? (
                                            <div className="space-y-3">
                                                {patientDetails.mood_logs.map(log => (
                                                    <div key={log.id} className="flex items-center gap-4 p-3 bg-[#C2FFF0]/20 rounded-xl">
                                                        <div className="w-10 h-10 rounded-full bg-[#C2FFF0]/50 flex items-center justify-center font-bold text-[#0E7C7B] shrink-0">
                                                            {log.mood_score}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-[#0D1B2A]">{log.notes || "No notes provided"}</p>
                                                            <span className="text-xs text-[#3D5A80]">{new Date(log.date).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-[#3D5A80] italic text-sm">No mood logs available.</div>
                                        )}
                                    </div>

                                    {/* Session History (Risk overview) */}
                                    <div className="bg-white p-6 rounded-2xl border border-[#0E7C7B]/10 shadow-sm">
                                        <h3 className="text-lg font-semibold text-[#0D1B2A] mb-4 border-b border-[#0E7C7B]/10 pb-2 flex items-center gap-2">
                                            <MessageSquare className="text-[#1B98E0]" size={18}/> Chat Interactions Overview
                                        </h3>
                                        <div className="text-sm text-[#3D5A80] mb-4">Note: Content is hidden for privacy. Risk levels are indicated.</div>
                                        {patientDetails.sessions.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-[#3D5A80] uppercase bg-[#C2FFF0]/20">
                                                        <tr>
                                                            <th className="px-4 py-2 rounded-tl-lg">Date</th>
                                                            <th className="px-4 py-2">Sender</th>
                                                            <th className="px-4 py-2 rounded-tr-lg">Risk Level</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {patientDetails.sessions.map(sess => (
                                                            <tr key={sess.id} className="border-b border-[#0E7C7B]/5 last:border-0 hover:bg-[#C2FFF0]/10">
                                                                <td className="px-4 py-3 font-medium text-[#0D1B2A]">{new Date(sess.timestamp).toLocaleString()}</td>
                                                                <td className="px-4 py-3 capitalize">{sess.sender}</td>
                                                                <td className="px-4 py-3">
                                                                    {sess.risk_level === 'HIGH' ? (
                                                                        <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold">HIGH</span>
                                                                    ) : sess.risk_level === 'MEDIUM' ? (
                                                                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">MEDIUM</span>
                                                                    ) : (
                                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">LOW</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-[#3D5A80] italic text-sm">No chat sessions established.</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-[#3D5A80]">Failed to load patient profile...</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;
