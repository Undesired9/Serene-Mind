import React, { useState, useEffect } from 'react';
import { Home, MessageSquare, Activity, Settings, LogOut, ChevronLeft, ChevronRight, Plus, Users, FileText } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Sidebar = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [sessions, setSessions] = useState([]);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });
    const userData = localStorage.getItem('serene_user');
    const user = userData ? JSON.parse(userData) : null;
    const isDoctor = user?.role === 'doctor';

    const activeSessionId = searchParams.get('session') ? parseInt(searchParams.get('session'), 10) : null;

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem('serene_token');
            if (!token) return;
            const response = await fetch('http://localhost:5000/api/chat/sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSessions(data);
            }
        } catch (error) {
            console.error('Failed to fetch sessions in sidebar', error);
        }
    };

    useEffect(() => {
        if (isDoctor) return;
        fetchSessions();
        window.addEventListener('session-created', fetchSessions);
        return () => window.removeEventListener('session-created', fetchSessions);
    }, [isDoctor]);

    const handleNewSession = async (e) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch('http://localhost:5000/api/chat/sessions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json(); // { id, title }
                setSearchParams({ session: data.id });
                navigate(`/chat?session=${data.id}`);
                fetchSessions();
            }
        } catch (error) {
            console.error('Failed to create session in sidebar', error);
        }
    };

    const handleSelectSession = (sessionId) => {
        setSearchParams({ session: sessionId });
        navigate(`/chat?session=${sessionId}`);
    };

    const handleLogout = () => {
        localStorage.removeItem('serene_token');
        localStorage.removeItem('serene_user');
        navigate(isDoctor ? '/doctor-login' : '/login');
    };

    const toggleCollapse = () => {
        const newValue = !isCollapsed;
        setIsCollapsed(newValue);
        localStorage.setItem('sidebar_collapsed', String(newValue));
    };

    return (
        <div className={`h-screen bg-[#C2FFF0]/30 border-r border-[#0E7C7B]/20 flex flex-col p-4 z-20 relative backdrop-blur-sm transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Collapse Toggle Button */}
            <button 
                onClick={toggleCollapse} 
                className="absolute -right-3 top-6 w-6 h-6 bg-white border border-[#0E7C7B]/20 text-[#0E7C7B] rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-[#C2FFF0]/20 z-30 transition-transform"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className="flex items-center gap-3 mb-10 px-2 mt-4 cursor-pointer overflow-hidden" onClick={() => navigate(isDoctor ? '/doctor' : '/dashboard')}>
                <img src="/Serene Mind.svg" alt="SereneMind Logo" className="w-12 h-12 object-contain shrink-0" />
                {!isCollapsed && <h1 className="text-xl font-bold tracking-tight text-[#0D1B2A] whitespace-nowrap">SereneMind</h1>}
            </div>

            <nav className="space-y-2">
                {isDoctor ? (
                    <>
                        <NavItem icon={<Users size={20} />} label="Patient Overview" active={location.pathname === '/doctor'} onClick={() => navigate('/doctor')} isCollapsed={isCollapsed} />
                        <NavItem icon={<FileText size={20} />} label="Clinical Reports" active={location.pathname === '/doctor'} onClick={() => navigate('/doctor')} isCollapsed={isCollapsed} />
                    </>
                ) : (
                    <>
                        <NavItem icon={<Home size={20} />} label={t('nav_dashboard')} active={location.pathname === '/dashboard'} onClick={() => navigate('/dashboard')} isCollapsed={isCollapsed} />
                        <NavItem icon={<MessageSquare size={20} />} label={t('nav_chat')} active={location.pathname === '/chat'} onClick={() => navigate('/chat')} isCollapsed={isCollapsed} />
                        <NavItem icon={<Activity size={20} />} label={t('nav_reports')} active={location.pathname === '/reports'} onClick={() => navigate('/reports')} isCollapsed={isCollapsed} />
                        <NavItem icon={<Settings size={20} />} label={t('nav_settings')} active={location.pathname === '/settings'} onClick={() => navigate('/settings')} isCollapsed={isCollapsed} />
                    </>
                )}
            </nav>

            {/* Sessions Section (below settings) */}
            <div className="flex-1 flex flex-col min-h-0 border-t border-[#0E7C7B]/20 mt-4 pt-4 overflow-hidden">
                {isDoctor ? (
                    <div className={`rounded-2xl border border-[#0E7C7B]/10 bg-white/40 text-[#3D5A80] ${isCollapsed ? 'p-3 text-center text-xs' : 'p-4 text-sm leading-relaxed'}`}>
                        {isCollapsed ? 'MD' : 'Review patient risk, mood history, and clinician notes from one place.'}
                    </div>
                ) : !isCollapsed ? (
                    <>
                        <div className="flex items-center justify-between mb-3 px-2">
                            <h3 className="text-xs font-bold text-[#3D5A80]/60 uppercase tracking-wider">Sessions</h3>
                            <button 
                                onClick={handleNewSession}
                                className="p-1 hover:bg-[#0E7C7B]/10 rounded-lg text-[#0E7C7B] transition-colors"
                                title="New Session"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                            {sessions.map(session => (
                                <button
                                    key={session.id}
                                    onClick={() => handleSelectSession(session.id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-xs ${
                                        activeSessionId === session.id
                                            ? 'bg-[#0E7C7B]/10 text-[#0E7C7B] border border-[#0E7C7B]/20 font-semibold shadow-sm'
                                            : 'text-[#3D5A80] hover:bg-[#C2FFF0]/35 hover:text-[#0D1B2A]'
                                    }`}
                                >
                                    <MessageSquare size={14} className="shrink-0" />
                                    <span className="truncate flex-1">{session.title}</span>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <button 
                            onClick={handleNewSession}
                            className="p-3 bg-[#0E7C7B]/10 hover:bg-[#0E7C7B]/20 rounded-xl text-[#0E7C7B] transition-colors"
                            title="New Session"
                        >
                            <Plus size={18} />
                        </button>
                        <div className="w-full flex flex-col items-center gap-1.5 overflow-y-auto max-h-[200px]">
                            {sessions.map(session => (
                                <button
                                    key={session.id}
                                    onClick={() => handleSelectSession(session.id)}
                                    className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                                        activeSessionId === session.id
                                            ? 'bg-[#0E7C7B]/10 text-[#0E7C7B] border border-[#0E7C7B]/20'
                                            : 'text-[#3D5A80] hover:bg-[#C2FFF0]/35 hover:text-[#0D1B2A]'
                                    }`}
                                    title={session.title}
                                >
                                    <MessageSquare size={16} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-auto border-t border-[#0E7C7B]/20 pt-4">
                <button onClick={handleLogout} className={`flex items-center gap-3 text-[#3D5A80] hover:text-red-600 transition-colors w-full rounded-lg hover:bg-red-50 ${isCollapsed ? 'p-2 justify-center' : 'px-3 py-2'}`} title={isCollapsed ? t('nav_logout') : ""}>
                    <LogOut size={20} />
                    {!isCollapsed && <span className="text-sm">{t('nav_logout')}</span>}
                </button>
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick, isCollapsed }) => (
    <button onClick={onClick} className={`flex items-center gap-3 w-full rounded-xl transition-all duration-200 ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-3'} ${active
            ? 'bg-[#0E7C7B]/10 text-[#0E7C7B] border border-[#0E7C7B]/20 shadow-sm font-semibold'
            : 'text-[#3D5A80] hover:bg-[#C2FFF0]/50 hover:text-[#0D1B2A]'
        }`}
        title={isCollapsed ? label : ""}
    >
        {icon}
        {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{label}</span>}
    </button>
);

export default Sidebar;
