import React from 'react';
import { Home, MessageSquare, Activity, Settings, LogOut, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('serene_token');
        localStorage.removeItem('serene_user');
        navigate('/login');
    };

    const handleClearHistory = async () => {
        const token = localStorage.getItem('serene_token');
        if (!token) return;

        if(window.confirm("Are you sure you want to permanently delete your session history? This action cannot be reversed.")) {
             try {
                 const response = await fetch('http://localhost:5000/api/chat/history', {
                     method: 'DELETE',
                     headers: { 'Authorization': `Bearer ${token}` }
                 });

                 if(response.ok) {
                     alert("Your history has been securely wiped.");
                     window.location.reload();
                 }
             } catch(e) {
                 console.error(e);
             }
        }
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
                <NavItem icon={<Home size={20}/>} label="Dashboard" active={location.pathname === '/dashboard'} onClick={() => navigate('/dashboard')} />
                <NavItem icon={<MessageSquare size={20}/>} label="Therapy Chat" active={location.pathname === '/chat'} onClick={() => navigate('/chat')} />
                <NavItem icon={<Activity size={20}/>} label="Mood Tracking" active={location.pathname === '/mood'} />
                <NavItem icon={<Settings size={20}/>} label="Settings" active={location.pathname === '/settings'} />
            </nav>
            
            <div className="mt-auto border-t border-slate-400/50 pt-4 space-y-2">
                <button onClick={handleClearHistory} className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-orange-600 transition-colors w-full rounded-lg hover:bg-slate-200/50">
                    <Trash2 size={20}/>
                    <span className="text-sm">Clear History</span>
                </button>
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-red-600 transition-colors w-full rounded-lg hover:bg-slate-200/50">
                    <LogOut size={20}/>
                    <span className="text-sm">End Session / Logout</span>
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
