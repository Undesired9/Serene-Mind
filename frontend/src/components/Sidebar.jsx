import React, { useState, useEffect } from 'react';
import { Home, MessageSquare, Activity, Settings, LogOut, ChevronLeft, ChevronRight, Plus, Users, FileText, Calendar, Menu, X } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../apiConfig';

const Sidebar = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [sessions, setSessions] = useState([]);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });
    const [mobileOpen, setMobileOpen] = useState(false);

    const userData = localStorage.getItem('serene_user');
    const user = userData ? JSON.parse(userData) : null;
    const isDoctor = user?.role === 'doctor';

    const activeSessionId = searchParams.get('session') ? parseInt(searchParams.get('session'), 10) : null;

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem('serene_token');
            if (!token) return;
            const response = await fetch(`${API_BASE}/api/chat/sessions`, {
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
            const response = await fetch(`${API_BASE}/api/chat/sessions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSearchParams({ session: data.id });
                navigate(`/chat?session=${data.id}`);
                fetchSessions();
                setMobileOpen(false);
            }
        } catch (error) {
            console.error('Failed to create session in sidebar', error);
        }
    };

    const handleSelectSession = (sessionId) => {
        setSearchParams({ session: sessionId });
        navigate(`/chat?session=${sessionId}`);
        setMobileOpen(false);
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

    const navItems = isDoctor ? [
        { icon: <Users size={20} />, label: t('nav_patients') || 'Patient Overview', path: '/doctor' },
        { icon: <FileText size={20} />, label: t('nav_reports') || 'Clinical Reports', path: '/doctor' }
    ] : [
        { icon: <Home size={20} />, label: t('nav_dashboard'), path: '/dashboard' },
        { icon: <MessageSquare size={20} />, label: t('nav_chat'), path: '/chat' },
        { icon: <Calendar size={20} />, label: 'Appointments', path: '/appointments' },
        { icon: <Activity size={20} />, label: t('nav_reports'), path: '/reports' },
        { icon: <Settings size={20} />, label: t('nav_settings'), path: '/settings' }
    ];

    return (
        <>
            {/* Mobile Top Header */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#E8E8E8]/90 border-b border-[#0E7C7B]/20 backdrop-blur-md z-30 sticky top-0">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(isDoctor ? '/doctor' : '/dashboard')}>
                    <img src="/Serene Mind.svg" alt="SereneMind Logo" className="w-8 h-8 object-contain" />
                    <span className="font-bold text-lg text-[#0D1B2A]">SereneMind</span>
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-xl bg-white/70 text-[#0E7C7B] border border-[#0E7C7B]/20 shadow-sm"
                    aria-label="Toggle Menu"
                >
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile Backdrop Drawer Overlay */}
            {mobileOpen && (
                <div 
                    className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Container (Desktop Sidebar & Mobile Drawer) */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50
                bg-[#C2FFF0]/30 border-r border-[#0E7C7B]/20 flex flex-col p-4 backdrop-blur-sm transition-all duration-300
                ${mobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'}
                ${isCollapsed ? 'md:w-20' : 'md:w-64'}
            `}>
                {/* Desktop Collapse Toggle */}
                <button 
                    onClick={toggleCollapse} 
                    className="hidden md:flex absolute -right-3 top-6 w-6 h-6 bg-white border border-[#0E7C7B]/20 text-[#0E7C7B] rounded-full items-center justify-center cursor-pointer shadow-sm hover:bg-[#C2FFF0]/20 z-30 transition-transform"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Logo & Title */}
                <div className="flex items-center justify-between mb-8 px-2 mt-2">
                    <div className="flex items-center gap-3 cursor-pointer overflow-hidden" onClick={() => { navigate(isDoctor ? '/doctor' : '/dashboard'); setMobileOpen(false); }}>
                        <img src="/Serene Mind.svg" alt="SereneMind Logo" className="w-10 h-10 object-contain shrink-0" />
                        {(!isCollapsed || mobileOpen) && <h1 className="text-xl font-bold tracking-tight text-[#0D1B2A] whitespace-nowrap">SereneMind</h1>}
                    </div>
                    {mobileOpen && (
                        <button onClick={() => setMobileOpen(false)} className="md:hidden text-[#3D5A80]">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Main Navigation */}
                <nav className="space-y-1.5">
                    {navItems.map((item, idx) => (
                        <NavItem 
                            key={idx}
                            icon={item.icon}
                            label={item.label}
                            active={location.pathname === item.path}
                            onClick={() => { navigate(item.path); setMobileOpen(false); }}
                            isCollapsed={isCollapsed && !mobileOpen}
                        />
                    ))}
                </nav>

                {/* Sessions Section */}
                <div className="flex-1 flex flex-col min-h-0 border-t border-[#0E7C7B]/20 mt-4 pt-4 overflow-hidden">
                    {isDoctor ? (
                        <div className={`rounded-2xl border border-[#0E7C7B]/10 bg-white/40 text-[#3D5A80] ${(isCollapsed && !mobileOpen) ? 'p-3 text-center text-xs' : 'p-4 text-sm leading-relaxed'}`}>
                            {(isCollapsed && !mobileOpen) ? 'MD' : 'Review patient risk, mood history, and clinician notes from one place.'}
                        </div>
                    ) : (!isCollapsed || mobileOpen) ? (
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

                {/* Logout Button */}
                <div className="mt-auto border-t border-[#0E7C7B]/20 pt-4">
                    <button onClick={handleLogout} className={`flex items-center gap-3 text-[#3D5A80] hover:text-red-600 transition-colors w-full rounded-lg hover:bg-red-50 ${(isCollapsed && !mobileOpen) ? 'p-2 justify-center' : 'px-3 py-2'}`} title={(isCollapsed && !mobileOpen) ? t('nav_logout') : ""}>
                        <LogOut size={20} />
                        {(!isCollapsed || mobileOpen) && <span className="text-sm">{t('nav_logout')}</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 border-t border-[#0E7C7B]/20 backdrop-blur-lg flex items-center justify-around py-2 px-3 z-30 shadow-lg">
                {navItems.map((item, idx) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={idx}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                                isActive ? 'text-[#0E7C7B] font-bold' : 'text-[#3D5A80]/70'
                            }`}
                        >
                            {React.cloneElement(item.icon, { size: 20 })}
                            <span className="text-[10px] font-medium leading-none">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </>
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

