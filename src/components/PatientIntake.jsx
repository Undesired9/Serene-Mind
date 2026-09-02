import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, ShieldCheck, User, HeartHandshake, Sparkles } from 'lucide-react';
import { API_BASE } from '../apiConfig';

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]{1,79}$/;
const PHONE_PATTERN = /^\+?[0-9\s()-]{7,20}$/;
const TODAY = new Date().toISOString().split('T')[0];
const MIN_DOB = `${new Date().getFullYear() - 120}-01-01`;

const GENDER_OPTIONS = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Non-binary', label: 'Non-binary' },
    { value: 'Prefer not to say', label: 'Prefer not to say' },
    { value: 'Other', label: 'Other' }
];

const RELATIONSHIP_OPTIONS = [
    { value: 'Parent', label: 'Parent' },
    { value: 'Spouse/Partner', label: 'Spouse / Partner' },
    { value: 'Sibling', label: 'Sibling' },
    { value: 'Child', label: 'Child / Dependent' },
    { value: 'Friend', label: 'Friend' },
    { value: 'Guardian', label: 'Guardian' },
    { value: 'Other', label: 'Other' }
];

const DURATION_OPTIONS = [
    { value: 'Just started (< 1 month)', label: 'Just started (< 1 month)' },
    { value: '1 to 6 months', label: '1 to 6 months' },
    { value: '6 to 12 months', label: '6 to 12 months' },
    { value: 'Over 1 year', label: 'Over 1 year' }
];

const sanitizePhone = (val = '') => {
    // Only allow digits, plus sign at start, spaces, dashes, and parentheses, capped at 16 chars
    return String(val)
        .replace(/[^0-9+\s()-]/g, '')
        .slice(0, 16);
};

const sanitizeName = (val = '') => {
    return String(val)
        .replace(/[^A-Za-z\s.'-]/g, '')
        .slice(0, 80);
};

const PatientIntake = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1); // 1 = Personal & Contact, 2 = Clinical Context
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        // Step 1: Personal & Emergency
        fullLegalName: '',
        dateOfBirth: '',
        genderSex: '',
        phoneNumber: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',

        // Step 2: Clinical Context
        presentingProblem: '',
        symptomDuration: '',
        treatmentGoals: '',
        currentMedicalConditions: ''
    });

    useEffect(() => {
        const loadExistingIntake = async () => {
            try {
                const token = localStorage.getItem('serene_token');
                const response = await fetch(`${API_BASE}/api/auth/intake`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                let data;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    try { data = JSON.parse(text); } catch { data = { error: text }; }
                }

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load intake form.');
                }

                if (data.intake) {
                    setFormData((prev) => ({
                        ...prev,
                        fullLegalName: data.intake.full_legal_name || '',
                        dateOfBirth: data.intake.date_of_birth || '',
                        genderSex: data.intake.gender_sex || '',
                        phoneNumber: data.intake.phone_number || '',
                        emergencyContactName: data.intake.emergency_contact_name || '',
                        emergencyContactPhone: data.intake.emergency_contact_phone || '',
                        emergencyContactRelationship: data.intake.emergency_contact_relationship || '',
                        presentingProblem: data.intake.presenting_problem || '',
                        symptomDuration: data.intake.symptom_duration || '',
                        treatmentGoals: data.intake.treatment_goals || '',
                        currentMedicalConditions: data.intake.current_medical_conditions || ''
                    }));
                }
            } catch (err) {
                console.warn('Could not prefill intake:', err.message);
            } finally {
                setLoading(false);
            }
        };

        loadExistingIntake();
    }, []);

    const handleChange = (field, value) => {
        let cleanedValue = value;
        if (field === 'phoneNumber' || field === 'emergencyContactPhone') {
            cleanedValue = sanitizePhone(value);
        } else if (field === 'fullLegalName' || field === 'emergencyContactName') {
            cleanedValue = sanitizeName(value);
        } else if (field === 'presentingProblem') {
            cleanedValue = value.slice(0, 1000);
        } else if (field === 'treatmentGoals' || field === 'currentMedicalConditions') {
            cleanedValue = value.slice(0, 500);
        }

        setFormData((prev) => ({ ...prev, [field]: cleanedValue }));
        if (error) setError('');
    };

    const validateStep1 = () => {
        const name = formData.fullLegalName.trim();
        if (!name || name.length < 2) {
            return 'Please enter your full legal name (at least 2 characters).';
        }
        if (name.length > 80) {
            return 'Full legal name must not exceed 80 characters.';
        }
        if (!NAME_PATTERN.test(name)) {
            return 'Full legal name should contain letters, spaces, dots, or hyphens only.';
        }

        if (!formData.dateOfBirth) {
            return 'Date of birth is required.';
        }
        const dob = new Date(formData.dateOfBirth);
        const now = new Date();
        const age = now.getFullYear() - dob.getFullYear() - (
            now.getMonth() < dob.getMonth() ||
            (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate()) ? 1 : 0
        );
        if (Number.isNaN(dob.getTime()) || formData.dateOfBirth > TODAY || age < 5 || age > 120) {
            return 'Please enter a valid date of birth (age between 5 and 120).';
        }

        if (!formData.genderSex) {
            return 'Please select your gender.';
        }

        const phone = formData.phoneNumber.trim();
        if (!phone || phone.length < 7 || phone.length > 18 || !PHONE_PATTERN.test(phone)) {
            return 'Please enter a valid primary phone number (7-16 digits, e.g. +1 555-0199).';
        }

        const eName = formData.emergencyContactName.trim();
        if (!eName || eName.length < 2 || !NAME_PATTERN.test(eName)) {
            return 'Please enter an emergency contact full name.';
        }

        const ePhone = formData.emergencyContactPhone.trim();
        if (!ePhone || ePhone.length < 7 || ePhone.length > 18 || !PHONE_PATTERN.test(ePhone)) {
            return 'Please enter a valid emergency contact phone number (7-16 digits).';
        }

        return '';
    };

    const validateStep2 = () => {
        const problem = formData.presentingProblem.trim();
        if (!problem || problem.length < 3) {
            return 'Please provide a brief description of what brings you in (at least 3 characters).';
        }
        if (problem.length > 1000) {
            return 'Primary concern must not exceed 1000 characters.';
        }
        return '';
    };

    const handleNext = (e) => {
        e.preventDefault();
        const step1Error = validateStep1();
        if (step1Error) {
            setError(step1Error);
            return;
        }
        setError('');
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const step1Error = validateStep1();
        if (step1Error) {
            setCurrentStep(1);
            setError(step1Error);
            return;
        }

        const step2Error = validateStep2();
        if (step2Error) {
            setError(step2Error);
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch(`${API_BASE}/api/auth/intake`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                try { data = JSON.parse(text); } catch { data = { error: text || `Server error (${response.status})` }; }
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save intake form.');
            }

            const userStr = localStorage.getItem('serene_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.needsIntake = false;
                localStorage.setItem('serene_user', JSON.stringify(user));
            }

            navigate('/assessment', { replace: true });
        } catch (saveError) {
            setError(saveError.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#E8E8E8] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#1B98E0] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#E8E8E8] py-8 px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-3">
                        <ClipboardList className="text-[#1B98E0]" size={28} />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#0D1B2A] mb-2">Patient Intake Form</h1>
                    <p className="text-[#3D5A80] text-sm md:text-base max-w-xl mx-auto">
                        Please provide your baseline contact and care details before starting your mental health assessment.
                    </p>
                </div>

                {/* Progress Card */}
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#0E7C7B]/10 shadow-sm mb-6">
                    <div className="flex items-center justify-between mb-3 text-xs font-semibold text-[#3D5A80]">
                        <span className="flex items-center gap-1.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${currentStep >= 1 ? 'bg-[#1B98E0]' : 'bg-gray-300'}`}>1</span>
                            Personal & Contact
                        </span>
                        <div className="h-0.5 flex-1 mx-3 bg-[#E8E8E8]">
                            <div className={`h-full bg-[#1B98E0] transition-all duration-300 ${currentStep === 2 ? 'w-full' : 'w-0'}`} />
                        </div>
                        <span className="flex items-center gap-1.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${currentStep === 2 ? 'bg-[#1B98E0]' : 'bg-gray-300'}`}>2</span>
                            Care Context
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                        <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                        <span>Confidential and strictly protected under clinical privacy standards.</span>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-700 text-sm font-medium shadow-sm flex items-center justify-between">
                        <span>{error}</span>
                        <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-800 text-xs font-bold ml-3">✕</button>
                    </div>
                )}

                {/* Main Form */}
                <form onSubmit={currentStep === 1 ? handleNext : handleSubmit}>
                    {/* STEP 1: Personal & Emergency Support */}
                    {currentStep === 1 && (
                        <div className="bg-white rounded-3xl border border-[#0E7C7B]/10 shadow-sm p-6 md:p-8 space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                                <div className="p-2 bg-[#1B98E0]/10 rounded-xl text-[#1B98E0]">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#0D1B2A]">Personal & Emergency Contact</h2>
                                    <p className="text-xs text-[#3D5A80]">Essential identification and emergency crisis contact.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Full Name */}
                                <div className="md:col-span-2">
                                    <label className="flex items-center justify-between text-sm font-semibold text-[#0D1B2A] mb-1.5">
                                        <span>Full Legal Name <span className="text-rose-500">*</span></span>
                                        <span className="text-[11px] font-medium text-[#1B98E0]">Required</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.fullLegalName}
                                        onChange={(e) => handleChange('fullLegalName', e.target.value)}
                                        placeholder="e.g. John Doe"
                                        minLength={2}
                                        maxLength={80}
                                        className="w-full rounded-xl border border-[#0E7C7B]/20 bg-[#F8FBFB] px-4 py-3 text-sm text-[#0D1B2A] outline-none focus:border-[#1B98E0] focus:bg-white transition"
                                        required
                                    />
                                </div>

                                {/* Date of Birth */}
                                <div>
                                    <label className="flex items-center justify-between text-sm font-semibold text-[#0D1B2A] mb-1.5">
                                        <span>Date of Birth <span className="text-rose-500">*</span></span>
                                        <span className="text-[11px] font-medium text-[#1B98E0]">Required</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dateOfBirth}
                                        min={MIN_DOB}
                                        max={TODAY}
                                        onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                                        className="w-full rounded-xl border border-[#0E7C7B]/20 bg-[#F8FBFB] px-4 py-3 text-sm text-[#0D1B2A] outline-none focus:border-[#1B98E0] focus:bg-white transition"
                                        required
                                    />
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="flex items-center justify-between text-sm font-semibold text-[#0D1B2A] mb-1.5">
                                        <span>Gender <span className="text-rose-500">*</span></span>
                                        <span className="text-[11px] font-medium text-[#1B98E0]">Required</span>
                                    </label>
                                    <select
                                        value={formData.genderSex}
                                        onChange={(e) => handleChange('genderSex', e.target.value)}
                                        className="w-full rounded-xl border border-[#0E7C7B]/20 bg-[#F8FBFB] px-4 py-3 text-sm text-[#0D1B2A] outline-none focus:border-[#1B98E0] focus:bg-white transition"
                                        required
                                    >
                                        <option value="">Select gender...</option>
                                        {GENDER_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Phone Number */}
                                <div className="md:col-span-2">
                                    <label className="flex items-center justify-between text-sm font-semibold text-[#0D1B2A] mb-1.5">
                                        <span>Primary Phone Number <span className="text-rose-500">*</span></span>
                                        <span className="text-[11px] font-medium text-[#1B98E0]">Required (7-16 digits)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phoneNumber}
                                        onChange={(e) => handleChange('phoneNumber', e.target.value)}
                                        placeholder="e.g. 0300-1234567 or +92 300 1234567"
                                        minLength={7}
                                        maxLength={16}
                                        className="w-full rounded-xl border border-[#0E7C7B]/20 bg-[#F8FBFB] px-4 py-3 text-sm text-[#0D1B2A] outline-none focus:border-[#1B98E0] focus:bg-white transition"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Emergency Contact Subsection */}
                            <div className="border-t border-gray-100 pt-5 mt-2 space-y-4">
                                <div className="flex items-center gap-2">
                                    <HeartHandshake className="text-[#0E7C7B]" size={18} />
                                    <h3 className="text-sm font-bold text-[#0D1B2A] uppercase tracking-wider">Emergency Contact Person</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="flex items-center justify-between text-xs font-semibold text-[#3D5A80] mb-1.5">
                                            <span>Contact Full Name <span className="text-rose-500">*</span></span>
                                            <span className="text-[10px] text-[#1B98E0]">Required</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.emergencyContactName}
                                            onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                                            placeholder="e.g. Jane Doe"
                                            minLength={2}
                                            maxLength={80}
                                            className="w-full rounded-xl border border-[#0E7C7B]/20 bg-[#F8FBFB] px-4 py-2.5 text-sm text-[#0D1B2A] outline-none focus:border-[#1B98E0] focus:bg-white transition"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="flex items-center justify-between text-xs font-semibold text-[#3D5A80] mb-1.5">
                                            <span>Contact Phone Number <span className="text-rose-500">*</span></span>
                                            <span className="text-[10px] text-[#1B98E0]">Required (7-16 digits)</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.emergencyContactPhone}
                                            onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                                            placeholder="e.g. 0312-3456789"
                                            minLength={7}
                                            maxLength={16}
                                            className="w-full rounded-xl border border-[#0E7C7B]/20 bg-[#F8FBFB] px-4 py-2.5 text-sm text-[#0D1B2A] outline-none focus:border-[#1B98E0] focus:bg-white transition"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="flex items-center justify-between text-xs font-semibold text-[#3D5A80] mb-1.5">
                                            <span>Relationship to You</span>
                                            <span className="text-[10px] text-gray-400">Optional</span>
                                        </label>
                                        <select
                                            value={formData.emergencyContactRelationship}
                                            onChange={(e) => handleChange('emergencyContactRelationship', e.target.value)}
                                            className="w-full rounded-xl border border-[#0E7C7B]/20 bg-[#F8FBFB] px-4 py-2.5 text-sm text-[#0D1B2A] outline-none focus:border-[#1B98E0] focus:bg-white transition"
                                        >
                                            <option value="">Select relationship (optional)...</option>
                                            {RELATIONSHIP_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Step 1 Actions */}
                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    className="bg-[#1B98E0] hover:bg-[#1689C9] text-white font-bold py-3 px-7 rounded-xl transition-all shadow-md shadow-[#1B98E0]/20 flex items-center gap-2 text-sm"
                                >
                                    Continue to Care Context <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Clinical Care Context */}
                    {currentStep === 2 && (
                        <div className="bg-white rounded-3xl border border-[#0E7C7B]/10 shadow-sm p-6 md:p-8 space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                                <div className="p-2 bg-[#0E7C7B]/10 rounded-xl text-[#0E7C7B]">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#0D1B2A]">Care & Wellness Context</h2>
                                    <p className="text-xs text-[#3D5A80]">Help the AI and clinicians understand what you are seeking support for.</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Presenting Problem */}
                                <div>
                                    <label className="flex items-center justify-between text-sm font-semibold text-[#0D1B2A] mb-1.5">
                                        <span>Primary Concern / What brings you to SereneMind <span className="text-rose-500">*</span></span>
                                        <span className="text-[11px] font-medium text-[#1B98E0]">Required</span>
                                    </label>
                                    <textarea
                                        value={formData.presentingProblem}
                                        onChange={(e) => handleChange('presentingProblem', e.target.value)}
                                        placeholder="Describe what you are currently experiencing (e.g. anxiety, work stress, sleep issues, low mood, relationship changes)..."
                                        className="w-full rounded-xl border border-[#0E7C7B]/20 bg-[#F8FBFB] px-4 py-3 text-sm text-[#0D1B2A] outline-none focus:border-[#1B98E0] focus:bg-white min-h-[110px] resize-y transition"
                                        required
                                    />
                                </div>

                                {/* Symptom Duration */}
                                <div>
                                    <label className="flex items-center justify-between text-sm font-semibold text-[#0D1B2A] mb-1.5">
                                        <span>Approximate Duration of Symptoms</span>
                                        <span className="text-[11px] text-gray-400 font-medium">Optional</span>
                                    </label>
                                    <select
                                        value={formData.symptomDuration}
                                        onChange={(e) => handleChange('symptomDuration', e.target.value)}
                                        className="w-full rounded-xl border border-[#0E7C7B]/20 bg-[#F8FBFB] px-4 py-3 text-sm text-[#0D1B2A] outline-none focus:border-[#1B98E0] focus:bg-white transition"
                                    >
                                        <option value="">Select timeframe (optional)...</option>
                                        {DURATION_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Goals */}
                                <div>
                                    <label className="flex items-center justify-between text-sm font-semibold text-[#0D1B2A] mb-1.5">
                                        <span>What are your personal goals for therapy or wellness support?</span>
                                        <span className="text-[11px] text-gray-400 font-medium">Optional</span>
                                    </label>
                                    <textarea
                                        value={formData.treatmentGoals}
                                        onChange={(e) => handleChange('treatmentGoals', e.target.value)}
                                        placeholder="e.g. Learn coping mechanisms, improve sleep, manage panic attacks, regain motivation..."
                                        className="w-full rounded-xl border border-[#0E7C7B]/20 bg-[#F8FBFB] px-4 py-3 text-sm text-[#0D1B2A] outline-none focus:border-[#1B98E0] focus:bg-white min-h-[90px] resize-y transition"
                                    />
                                </div>

                                {/* Medical conditions / meds */}
                                <div>
                                    <label className="flex items-center justify-between text-sm font-semibold text-[#0D1B2A] mb-1.5">
                                        <span>Relevant Medical Conditions or Current Medications</span>
                                        <span className="text-[11px] text-gray-400 font-medium">Optional</span>
                                    </label>
                                    <textarea
                                        value={formData.currentMedicalConditions}
                                        onChange={(e) => handleChange('currentMedicalConditions', e.target.value)}
                                        placeholder="List any physical health conditions or current medications (optional)..."
                                        className="w-full rounded-xl border border-[#0E7C7B]/20 bg-[#F8FBFB] px-4 py-3 text-sm text-[#0D1B2A] outline-none focus:border-[#1B98E0] focus:bg-white min-h-[80px] resize-y transition"
                                    />
                                </div>
                            </div>

                            {/* Step 2 Actions */}
                            <div className="flex items-center justify-between pt-5 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => { setError(''); setCurrentStep(1); }}
                                    className="px-5 py-2.5 rounded-xl border border-[#0E7C7B]/20 text-[#0D1B2A] font-semibold flex items-center gap-2 text-sm hover:bg-gray-50 transition"
                                >
                                    <ArrowLeft size={16} /> Back to Step 1
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-[#1B98E0] hover:bg-[#1689C9] disabled:opacity-60 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md shadow-[#1B98E0]/20 flex items-center gap-2 text-sm"
                                >
                                    {saving ? 'Saving...' : 'Proceed to Clinical Assessment'}
                                    {!saving && <CheckCircle2 size={18} />}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default PatientIntake;
