import React, { useState, useEffect } from 'react';
import { Activity, Clock, Heart, Award, Bell, FileText, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DailyCheckIn from './DailyCheckIn';

const Dashboard = () => {
    const { t } = useTranslation();
    const userDataObj = localStorage.getItem('serene_user');
    const user = userDataObj ? JSON.parse(userDataObj) : { username: 'Guest' };

    const [stats, setStats] = useState({
        totalSessions: 0,
        totalMessages: 0,
        crisisAlerts: 0,
        moodScore: 0,
        trendData: []
    });
    const [loading, setLoading] = useState(true);

    const [notifications, setNotifications] = useState([]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch('http://localhost:5000/api/dashboard/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch('http://localhost:5000/api/dashboard/reports', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setNotifications(await response.json());
            }
        } catch (error) {
            console.error('Failed to fetch reports', error);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchReports();
    }, []);

    // Helper logic for realistic dashboard rendering
    const consecutiveStreak = stats.activeDays ? `${stats.activeDays} Days` : '0 Days';
    const averageMoodDisplay = stats.totalMessages > 0 ? `${stats.moodScore} / 10` : '-- / 10';
    const sessionDescription = `${stats.totalMessages} total interactions`;

    return (
        <div className="flex-1 overflow-y-auto w-full p-4 lg:p-10 scroll-smooth relative z-10">
            <header className="mb-10 max-w-6xl mx-auto flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 mb-2">{t('dash_welcome')}, {user.username}</h1>
                    <p className="text-slate-600">Here is an overview of your mental wellness journey.</p>
                </div>
            </header>

            <DailyCheckIn onMoodLogged={fetchStats} />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 w-full max-w-6xl mx-auto">
                <StatCard icon={<Activity className="text-serene-accent"/>} title={t('dash_avg_mood')} value={averageMoodDisplay} hoverColor="group-hover:text-serene-accent" />
                <StatCard icon={<Clock className="text-purple-400"/>} title={t('dash_total_sessions')} value={stats.totalSessions} desc={sessionDescription} hoverColor="group-hover:text-purple-400" />
                <StatCard icon={<Award className="text-emerald-400"/>} title={t('dash_streak')} value={consecutiveStreak} hoverColor="group-hover:text-emerald-400" />
            </div>

            {/* Main Analytics Chart */}
            <div className="bg-slate-200/50 backdrop-blur-md border border-slate-400 rounded-3xl p-6 w-full max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Heart size={20} className="text-rose-400 animate-pulse" /> {t('dash_mood_trends')}
                    </h2>
                </div>
                
                {loading ? (
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <div className="w-8 h-8 border-t-2 border-serene-accent animate-spin rounded-full"></div>
                    </div>
                ) : stats.trendData.length > 0 ? (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                                <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} domain={[0, 10]} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#1e293b' }}
                                    itemStyle={{ color: '#64748b' }}
                                />
                                <Line type="monotone" dataKey="mood" stroke="#94a3b8" strokeWidth={4} dot={{ r: 6, fill: '#f1f5f9', stroke: '#94a3b8', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                     <div className="h-[300px] w-full flex items-center justify-center text-serene-muted">
                        No mood data available. Start a session to track your journey.
                     </div>
                )}
            </div>

            {/* Report Notifications Section */}
            <div className="w-full max-w-6xl mx-auto mt-8 mb-10">
                <div className="flex items-center justify-between mb-6 px-1">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Bell size={20} className="text-amber-500 hover:animate-bounce" /> {t('dash_reports')}
                    </h2>
                    <span className="text-sm font-medium text-amber-600 bg-amber-100/80 px-3 py-1 rounded-full shadow-sm">
                        {notifications.filter(n => n.unread).length} New
                    </span>
                </div>
                
                <div className="space-y-4">
                    {notifications.map((notification) => (
                        <div key={notification.id} className="bg-slate-200/50 backdrop-blur-md border border-slate-400 group flex items-start gap-4 p-5 rounded-3xl transition duration-300 hover:bg-slate-300/60 cursor-pointer hover:border-slate-500 shadow-sm hover:shadow">
                            <div className={`p-3 rounded-xl flex-shrink-0 transition-colors ${notification.unread ? 'bg-amber-100 text-amber-600 shadow-inner' : 'bg-slate-300 text-slate-500'}`}>
                                <FileText size={20} className="group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <div className="flex-1">
                                <h3 className={`text-base font-semibold mb-1 ${notification.unread ? 'text-slate-800' : 'text-slate-600'}`}>{notification.title}</h3>
                                <p className="text-sm text-slate-500 group-hover:text-slate-600 transition-colors">{notification.description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-xs font-medium text-slate-400">
                                <span>{notification.date}</span>
                                {notification.unread && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse mt-1"></span>}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-8 flex justify-center">
                    <Link to="/reports" className="group flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors py-2.5 px-5 border border-slate-300 hover:border-slate-400 rounded-xl bg-slate-200/30 hover:bg-slate-300/50 shadow-sm">
                        {t('dash_view_all')} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, title, value, desc, hoverColor }) => (
    <div className="group bg-slate-200/50 backdrop-blur-md border border-slate-400 hover:border-slate-500 transition duration-300 rounded-3xl p-6 flex items-start gap-4 cursor-default">
        <div className={`w-12 h-12 rounded-2xl bg-slate-300 flex items-center justify-center shrink-0 shadow-inner border border-slate-400 transition-colors ${hoverColor}`}>
            {icon}
        </div>
        <div>
            <h3 className="text-slate-600 text-sm font-medium mb-1">{title}</h3>
            <p className="text-2xl font-bold text-slate-800 tracking-tight mb-1">{value}</p>
            {desc && <p className="text-xs text-slate-500 font-medium">{desc}</p>}
        </div>
    </div>
);

export default Dashboard;
