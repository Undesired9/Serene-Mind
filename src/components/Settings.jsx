import React, { useState } from 'react';
import { Settings as SettingsIcon, Trash2, ArrowLeft, Shield, AlertOctagon, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../apiConfig';

const Settings = () => {
    const { t, i18n } = useTranslation();
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
            const response = await fetch(`${API_BASE}/api/chat/history`, {
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
            const response = await fetch(`${API_BASE}/api/auth/account`, {
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
        <div className="flex-1 overflow-y-auto w-full p-4 lg:p-10 scroll-smooth relative z-10 flex border-l border-[#0E7C7B]/15 bg-[#E8E8E8]">
            <div className="w-full max-w-4xl mx-auto">
                <header className="mb-10 flex items-center gap-4 border-b border-[#0E7C7B]/15 pb-6">
                    <Link to="/dashboard" className="p-2 rounded-full hover:bg-[#C2FFF0]/50 transition-colors text-[#3D5A80] hover:text-[#0D1B2A] bg-[#C2FFF0]/20">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="w-10 h-10 rounded-xl bg-[#0E7C7B]/10 flex items-center justify-center text-[#0E7C7B] shadow-inner">
                        <SettingsIcon size={22} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-[#0D1B2A] leading-none">{t('settings_title')}</h1>
                        <p className="text-[#3D5A80] text-sm mt-1">{t('settings_desc')}</p>
                    </div>
                </header>

                {message && (
                    <div className="mb-6 p-4 rounded-xl bg-[#C2FFF0]/40 border border-[#0E7C7B]/20 text-[#0D1B2A] text-sm font-medium shadow-sm transition-all animate-in fade-in slide-in-from-top-4">
                        {message}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Language Settings */}
                    <section className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 rounded-3xl p-6 lg:p-8">
                        <div className="flex items-center gap-3 mb-6 px-1 border-b border-transparent">
                            <Globe className="text-[#1B98E0]" size={24} />
                            <h2 className="text-xl font-bold text-[#0D1B2A]">{t('settings_language')}</h2>
                        </div>
                        <div className="px-1">
                            <select 
                                className="w-full md:w-64 bg-white/80 border border-[#0E7C7B]/20 rounded-xl px-4 py-3 text-[#0D1B2A] font-medium focus:outline-none focus:border-[#1B98E0] focus:ring-2 focus:ring-[#1B98E0]/20 transition-all cursor-pointer"
                                value={i18n.language}
                                onChange={(e) => i18n.changeLanguage(e.target.value)}
                            >
                                <option value="en">English (US)</option>
                                <option value="es">Español (ES)</option>
                                <option value="fr">Français (FR)</option>
                                <option value="ur">اردو (UR)</option>
                                <option value="ar">العربية (AR)</option>
                            </select>
                        </div>
                    </section>

                    {/* Account Details */}
                    <section className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 rounded-3xl p-6 lg:p-8">
                        <h2 className="text-xl font-bold text-[#0D1B2A] mb-6 px-1 border-b border-transparent">{t('settings_account_info')}</h2>
                        
                        <div className="flex flex-col gap-5 px-1">
                            <div>
                                <label className="block text-[#3D5A80] text-xs font-bold uppercase tracking-wider mb-2">{t('settings_username')}</label>
                                <div className="bg-[#C2FFF0]/20 border border-[#0E7C7B]/10 rounded-xl px-4 py-3 text-[#0D1B2A]">{user.username}</div>
                            </div>
                            <div>
                                <label className="block text-[#3D5A80] text-xs font-bold uppercase tracking-wider mb-2">{t('settings_email')}</label>
                                <div className="bg-[#C2FFF0]/20 border border-[#0E7C7B]/10 rounded-xl px-4 py-3 text-[#0D1B2A]">{user.email}</div>
                            </div>
                        </div>
                    </section>

                    {/* Data Autonomy */}
                    <section className="bg-red-50/50 backdrop-blur-md border border-red-200 rounded-3xl p-6 lg:p-8">
                        <div className="flex items-center gap-3 mb-6 px-1">
                            <Shield className="text-red-500" size={24} />
                            <h2 className="text-xl font-bold text-[#0D1B2A]">{t('settings_data')}</h2>
                        </div>
                        
                        <div className="space-y-6 px-1">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#0E7C7B]/10 hover:border-red-300 transition-colors">
                                <div>
                                    <h3 className="font-bold text-[#0D1B2A]">{t('settings_clear_history')}</h3>
                                    <p className="text-sm text-[#3D5A80] mt-1 max-w-md">Erase all past conversations with the AI Therapist. This action cannot be undone.</p>
                                </div>
                                <button 
                                    onClick={handleClearHistory}
                                    disabled={isClearing}
                                    className="px-5 py-2.5 bg-[#E8E8E8] hover:bg-[#C2FFF0]/50 text-[#0D1B2A] font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                                >
                                    <Trash2 size={16} /> {isClearing ? '...' : t('settings_clear_history')}
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-red-100 border border-red-300">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <AlertOctagon size={18} className="text-red-600" />
                                        <h3 className="font-bold text-red-900">{t('settings_delete_account')}</h3>
                                    </div>
                                    <p className="text-sm text-red-700 mt-1 max-w-md">Permanently delete your SereneMind account and all associated personal data.</p>
                                </div>
                                <button 
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm shadow shadow-red-500/20 transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                                >
                                    {isDeleting ? '...' : t('settings_delete_account')}
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
