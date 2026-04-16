import React from 'react';
import { Home, MessageSquare, Activity, Settings, LogOut, Trash2, HeartPulse } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Sidebar = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const userStr = localStorage.getItem('serene_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isDoctor = user && user.role === 'doctor';

    const handleLogout = () => {
        localStorage.removeItem('serene_token');
        localStorage.removeItem('serene_user');
        navigate('/login');
    };


    return (
        <div className="w-64 h-screen bg-transparent border-r border-slate-400/50 flex flex-col p-4 z-20 relative">
            <div className="flex items-center gap-3 mb-10 px-2 mt-4 cursor-pointer" onClick={() => navigate('/dashboard')}>
                <div className="w-8 h-8 rounded-lg bg-slate-400 flex items-center justify-center shadow-md shadow-slate-400/20">
                    <span className="text-white font-bold">S</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">SereneMind</h1>
            </div>
            
            <nav className="flex-1 space-y-2">
                {!isDoctor && <NavItem icon={<Home size={20}/>} label={t('nav_dashboard')} active={location.pathname === '/dashboard'} onClick={() => navigate('/dashboard')} />}
                {!isDoctor && <NavItem icon={<MessageSquare size={20}/>} label={t('nav_chat')} active={location.pathname === '/chat'} onClick={() => navigate('/chat')} />}
                {!isDoctor && <NavItem icon={<Activity size={20}/>} label={t('nav_reports')} active={location.pathname === '/reports'} onClick={() => navigate('/reports')} />}
                {isDoctor && <NavItem icon={<HeartPulse size={20}/>} label={t('nav_doctor_view')} active={location.pathname === '/doctor'} onClick={() => navigate('/doctor')} />}
                <NavItem icon={<Settings size={20}/>} label={t('nav_settings')} active={location.pathname === '/settings'} onClick={() => navigate('/settings')} />
            </nav>
            
            <div className="mt-auto border-t border-slate-400/50 pt-4 space-y-2">
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-red-600 transition-colors w-full rounded-lg hover:bg-slate-200/50">
                    <LogOut size={20}/>
                    <span className="text-sm">{t('nav_logout')}</span>
                </button>
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-200 ${
        active 
            ? 'bg-slate-300/50 text-slate-800 border border-slate-400/30 shadow-sm' 
            : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
    }`}>
        {icon}
        <span className="font-medium text-sm">{label}</span>
    </button>
);

export default Sidebar;
