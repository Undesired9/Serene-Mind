import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Loader2, AlertCircle, Lock, User } from 'lucide-react';
import { API_BASE } from '../apiConfig';

const parseUser = () => {
  try {
    const userStr = localStorage.getItem('serene_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    localStorage.removeItem('serene_user');
    localStorage.removeItem('serene_token');
    return null;
  }
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in as admin, go straight to the admin panel.
  const user = parseUser();
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const validateField = (name, value) => {
    switch (name) {
      case 'identifier': {
        const id = value.trim();
        if (!id) return 'Enter your username or email';
        if (id.length < 3) return 'Must be at least 3 characters';
        if (id.length > 254) return 'Must be 254 characters or fewer';
        return '';
      }
      case 'password': {
        if (!value) return 'Password is required';
        if (value.length > 64) return 'Must be 64 characters or fewer';
        return '';
      }
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setServerError('');
    setFieldErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const allErrors = {
      identifier: validateField('identifier', formData.identifier),
      password: validateField('password', formData.password),
    };
    setFieldErrors(allErrors);

    if (Object.values(allErrors).some((err) => err)) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password,
        }),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text || `Server returned error status ${response.status}` };
        }
      }

      if (!response.ok) {
        throw new Error(data.error || 'Invalid admin credentials');
      }

      localStorage.setItem('serene_token', data.token);
      localStorage.setItem('serene_user', JSON.stringify(data.user));

      navigate('/admin');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#E8E8E8] flex items-center justify-center relative overflow-hidden">
      <Link
        to="/login"
        className="absolute top-6 left-6 flex items-center gap-2 text-[#3D5A80] hover:text-[#0D1B2A] transition-colors font-medium z-20 hover:scale-105 active:scale-95 bg-white/70 hover:bg-white p-2 pr-4 rounded-xl backdrop-blur-sm border border-[#0E7C7B]/15 hover:border-[#0E7C7B]/30"
      >
        <ArrowLeft size={20} /> Back to Login
      </Link>

      {/* Soft ambient background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C2FFF0]/40 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/60 backdrop-blur-xl border border-[#0E7C7B]/15 p-8 rounded-3xl shadow-2xl z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#0D1B2A] flex items-center justify-center shadow-lg mb-4 border border-[#0E7C7B]/30">
            <ShieldCheck className="text-[#C2FFF0]" size={30} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0D1B2A]">Admin Panel</h1>
          <p className="text-[#3D5A80] text-sm text-center mt-1">
            Restricted access for platform administrators.
          </p>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-xl mb-6 text-sm text-center flex items-center justify-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-[#3D5A80] text-xs font-semibold mb-1 uppercase tracking-wider">
              Username or email
            </label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D5A80]/50" />
              <input
                type="text"
                name="identifier"
                required
                minLength={3}
                maxLength={254}
                autoComplete="username"
                placeholder="Admin username or email"
                className={`w-full bg-white/80 text-[#0D1B2A] rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 border transition ${
                  fieldErrors.identifier
                    ? 'border-red-400 focus:ring-red-400/30'
                    : 'border-[#0E7C7B]/20 focus:ring-[#1B98E0]'
                }`}
                value={formData.identifier}
                onChange={handleChange}
              />
            </div>
            {fieldErrors.identifier && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.identifier}</p>
            )}
          </div>

          <div>
            <label className="block text-[#3D5A80] text-xs font-semibold mb-1 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D5A80]/50" />
              <input
                type="password"
                name="password"
                required
                maxLength={64}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`w-full bg-white/80 text-[#0D1B2A] rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 border transition ${
                  fieldErrors.password
                    ? 'border-red-400 focus:ring-red-400/30'
                    : 'border-[#0E7C7B]/20 focus:ring-[#1B98E0]'
                }`}
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D1B2A] hover:bg-[#1a2e46] text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-2 flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Signing in…
              </>
            ) : (
              'Sign In to Admin Panel'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#3D5A80]">
            Admin accounts are provisioned by the platform — no self-registration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
