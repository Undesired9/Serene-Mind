import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

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
    <div className="h-screen w-full bg-serene-dark flex items-center justify-center relative overflow-hidden">
      {/* Soft Ambient Background specifically for login */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-serene-accent/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-serene-card/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl z-10">
        <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-serene-accent flex items-center justify-center shadow-lg shadow-serene-accent/20 mb-4">
                <Sparkles className="text-slate-900" size={24} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">SereneMind</h1>
            <p className="text-serene-muted text-sm text-center">Your private, AI-powered space for mental clarity and peace.</p>
        </div>

        {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm text-center">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
                <div>
                    <label className="block text-serene-muted text-xs font-semibold mb-1 uppercase tracking-wider">Username</label>
                    <input 
                        type="text" 
                        required 
                        className="w-full bg-[#151f32] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-serene-accent/50 border border-slate-700/60 transition"
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                </div>
            )}
            <div>
                <label className="block text-serene-muted text-xs font-semibold mb-1 uppercase tracking-wider">Email</label>
                <input 
                    type="email" 
                    required 
                    className="w-full bg-[#151f32] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-serene-accent/50 border border-slate-700/60 transition"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-serene-muted text-xs font-semibold mb-1 uppercase tracking-wider">Password</label>
                <input 
                    type="password" 
                    required 
                    className="w-full bg-[#151f32] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-serene-accent/50 border border-slate-700/60 transition"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-serene-accent hover:bg-sky-300 text-slate-900 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-serene-accent/20 mt-2 flex justify-center items-center"
            >
                {loading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent flex rounded-full animate-spin"></div> : (isRegister ? 'Start Your Journey' : 'Sign In')}
            </button>
        </form>

        <div className="mt-8 text-center text-sm text-serene-muted">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button 
                onClick={() => setIsRegister(!isRegister)} 
                className="ml-2 text-serene-accent hover:underline font-medium"
            >
                {isRegister ? 'Log In' : 'Sign Up'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
