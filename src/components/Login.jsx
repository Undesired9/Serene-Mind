import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { authConstraints, validateUsername, validateEmail } from '../utils/authValidation';
import { API_BASE } from '../apiConfig';

const fieldErrorClass = 'border-red-400 focus:ring-red-400/30';
const fieldValidClass = 'border-emerald-400 focus:ring-emerald-400/30';
const fieldDefaultClass = 'border-[#0E7C7B]/20 focus:ring-[#1B98E0]';

const Login = () => {
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', identifier: '', password: '', confirmPassword: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);

    const validateField = (name, value) => {
        if (!value && !touched[name]) return '';
        switch (name) {
            case 'username':
                return validateUsername(value, 'Username');
            case 'email':
                return validateEmail(value);
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
                if (isRegister) {
                    if (value.length < 8) return 'Must be at least 8 characters';
                    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
                        return 'Needs uppercase, lowercase, and a number';
                    }
                }
                return '';
            }
            case 'confirmPassword': {
                if (!value) return 'Please confirm your password';
                if (value !== formData.password) return 'Passwords do not match';
                return '';
            }
            default:
                return '';
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        const error = validateField(name, value);
        setFieldErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setServerError('');
        // Re-validate if field was already touched
        if (touched[name]) {
            const error = validateField(name, value);
            setFieldErrors(prev => ({ ...prev, [name]: error }));
        }
    };

    const getFieldState = (name) => {
        if (fieldErrors[name]) return fieldErrorClass;
        if (touched[name] && !fieldErrors[name] && formData[name]) return fieldValidClass;
        return fieldDefaultClass;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');

        // Validate all fields on submit
        const allTouched = {};
        const allErrors = {};
        const fields = isRegister
            ? ['username', 'email', 'password', 'confirmPassword']
            : ['identifier', 'password'];

        fields.forEach(name => {
            allTouched[name] = true;
            allErrors[name] = validateField(name, formData[name]);
        });
        setTouched(allTouched);
        setFieldErrors(allErrors);

        // Check if there are any errors
        const hasErrors = Object.values(allErrors).some(err => err);
        if (hasErrors) return;

        setLoading(true);

        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        const payload = isRegister
            ? {
                username: formData.username.trim(),
                email: formData.email.trim(),
                password: formData.password,
                confirmPassword: formData.confirmPassword
            }
            : {
                identifier: formData.identifier.trim(),
                password: formData.password
            };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            localStorage.setItem('serene_token', data.token);
            localStorage.setItem('serene_user', JSON.stringify(data.user));

            navigate('/dashboard');
        } catch (err) {
            setServerError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setIsRegister(!isRegister);
        setFieldErrors({});
        setTouched({});
        setServerError('');
        setFormData({ username: '', email: '', identifier: '', password: '', confirmPassword: '' });
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

                {serverError && (
                    <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-xl mb-6 text-sm text-center flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {serverError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {isRegister && (
                        <div>
                            <label className="block text-[#3D5A80] text-xs font-semibold mb-1 uppercase tracking-wider">Username</label>
                            <input
                                type="text"
                                name="username"
                                required
                                minLength={3}
                                maxLength={24}
                                pattern="[A-Za-z0-9._-]+"
                                autoComplete="username"
                                placeholder="mindful_user"
                                className={`w-full bg-white/80 text-[#0D1B2A] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 border transition ${getFieldState('username')}`}
                                value={formData.username}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                            {fieldErrors.username ? (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    {fieldErrors.username}
                                </p>
                            ) : (
                                <p className="text-xs text-[#3D5A80]/70 mt-1">{authConstraints.username}</p>
                            )}
                        </div>
                    )}
                    {isRegister ? (
                        <div>
                            <label className="block text-[#3D5A80] text-xs font-semibold mb-1 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                name="email"
                                required
                                maxLength={254}
                                autoComplete="email"
                                placeholder="you@example.com"
                                className={`w-full bg-white/80 text-[#0D1B2A] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 border transition ${getFieldState('email')}`}
                                value={formData.email}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                            {fieldErrors.email && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    {fieldErrors.email}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-[#3D5A80] text-xs font-semibold mb-1 uppercase tracking-wider">Username or email</label>
                            <input
                                type="text"
                                name="identifier"
                                required
                                minLength={3}
                                maxLength={254}
                                autoComplete="username"
                                placeholder="Username or email"
                                className={`w-full bg-white/80 text-[#0D1B2A] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 border transition ${getFieldState('identifier')}`}
                                value={formData.identifier}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                            {fieldErrors.identifier && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    {fieldErrors.identifier}
                                </p>
                            )}
                        </div>
                    )}
                    <div>
                        <label className="block text-[#3D5A80] text-xs font-semibold mb-1 uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            minLength={isRegister ? 8 : 1}
                            maxLength={64}
                            autoComplete={isRegister ? 'new-password' : 'current-password'}
                            placeholder={isRegister ? 'Create a strong password' : 'Enter your password'}
                            className={`w-full bg-white/80 text-[#0D1B2A] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 border transition ${getFieldState('password')}`}
                            value={formData.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        {fieldErrors.password ? (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                {fieldErrors.password}
                            </p>
                        ) : isRegister ? (
                            <p className="text-xs text-[#3D5A80]/70 mt-1">{authConstraints.password}</p>
                        ) : null}
                    </div>
                    {isRegister && (
                        <div>
                            <label className="block text-[#3D5A80] text-xs font-semibold mb-1 uppercase tracking-wider">Confirm password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                required
                                minLength={8}
                                maxLength={64}
                                autoComplete="new-password"
                                placeholder="Re-enter your password"
                                className={`w-full bg-white/80 text-[#0D1B2A] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 border transition ${getFieldState('confirmPassword')}`}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                            {fieldErrors.confirmPassword && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    {fieldErrors.confirmPassword}
                                </p>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1B98E0] hover:bg-[#1689C9] text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-[#1B98E0]/20 mt-2 flex justify-center items-center"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent flex rounded-full animate-spin"></div> : (isRegister ? 'Start Your Journey' : 'Login')}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-[#3D5A80]">
                    {isRegister ? 'Already have an account?' : "Don't have an account?"}
                    <button
                        onClick={switchMode}
                        className="ml-2 font-bold text-[#0E7C7B] hover:text-[#0A5E5D] hover:underline transition-colors"
                    >
                        {isRegister ? 'Log In' : 'Sign Up'}
                    </button>
                </div>

                <div className="mt-4 text-center">
                    <Link to="/doctor-login" className="text-sm font-semibold text-[#1B98E0] hover:text-[#1689C9] hover:underline transition-colors">
                        Continue to the doctor portal
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
