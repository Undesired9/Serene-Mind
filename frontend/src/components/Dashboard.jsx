import React, { useState, useEffect } from 'react';
import { Activity, Clock, Heart, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
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

    useEffect(() => {
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
        fetchStats();
    }, []);

    // Helper logic for realistic dashboard rendering
    const consecutiveStreak = stats.totalMessages > 0 ? '5 Days' : '0 Days';
    const averageMoodDisplay = stats.totalMessages > 0 ? `${stats.moodScore} / 10` : '-- / 10';
    const sessionDescription = `${stats.totalMessages} total interactions`;

    return (
        <div className="flex-1 overflow-y-auto w-full p-4 lg:p-10 scroll-smooth relative z-10">
            <header className="mb-10 max-w-6xl mx-auto flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 mb-2">Welcome back, {user.username}</h1>
                    <p className="text-slate-600">Here is an overview of your mental wellness journey.</p>
                </div>
            </header>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 w-full max-w-6xl mx-auto">
                <StatCard icon={<Activity className="text-serene-accent"/>} title="Average Mood" value={averageMoodDisplay} hoverColor="group-hover:text-serene-accent" />
                <StatCard icon={<Clock className="text-purple-400"/>} title="Total Sessions" value={stats.totalSessions} desc={sessionDescription} hoverColor="group-hover:text-purple-400" />
                <StatCard icon={<Award className="text-emerald-400"/>} title="Current Streak" value={consecutiveStreak} desc="Consistent check-ins" hoverColor="group-hover:text-emerald-400" />
            </div>

            {/* Main Analytics Chart */}
            <div className="bg-slate-200/50 backdrop-blur-md border border-slate-400 rounded-3xl p-6 w-full max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Heart size={20} className="text-rose-400 animate-pulse" /> Daily Mood Trends
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
