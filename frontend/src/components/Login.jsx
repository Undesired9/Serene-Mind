import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

        try {
            const response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            localStorage.setItem('serene_token', data.token);
            localStorage.setItem('serene_user', JSON.stringify(data.user));

            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full bg-[#E8E8E8] flex items-center justify-center relative overflow-hidden">
            <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-[#3D5A80] hover:text-[#0D1B2A] transition-colors font-medium z-20 hover:scale-105 active:scale-95 bg-[#C2FFF0]/40 hover:bg-[#C2FFF0]/70 p-2 pr-4 rounded-xl backdrop-blur-sm border border-[#0E7C7B]/10 hover:border-[#0E7C7B]/30">
                <ArrowLeft size={20} /> Back to Home
            </Link>

            {/* Soft Ambient Background specifically for login */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C2FFF0]/40 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md bg-white/60 backdrop-blur-xl border border-[#0E7C7B]/15 p-8 rounded-3xl shadow-2xl z-10">
                <div className="flex flex-col items-center mb-8">
                    <img src="/Serene Mind.svg" alt="SereneMind Logo" className="w-24 h-24 object-contain mb-4 drop-shadow-md" />
                    <h1 className="text-3xl font-bold tracking-tight text-[#0D1B2A] mb-2">SereneMind</h1>
                    <p className="text-[#3D5A80] text-sm text-center">Your private, AI-powered space for mental clarity and peace.</p>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div>
                            <label className="block text-[#3D5A80] text-xs font-semibold mb-1 uppercase tracking-wider">Username</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-white/80 text-[#0D1B2A] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1B98E0] border border-[#0E7C7B]/20 transition"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-[#3D5A80] text-xs font-semibold mb-1 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-white/80 text-[#0D1B2A] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1B98E0] border border-[#0E7C7B]/20 transition"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[#3D5A80] text-xs font-semibold mb-1 uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-white/80 text-[#0D1B2A] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1B98E0] border border-[#0E7C7B]/20 transition"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1B98E0] hover:bg-[#1689C9] text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-[#1B98E0]/20 mt-2 flex justify-center items-center"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent flex rounded-full animate-spin"></div> : (isRegister ? 'Start Your Journey' : 'Sign In')}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-[#3D5A80]">
                    {isRegister ? 'Already have an account?' : "Don't have an account?"}
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        className="ml-2 font-bold text-[#0E7C7B] hover:text-[#0A5E5D] hover:underline transition-colors"
                    >
                        {isRegister ? 'Log In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
