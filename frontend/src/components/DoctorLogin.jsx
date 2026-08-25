import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authConstraints, validateUsername, validateEmail, validateFullName } from '../utils/authValidation';
import { API_BASE } from '../apiConfig';

const styles = {
  page: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0D1B2A 0%, #1a2e46 50%, #0a4a48 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  blob1: {
    position: 'absolute',
    top: '-150px',
    right: '-150px',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(14,124,123,0.25) 0%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute',
    bottom: '-150px',
    left: '-100px',
    width: '450px',
    height: '450px',
    background: 'radial-gradient(circle, rgba(27,152,224,0.15) 0%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  backLink: {
    position: 'absolute',
    top: '24px',
    left: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'rgba(255,255,255,0.65)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    padding: '8px 16px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s',
    zIndex: 10,
  },
  patientLink: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '500',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '8px 14px',
    borderRadius: '10px',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s',
    zIndex: 10,
  },
  wrapper: {
    width: '100%',
    maxWidth: '440px',
    padding: '0 16px',
    position: 'relative',
    zIndex: 10,
  },
  card: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '28px',
    padding: '40px 36px',
    boxShadow: '0 30px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
  },
  iconWrap: {
    width: '60px',
    height: '60px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #0E7C7B, #1B98E0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    boxShadow: '0 10px 30px rgba(14,124,123,0.45)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    width: '20px',
    height: '20px',
    background: '#10b981',
    borderRadius: '50%',
    border: '2px solid #0D1B2A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#ffffff',
    margin: '0 0 6px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    margin: 0,
  },
  error: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '13px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  helperText: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.38)',
    lineHeight: 1.45,
    marginTop: '4px',
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'rgba(255,255,255,0.3)',
    pointerEvents: 'none',
    display: 'flex',
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    color: '#ffffff',
    borderRadius: '12px',
    padding: '12px 16px 12px 44px',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s',
  },
  btn: {
    width: '100%',
    background: 'linear-gradient(135deg, #0E7C7B, #1B98E0)',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '15px',
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: '0 8px 24px rgba(14,124,123,0.4)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  footer: {
    marginTop: '28px',
    textAlign: 'center',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#C2FFF0',
    fontWeight: '700',
    fontSize: '13px',
    marginLeft: '6px',
    padding: 0,
    textDecoration: 'underline',
  },
  secureBadge: {
    marginTop: '20px',
    textAlign: 'center',
  },
  securePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: 'rgba(255,255,255,0.25)',
    fontSize: '11px',
    background: 'rgba(255,255,255,0.04)',
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  tabRow: {
    display: 'flex',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '4px',
    marginBottom: '24px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  tab: {
    flex: 1,
    padding: '9px',
    borderRadius: '9px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
    background: 'transparent',
    color: 'rgba(255,255,255,0.4)',
  },
  tabActive: {
    background: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
};

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('doctor-login-styles')) {
  const style = document.createElement('style');
  style.id = 'doctor-login-styles';
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    .doc-input:focus { border-color: rgba(14,124,123,0.6) !important; background: rgba(255,255,255,0.09) !important; }
    .doc-input::placeholder { color: rgba(255,255,255,0.2); }
    .doc-back:hover { color: rgba(255,255,255,0.9) !important; background: rgba(255,255,255,0.12) !important; }
    .doc-patient-link:hover { color: rgba(255,255,255,0.8) !important; background: rgba(255,255,255,0.1) !important; }
    .doc-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 30px rgba(14,124,123,0.5) !important; }
    .doc-btn:active:not(:disabled) { transform: translateY(0); }
  `;
  document.head.appendChild(style);
}

const DoctorLogin = () => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    identifier: '',
    password: '',
    confirmPassword: '',
    specialization: '',
    licenseNumber: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateField = (name, value) => {
    switch (name) {
      case 'fullName':
        return validateFullName(value);
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
    if (touched[name]) {
      const error = validateField(name, value);
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const getFieldBorderColor = (name) => {
    if (fieldErrors[name]) return 'rgba(239,68,68,0.6)';
    if (touched[name] && !fieldErrors[name] && formData[name]) return 'rgba(34,197,94,0.5)';
    return 'rgba(255,255,255,0.12)';
  };

  const getFieldBg = (name) => {
    if (fieldErrors[name]) return 'rgba(239,68,68,0.08)';
    return 'rgba(255,255,255,0.05)';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const allTouched = {};
    const allErrors = {};
    const fields = isRegister
      ? ['fullName', 'username', 'email', 'password', 'confirmPassword']
      : ['identifier', 'password'];

    fields.forEach(name => {
      allTouched[name] = true;
      allErrors[name] = validateField(name, formData[name]);
    });
    setTouched(allTouched);
    setFieldErrors(allErrors);

    const hasErrors = Object.values(allErrors).some(err => err);
    if (hasErrors) return;

    setLoading(true);
    const endpoint = isRegister ? '/api/auth/doctor/register' : '/api/auth/doctor/login';
    const payload = isRegister
      ? {
          fullName: formData.fullName.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          specialization: formData.specialization.trim(),
          licenseNumber: formData.licenseNumber.trim(),
        }
      : {
          identifier: formData.identifier.trim(),
          password: formData.password,
        };
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      localStorage.setItem('serene_token', data.token);
      localStorage.setItem('serene_user', JSON.stringify(data.user));
      navigate('/doctor');
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
    setFormData({
      fullName: '', username: '', email: '', identifier: '',
      password: '', confirmPassword: '', specialization: '', licenseNumber: '',
    });
  };

  const fieldErrorStyle = (name) => ({
    background: getFieldBg(name),
    borderColor: getFieldBorderColor(name),
  });

  return (
    <div style={styles.page}>
      {/* Blobs */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      {/* Back link */}
      <Link to="/" style={styles.backLink} className="doc-back">
        ← Back to Home
      </Link>

      {/* Patient login link */}
      <Link to="/login" style={styles.patientLink} className="doc-patient-link">
        Patient Login →
      </Link>

      <div style={styles.wrapper}>
        <div style={styles.card}>

          {/* Header */}
          <div style={styles.header}>
            <div style={styles.iconWrap}>
              {/* Stethoscope SVG */}
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
                <circle cx="20" cy="10" r="2"/>
              </svg>
              <div style={styles.badge}>
                {/* Shield check */}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0D1B2A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
            <h1 style={styles.title}>Doctor Portal</h1>
            <p style={styles.subtitle}>Secure access for healthcare professionals</p>
          </div>

          {/* Tabs */}
          <div style={styles.tabRow}>
            <button
              type="button"
              onClick={switchMode}
              style={{ ...styles.tab, ...(!isRegister ? styles.tabActive : {}) }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={switchMode}
              style={{ ...styles.tab, ...(isRegister ? styles.tabActive : {}) }}
            >
              Register
            </button>
          </div>

          {/* Server Error */}
          {serverError && (
            <div style={{ ...styles.error, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {serverError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={styles.form} noValidate>

            {isRegister && (
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  </span>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="Dr. Jane Smith"
                    className="doc-input"
                    style={{ ...styles.input, ...fieldErrorStyle('fullName') }}
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                {fieldErrors.fullName && <div style={{ color: '#fca5a5', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {fieldErrors.fullName}
                </div>}
              </div>
            )}

            {isRegister && (
              <div style={styles.field}>
                <label style={styles.label}>Username</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  </span>
                  <input
                    type="text"
                    name="username"
                    required
                    minLength={3}
                    maxLength={24}
                    pattern="[A-Za-z0-9._-]+"
                    autoComplete="username"
                    placeholder="dr_smith"
                    className="doc-input"
                    style={{ ...styles.input, ...fieldErrorStyle('username') }}
                    value={formData.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                {fieldErrors.username ? (
                  <div style={{ color: '#fca5a5', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {fieldErrors.username}
                  </div>
                ) : (
                  <div style={styles.helperText}>{authConstraints.username}</div>
                )}
              </div>
            )}

            {isRegister ? (
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </span>
                  <input
                    type="email"
                    name="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="doctor@hospital.com"
                    className="doc-input"
                    style={{ ...styles.input, ...fieldErrorStyle('email') }}
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                {fieldErrors.email && <div style={{ color: '#fca5a5', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {fieldErrors.email}
                </div>}
              </div>
            ) : (
              <div style={styles.field}>
                <label style={styles.label}>Username or Email</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="M12 12h.01"/></svg>
                  </span>
                  <input
                    type="text"
                    name="identifier"
                    required
                    minLength={3}
                    maxLength={254}
                    autoComplete="username"
                    placeholder="Username or email"
                    className="doc-input"
                    style={{ ...styles.input, ...fieldErrorStyle('identifier') }}
                    value={formData.identifier}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                {fieldErrors.identifier && <div style={{ color: '#fca5a5', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {fieldErrors.identifier}
                </div>}
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  maxLength={64}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  className="doc-input"
                  style={{ ...styles.input, ...fieldErrorStyle('password') }}
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </div>
              {fieldErrors.password ? (
                <div style={{ color: '#fca5a5', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {fieldErrors.password}
                </div>
              ) : isRegister ? (
                <div style={styles.helperText}>{authConstraints.password}</div>
              ) : null}
            </div>

            {isRegister && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>Confirm Password</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </span>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      minLength={8}
                      maxLength={64}
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      className="doc-input"
                      style={{ ...styles.input, ...fieldErrorStyle('confirmPassword') }}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                  {fieldErrors.confirmPassword && <div style={{ color: '#fca5a5', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {fieldErrors.confirmPassword}
                  </div>}
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Specialization</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                    </span>
                    <input
                      type="text"
                      name="specialization"
                      maxLength={80}
                      placeholder="e.g. Psychiatry, Psychology"
                      className="doc-input"
                      style={styles.input}
                      value={formData.specialization}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>License Number</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </span>
                    <input
                      type="text"
                      name="licenseNumber"
                      maxLength={40}
                      placeholder="Medical license ID"
                      className="doc-input"
                      style={styles.input}
                      value={formData.licenseNumber}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="doc-btn"
              style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
            >
              {loading
                ? <div style={styles.spinner} />
                : (isRegister ? 'Create Doctor Account' : 'Sign In to Portal')
              }
            </button>
          </form>

          {/* Footer toggle */}
          <div style={styles.footer}>
            {isRegister ? 'Already registered?' : "Don't have an account?"}
            <button
              type="button"
              onClick={switchMode}
              style={styles.toggleBtn}
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </div>
        </div>

        {/* Secure badge */}
        <div style={styles.secureBadge}>
          <span style={styles.securePill}>
            🔒 HIPAA Compliant · Encrypted · Secure
          </span>
        </div>
      </div>
    </div>
  );
};

export default DoctorLogin;
