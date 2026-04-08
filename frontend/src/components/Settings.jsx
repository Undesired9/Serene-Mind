import React, { useState } from 'react';
import { Settings as SettingsIcon, Trash2, ArrowLeft, Shield, AlertOctagon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Settings = () => {
    const navigate = useNavigate();
    const userDataObj = localStorage.getItem('serene_user');
    const user = userDataObj ? JSON.parse(userDataObj) : { username: 'User', email: 'user@example.com' };

    const [isClearing, setIsClearing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [message, setMessage] = useState('');

    const handleClearHistory = async () => {
        if (!window.confirm("Are you sure you want to permanently clear your chat history? This cannot be undone.")) return;
        
        setIsClearing(true);
        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch('http://localhost:5000/api/chat/history', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                setMessage('Chat history cleared successfully.');
            } else {
                setMessage('Failed to clear history.');
            }
        } catch (error) {
            setMessage('An error occurred.');
        } finally {
            setIsClearing(false);
            setTimeout(() => setMessage(''), 4000);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("CRITICAL WARNING: This will permanently delete your account, session logs, mood records, and all personal data. Type 'DELETE' to confirm?") === false) {
            // Simplified prompt check for MVP
            const verify = window.prompt("Type DELETE to permanently erase your account:");
            if (verify !== 'DELETE') return;
        } else {
             return; // Cancelled
        }

        setIsDeleting(true);
        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch('http://localhost:5000/api/auth/account', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                localStorage.removeItem('serene_token');
                localStorage.removeItem('serene_user');
                navigate('/');
            } else {
                setMessage('Failed to delete account.');
                setIsDeleting(false);
            }
        } catch (error) {
            setMessage('An error occurred. Please try again.');
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto w-full p-4 lg:p-10 scroll-smooth relative z-10 flex border-l border-slate-300 bg-slate-100/50">
            <div className="w-full max-w-4xl mx-auto">
                <header className="mb-10 flex items-center gap-4 border-b border-slate-300 pb-6">
                    <Link to="/dashboard" className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-800 bg-slate-200/50">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="w-10 h-10 rounded-xl bg-slate-300 flex items-center justify-center text-slate-600 shadow-inner">
                        <SettingsIcon size={22} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800 leading-none">Settings & Privacy</h1>
                        <p className="text-slate-500 text-sm mt-1">Manage your account and data autonomy.</p>
                    </div>
                </header>

                {message && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-200 border border-slate-400 text-slate-800 text-sm font-medium shadow-sm transition-all animate-in fade-in slide-in-from-top-4">
                        {message}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Account Details */}
                    <section className="bg-slate-200/50 backdrop-blur-md border border-slate-400 rounded-3xl p-6 lg:p-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 px-1 border-b border-transparent">Account Information</h2>
                        
                        <div className="flex flex-col gap-5 px-1">
                            <div>
                                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Username</label>
                                <div className="bg-white/50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700">{user.username}</div>
                            </div>
                            <div>
                                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Email Address</label>
                                <div className="bg-white/50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700">{user.email}</div>
                            </div>
                        </div>
                    </section>

                    {/* Data Autonomy */}
                    <section className="bg-red-50/50 backdrop-blur-md border border-red-200 rounded-3xl p-6 lg:p-8">
                        <div className="flex items-center gap-3 mb-6 px-1">
                            <Shield className="text-red-500" size={24} />
                            <h2 className="text-xl font-bold text-slate-800">Data Autonomy & Deletion</h2>
                        </div>
                        
                        <div className="space-y-6 px-1">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 hover:border-red-300 transition-colors">
                                <div>
                                    <h3 className="font-bold text-slate-800">Clear Chat History</h3>
                                    <p className="text-sm text-slate-500 mt-1 max-w-md">Erase all past conversations with the AI Therapist. This action cannot be undone and will affect your mood trends.</p>
                                </div>
                                <button 
                                    onClick={handleClearHistory}
                                    disabled={isClearing}
                                    className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                                >
                                    <Trash2 size={16} /> {isClearing ? 'Clearing...' : 'Clear History'}
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-red-100 border border-red-300">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <AlertOctagon size={18} className="text-red-600" />
                                        <h3 className="font-bold text-red-900">Delete Account</h3>
                                    </div>
                                    <p className="text-sm text-red-700 mt-1 max-w-md">Permanently delete your SereneMind account and all associated personal data from our servers.</p>
                                </div>
                                <button 
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm shadow shadow-red-500/20 transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                                >
                                    {isDeleting ? 'Erasing Data...' : 'Delete Account'}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Settings;
