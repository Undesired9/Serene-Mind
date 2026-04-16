import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [loginRole, setLoginRole] = useState('patient');
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const baseEndpoint = loginRole === 'doctor' ? '/api/doctor-auth' : '/api/auth';
    const endpoint = isRegister ? `${baseEndpoint}/register` : `${baseEndpoint}/login`;
    
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
        
        if (data.user.role === 'doctor') {
            navigate('/doctor');
        } else {
            navigate('/dashboard');
        }
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-serene-dark flex items-center justify-center relative overflow-hidden relative">
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium z-20 hover:scale-105 active:scale-95 bg-slate-200/50 hover:bg-slate-300/50 p-2 pr-4 rounded-xl backdrop-blur-sm border border-transparent hover:border-slate-300">
          <ArrowLeft size={20} /> Back to Home
      </Link>
      
      {/* Soft Ambient Background specifically for login */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-300/40 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-200/50 backdrop-blur-xl border border-slate-400 p-8 rounded-3xl shadow-2xl z-10">
        <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-slate-400 flex items-center justify-center shadow-md shadow-slate-400/20 mb-4">
                <Sparkles className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 mb-2">SereneMind</h1>
            <p className="text-slate-600 text-sm text-center">Your private, AI-powered space for mental clarity and peace.</p>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-slate-300/60 p-1.5 rounded-xl mb-6 relative z-10 w-full max-w-[240px] mx-auto border border-slate-300/50">
            <button
                type="button"
                onClick={() => setLoginRole('patient')}
                className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${
                    loginRole === 'patient' 
                        ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-300/40' 
                        : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                Patient
            </button>
            <button
                type="button"
                onClick={() => setLoginRole('doctor')}
                className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${
                    loginRole === 'doctor' 
                        ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-300/40' 
                        : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                Doctor
            </button>
        </div>

        {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm text-center">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
                <div>
                    <label className="block text-slate-600 text-xs font-semibold mb-1 uppercase tracking-wider">Username</label>
                    <input 
                        type="text" 
                        required 
                        className="w-full bg-slate-100 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-400 border border-slate-300 transition"
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                </div>
            )}
            <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1 uppercase tracking-wider">Email</label>
                <input 
                    type="email" 
                    required 
                    className="w-full bg-slate-100 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-400 border border-slate-300 transition"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1 uppercase tracking-wider">Password</label>
                <input 
                    type="password" 
                    required 
                    className="w-full bg-slate-100 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-400 border border-slate-300 transition"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-500 hover:bg-slate-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-slate-500/20 mt-2 flex justify-center items-center"
            >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent flex rounded-full animate-spin"></div> : (isRegister ? 'Start Your Journey' : 'Sign In')}
            </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-600">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button 
                onClick={() => setIsRegister(!isRegister)} 
                className="ml-2 font-bold text-slate-800 hover:text-slate-900 hover:underline transition-colors"
            >
                {isRegister ? 'Log In' : 'Sign Up'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
