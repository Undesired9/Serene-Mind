import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, ShieldCheck } from 'lucide-react';

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]{1,79}$/;
const PHONE_PATTERN = /^\+?[0-9\s()-]{7,20}$/;
const ID_PATTERN = /^[A-Za-z0-9/-]{4,30}$/;
const TEXT_ONLY_PATTERN = /^[A-Za-z0-9\s,.'()/-]{2,80}$/;

const TODAY = new Date().toISOString().split('T')[0];
const MIN_DOB = `${new Date().getFullYear() - 120}-01-01`;

const intakeSections = [
    {
        title: 'Basics',
        shortTitle: 'Basics',
        description: 'Name, birth date, and contact details.',
        fields: [
            { key: 'fullLegalName', label: 'Full legal name', required: true, placeholder: 'Enter full legal name' },
            { key: 'preferredName', label: 'Preferred name', placeholder: 'Preferred name or nickname' },
            { key: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true },
            { key: 'genderSex', label: 'Gender/sex', placeholder: 'Gender or sex, if relevant' },
            { key: 'nationalId', label: 'National ID or patient ID number', placeholder: 'Optional ID number' },
            { key: 'maritalStatus', label: 'Marital status', placeholder: 'Single, married, divorced, etc.' },
            { key: 'occupation', label: 'Occupation', placeholder: 'Current occupation' },
            { key: 'educationLevel', label: 'Education level', placeholder: 'Highest completed level' },
            { key: 'address', label: 'Address', type: 'textarea', placeholder: 'Current residential address' },
            { key: 'phoneNumber', label: 'Phone number', type: 'tel', required: true, placeholder: 'Primary phone number' },
            { key: 'emailAddress', label: 'Email address', type: 'email', required: true, placeholder: 'Patient email address' }
        ]
    },
    {
        title: 'Support contact',
        shortTitle: 'Support',
        description: 'Who we should contact in an urgent situation.',
        fields: [
            { key: 'emergencyContactName', label: 'Name', required: true, placeholder: 'Emergency contact full name' },
            { key: 'emergencyContactRelationship', label: 'Relationship to patient', placeholder: 'Parent, spouse, sibling, friend, etc.' },
            { key: 'emergencyContactPhone', label: 'Phone number', type: 'tel', required: true, placeholder: 'Primary emergency contact number' },
            { key: 'emergencyContactAltPhone', label: 'Alternative contact number', type: 'tel', placeholder: 'Backup contact number' },
            { key: 'emergencyContactAddress', label: 'Address (optional)', type: 'textarea', placeholder: 'Emergency contact address if relevant' }
        ]
    },
    {
        title: 'How you found us',
        shortTitle: 'Referral',
        description: 'How you heard about the service.',
        fields: [
            { key: 'referralSource', label: 'How the patient heard about your service', placeholder: 'Self-referral, friend, website, clinic, etc.' },
            { key: 'referringProvider', label: 'Referring physician, therapist, or organization', placeholder: 'Name of provider or organization' },
            { key: 'referralReason', label: 'Reason for referral', type: 'textarea', placeholder: 'Reason the patient was referred' }
        ]
    },
    {
        title: 'What brings you in',
        shortTitle: 'Current concern',
        description: 'Your main concerns and what you want help with.',
        fields: [
            { key: 'presentingProblem', label: 'Main concerns or symptoms', type: 'textarea', required: true, placeholder: 'Describe the patient\'s main symptoms or concerns' },
            { key: 'symptomDuration', label: 'Duration of symptoms', placeholder: 'How long symptoms have been present' },
            { key: 'symptomSeverity', label: 'Severity of symptoms', placeholder: 'Mild, moderate, severe, fluctuating, etc.' },
            { key: 'seekingHelpReason', label: 'What prompted seeking help now', type: 'textarea', placeholder: 'What changed recently or triggered help-seeking' },
            { key: 'treatmentGoals', label: 'Patient goals for treatment', type: 'textarea', required: true, placeholder: 'What the patient hopes to improve or achieve' }
        ]
    },
    {
        title: 'Mental health history',
        shortTitle: 'Mental health',
        description: 'Past diagnoses, therapy, and safety history.',
        fields: [
            { key: 'previousPsychiatricDiagnoses', label: 'Previous psychiatric diagnoses', type: 'textarea', placeholder: 'Known diagnoses or prior evaluations' },
            { key: 'previousCounseling', label: 'Previous counseling or psychotherapy', type: 'textarea', placeholder: 'Previous therapy experience and duration' },
            { key: 'psychiatricHospitalizations', label: 'Psychiatric hospitalizations', type: 'textarea', placeholder: 'Any past psychiatric admissions' },
            { key: 'selfHarmHistory', label: 'History of self-harm', type: 'textarea', placeholder: 'Relevant self-harm history, if any' },
            { key: 'suicideAttempts', label: 'Suicide attempts', type: 'textarea', placeholder: 'Any suicide attempt history, if any' },
            { key: 'violenceHistory', label: 'History of violence or aggression', type: 'textarea', placeholder: 'Any relevant aggression or violence history' },
            { key: 'currentMentalHealthProviders', label: 'Current mental health providers', type: 'textarea', placeholder: 'Current therapist, psychiatrist, counselor, etc.' }
        ]
    },
    {
        title: 'Medical history',
        shortTitle: 'Medical',
        description: 'Medical details that may affect care.',
        fields: [
            { key: 'currentMedicalConditions', label: 'Current medical conditions', type: 'textarea', placeholder: 'Ongoing health conditions or diagnoses' },
            { key: 'previousIllnessesOrSurgeries', label: 'Previous major illnesses or surgeries', type: 'textarea', placeholder: 'Relevant past illnesses, admissions, or surgeries' },
            { key: 'neurologicalConditions', label: 'Neurological conditions', type: 'textarea', placeholder: 'Seizures, head injury, neurological disorders, etc.' },
            { key: 'currentMedications', label: 'Current medications', type: 'textarea', placeholder: 'List current medications and doses if known' },
            { key: 'allergies', label: 'Allergies', type: 'textarea', placeholder: 'Medication, food, or environmental allergies' },
            { key: 'primaryCarePhysicianDetails', label: 'Primary care physician details', type: 'textarea', placeholder: 'Primary doctor name and contact details' }
        ]
    },
    {
        title: 'Substance use',
        shortTitle: 'Substance use',
        description: 'Current or past use and any treatment history.',
        fields: [
            { key: 'alcoholUse', label: 'Alcohol use', type: 'textarea', placeholder: 'Frequency, amount, and any concerns' },
            { key: 'tobaccoUse', label: 'Tobacco/nicotine use', type: 'textarea', placeholder: 'Smoking, vaping, chewing tobacco, etc.' },
            { key: 'recreationalDrugUse', label: 'Recreational drug use', type: 'textarea', placeholder: 'Substances used and frequency' },
            { key: 'prescriptionMisuse', label: 'Prescription medication misuse', type: 'textarea', placeholder: 'Any misuse of prescribed medication' },
            { key: 'addictionTreatmentHistory', label: 'History of addiction treatment', type: 'textarea', placeholder: 'Past rehabilitation or recovery treatment' }
        ]
    },
    {
        title: 'Family history',
        shortTitle: 'Family history',
        description: 'Relevant family mental health and medical history.',
        fields: [
            { key: 'familyMentalHealthConditions', label: 'Family mental health conditions', type: 'textarea', placeholder: 'Known family psychiatric conditions' },
            { key: 'familySubstanceAbuse', label: 'Substance abuse in family', type: 'textarea', placeholder: 'Family substance use concerns' },
            { key: 'familySuicideHistory', label: 'Suicide history in family', type: 'textarea', placeholder: 'Any known suicide history in the family' },
            { key: 'familyMedicalConditions', label: 'Significant medical conditions in family', type: 'textarea', placeholder: 'Relevant chronic or inherited medical conditions' }
        ]
    },
    {
        title: 'Daily life',
        shortTitle: 'Daily life',
        description: 'Living situation, support, and day-to-day context.',
        fields: [
            { key: 'livingSituation', label: 'Living situation', type: 'textarea', placeholder: 'Who the patient lives with and current housing situation' },
            { key: 'familyStructure', label: 'Family structure', type: 'textarea', placeholder: 'Family composition and relationships' },
            { key: 'relationshipStatus', label: 'Relationship status', placeholder: 'Single, partnered, married, separated, etc.' },
            { key: 'employmentStatus', label: 'Employment status', placeholder: 'Employed, student, unemployed, retired, etc.' },
            { key: 'financialStressors', label: 'Financial stressors', type: 'textarea', placeholder: 'Financial concerns affecting wellbeing' },
            { key: 'socialSupportSystem', label: 'Social support system', type: 'textarea', placeholder: 'Supportive people or groups in the patient\'s life' },
            { key: 'religiousCulturalConsiderations', label: 'Religious/cultural considerations', type: 'textarea', placeholder: 'Any cultural or religious context relevant to care' }
        ]
    }
];

const initialFormState = intakeSections.flatMap((section) => section.fields).reduce((acc, field) => {
    acc[field.key] = '';
    return acc;
}, {});

const validateIntakeForm = (formData, accountEmail = '') => {
    const normalize = (value) => value.trim();
    const normalizedEmail = normalize(formData.emailAddress).toLowerCase();
    const normalizedAccountEmail = normalize(accountEmail).toLowerCase();

    if (!NAME_PATTERN.test(normalize(formData.fullLegalName))) {
        return 'Enter a valid full legal name';
    }

    if (formData.preferredName && !NAME_PATTERN.test(normalize(formData.preferredName))) {
        return 'Enter a valid preferred name';
    }

    if (!formData.dateOfBirth) {
        return 'Date of birth is required';
    }

    const dob = new Date(formData.dateOfBirth);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear() - (
        now.getMonth() < dob.getMonth() ||
        (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate()) ? 1 : 0
    );

    if (Number.isNaN(dob.getTime()) || formData.dateOfBirth > TODAY || age < 5 || age > 120) {
        return 'Enter a valid date of birth';
    }

    if (!PHONE_PATTERN.test(normalize(formData.phoneNumber))) {
        return 'Enter a valid phone number';
    }

    if (formData.emergencyContactPhone && !PHONE_PATTERN.test(normalize(formData.emergencyContactPhone))) {
        return 'Enter a valid emergency contact phone number';
    }

    if (formData.emergencyContactAltPhone && !PHONE_PATTERN.test(normalize(formData.emergencyContactAltPhone))) {
        return 'Enter a valid alternative contact phone number';
    }

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return 'Enter a valid email address';
    }

    if (normalizedAccountEmail && normalizedEmail !== normalizedAccountEmail) {
        return 'The intake email must match the email on your account';
    }

    if (formData.nationalId && !ID_PATTERN.test(normalize(formData.nationalId))) {
        return 'National ID must be 4-30 letters, numbers, slashes, or hyphens';
    }

    if (!NAME_PATTERN.test(normalize(formData.emergencyContactName))) {
        return 'Enter a valid emergency contact name';
    }

    if (formData.emergencyContactRelationship && !TEXT_ONLY_PATTERN.test(normalize(formData.emergencyContactRelationship))) {
        return 'Enter a valid emergency contact relationship';
    }

    if (!normalize(formData.presentingProblem) || normalize(formData.presentingProblem).length < 10) {
        return 'Main concerns or symptoms should be at least 10 characters';
    }

    if (!normalize(formData.treatmentGoals) || normalize(formData.treatmentGoals).length < 10) {
        return 'Treatment goals should be at least 10 characters';
    }

    return '';
};

const PatientIntake = () => {
    const navigate = useNavigate();
    const accountEmail = JSON.parse(localStorage.getItem('serene_user') || 'null')?.email || '';
    const [formData, setFormData] = useState(() => {
        return {
            ...initialFormState,
            emailAddress: accountEmail
        };
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [activeSection, setActiveSection] = useState(0);

    const totalRequired = useMemo(
        () => intakeSections.flatMap((section) => section.fields).filter((field) => field.required).length,
        []
    );
    const totalFields = useMemo(
        () => intakeSections.flatMap((section) => section.fields).length,
        []
    );
    const totalSections = intakeSections.length;
    const currentSection = intakeSections[activeSection];

    const completedRequired = useMemo(
        () =>
            intakeSections
                .flatMap((section) => section.fields)
                .filter((field) => field.required && formData[field.key]?.trim())
                .length,
        [formData]
    );

    const answeredFields = useMemo(
        () =>
            intakeSections
                .flatMap((section) => section.fields)
                .filter((field) => formData[field.key]?.trim())
                .length,
        [formData]
    );

    const allRequiredComplete = completedRequired === totalRequired;

    const getAnsweredCount = (section) =>
        section.fields.filter((field) => formData[field.key]?.trim()).length;

    const isSectionComplete = (section) => {
        const requiredFields = section.fields.filter((field) => field.required);

        if (requiredFields.length > 0) {
            return requiredFields.every((field) => formData[field.key]?.trim());
        }

        return getAnsweredCount(section) === section.fields.length && section.fields.length > 0;
    };

    const currentSectionAnswered = getAnsweredCount(currentSection);

    const nextMissingRequiredSectionIndex = intakeSections.findIndex(
        (section) =>
            section.fields.some((field) => field.required) &&
            !section.fields.filter((field) => field.required).every((field) => formData[field.key]?.trim())
    );

    useEffect(() => {
        const loadExistingIntake = async () => {
            try {
                const token = localStorage.getItem('serene_token');
                const response = await fetch('http://localhost:5000/api/auth/intake', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load intake form.');
                }

                if (data.intake) {
                    setFormData((current) => ({
                        ...current,
                        fullLegalName: data.intake.full_legal_name || '',
                        preferredName: data.intake.preferred_name || '',
                        dateOfBirth: data.intake.date_of_birth || '',
                        genderSex: data.intake.gender_sex || '',
                        nationalId: data.intake.national_id || '',
                        maritalStatus: data.intake.marital_status || '',
                        occupation: data.intake.occupation || '',
                        educationLevel: data.intake.education_level || '',
                        address: data.intake.address || '',
                        phoneNumber: data.intake.phone_number || '',
                        emailAddress: data.intake.email_address || current.emailAddress,
                        emergencyContactName: data.intake.emergency_contact_name || '',
                        emergencyContactRelationship: data.intake.emergency_contact_relationship || '',
                        emergencyContactPhone: data.intake.emergency_contact_phone || '',
                        emergencyContactAltPhone: data.intake.emergency_contact_alt_phone || '',
                        emergencyContactAddress: data.intake.emergency_contact_address || '',
                        referralSource: data.intake.referral_source || '',
                        referringProvider: data.intake.referring_provider || '',
                        referralReason: data.intake.referral_reason || '',
                        presentingProblem: data.intake.presenting_problem || '',
                        symptomDuration: data.intake.symptom_duration || '',
                        symptomSeverity: data.intake.symptom_severity || '',
                        seekingHelpReason: data.intake.seeking_help_reason || '',
                        treatmentGoals: data.intake.treatment_goals || '',
                        previousPsychiatricDiagnoses: data.intake.previous_psychiatric_diagnoses || '',
                        previousCounseling: data.intake.previous_counseling || '',
                        psychiatricHospitalizations: data.intake.psychiatric_hospitalizations || '',
                        selfHarmHistory: data.intake.self_harm_history || '',
                        suicideAttempts: data.intake.suicide_attempts || '',
                        violenceHistory: data.intake.violence_history || '',
                        currentMentalHealthProviders: data.intake.current_mental_health_providers || '',
                        currentMedicalConditions: data.intake.current_medical_conditions || '',
                        previousIllnessesOrSurgeries: data.intake.previous_illnesses_or_surgeries || '',
                        neurologicalConditions: data.intake.neurological_conditions || '',
                        currentMedications: data.intake.current_medications || '',
                        allergies: data.intake.allergies || '',
                        primaryCarePhysicianDetails: data.intake.primary_care_physician_details || '',
                        alcoholUse: data.intake.alcohol_use || '',
                        tobaccoUse: data.intake.tobacco_use || '',
                        recreationalDrugUse: data.intake.recreational_drug_use || '',
                        prescriptionMisuse: data.intake.prescription_misuse || '',
                        addictionTreatmentHistory: data.intake.addiction_treatment_history || '',
                        familyMentalHealthConditions: data.intake.family_mental_health_conditions || '',
                        familySubstanceAbuse: data.intake.family_substance_abuse || '',
                        familySuicideHistory: data.intake.family_suicide_history || '',
                        familyMedicalConditions: data.intake.family_medical_conditions || '',
                        livingSituation: data.intake.living_situation || '',
                        familyStructure: data.intake.family_structure || '',
                        relationshipStatus: data.intake.relationship_status || '',
                        employmentStatus: data.intake.employment_status || '',
                        financialStressors: data.intake.financial_stressors || '',
                        socialSupportSystem: data.intake.social_support_system || '',
                        religiousCulturalConsiderations: data.intake.religious_cultural_considerations || ''
                    }));
                }
            } catch (loadError) {
                setError(loadError.message);
            } finally {
                setLoading(false);
            }
        };

        loadExistingIntake();
    }, []);

    const handleChange = (key, value) => {
        setFormData((current) => ({ ...current, [key]: value }));
    };

    const goToNextSection = () => {
        if (activeSection < totalSections - 1) {
            setActiveSection((current) => current + 1);
        }
    };

    const goToPreviousSection = () => {
        if (activeSection > 0) {
            setActiveSection((current) => current - 1);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        const validationError = validateIntakeForm(formData, accountEmail);

        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);

        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch('http://localhost:5000/api/auth/intake', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
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
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
                        <ClipboardList className="text-[#1B98E0]" size={30} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-[#0D1B2A] mb-3">Quick intake</h1>
                    <p className="text-[#3D5A80] max-w-3xl mx-auto">
                        Fill the essentials first, then add any extra context that feels useful. Optional sections can be skipped, and your answers help give the doctor context before the assessment.
                    </p>
                </div>

                <div className="bg-white rounded-2xl p-5 md:p-6 border border-[#0E7C7B]/10 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-4">
                    <ShieldCheck className="text-emerald-500 shrink-0 mt-1" size={22} />
                    <div>
                        <p className="font-semibold text-[#0D1B2A]">Secure clinical intake</p>
                        <p className="text-sm text-[#3D5A80] mt-1">
                            Only {totalRequired} fields are required. Everything else is optional background you can fill in now or keep brief.
                        </p>
                    </div>
                    </div>
                    <div className="rounded-2xl bg-[#F8FBFB] border border-[#0E7C7B]/10 px-4 py-3 min-w-[220px]">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#3D5A80] mb-1">Progress</p>
                        <p className="text-sm text-[#0D1B2A] font-semibold">{completedRequired} of {totalRequired} required fields completed</p>
                        <p className="text-xs text-[#3D5A80] mt-1">{answeredFields} of {totalFields} fields answered</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 text-rose-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                        {intakeSections.map((section, index) => {
                            const complete = isSectionComplete(section);
                            const active = index === activeSection;

                            return (
                                <button
                                    key={section.title}
                                    type="button"
                                    onClick={() => setActiveSection(index)}
                                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${active
                                        ? 'border-[#1B98E0] bg-[#1B98E0]/10 shadow-sm'
                                        : 'border-[#0E7C7B]/10 bg-white hover:border-[#1B98E0]/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold text-[#0D1B2A]">{section.shortTitle}</span>
                                        {complete ? (
                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                        ) : (
                                            <span className="text-[11px] font-semibold text-[#3D5A80]">
                                                {getAnsweredCount(section)}/{section.fields.length}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-[#3D5A80] mt-1 line-clamp-2">{section.description}</p>
                                </button>
                            );
                        })}
                    </div>

                    <section className="bg-white rounded-3xl border border-[#0E7C7B]/10 shadow-sm p-5 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                            <div>
                                <h2 className="text-lg font-bold text-[#0D1B2A]">{currentSection.title}</h2>
                                <p className="text-sm text-[#3D5A80] mt-1">{currentSection.description}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <div className="rounded-xl bg-[#F8FBFB] border border-[#0E7C7B]/10 px-3 py-2 text-xs text-[#3D5A80]">
                                    {currentSectionAnswered} of {currentSection.fields.length} answered
                                </div>
                                <div className="rounded-xl bg-[#F8FBFB] border border-[#0E7C7B]/10 px-3 py-2 text-xs text-[#3D5A80]">
                                    {currentSection.fields.filter((field) => field.required).length > 0
                                        ? `${currentSection.fields.filter((field) => field.required).length} required here`
                                        : 'Optional section'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentSection.fields.map((field) => {
                                const isTextarea = field.type === 'textarea';
                                const isLockedEmailField = field.key === 'emailAddress' && Boolean(formData.emailAddress);
                                const commonClassName = `w-full rounded-2xl border border-[#0E7C7B]/15 bg-[#F8FBFB] px-4 py-3 outline-none focus:border-[#1B98E0] text-[#0D1B2A] ${isTextarea ? 'min-h-[110px] resize-y' : ''}`;
                                const wrapperClass = isTextarea ? 'md:col-span-2' : '';
                                const inputProps = field.key === 'fullLegalName' || field.key === 'preferredName' || field.key === 'emergencyContactName'
                                    ? { minLength: 2, maxLength: 80, pattern: NAME_PATTERN.source, title: 'Use letters, spaces, apostrophes, dots, or hyphens only.' }
                                    : field.key === 'phoneNumber' || field.key === 'emergencyContactPhone' || field.key === 'emergencyContactAltPhone'
                                        ? { minLength: 7, maxLength: 20, pattern: PHONE_PATTERN.source, title: 'Enter a valid phone number.' }
                                        : field.key === 'dateOfBirth'
                                            ? { min: MIN_DOB, max: TODAY }
                                            : field.key === 'nationalId'
                                                ? { minLength: 4, maxLength: 30, pattern: ID_PATTERN.source, title: 'Use 4-30 letters, numbers, slashes, or hyphens.' }
                                                : field.key === 'emailAddress'
                                                    ? { maxLength: 254 }
                                                    : field.key === 'emergencyContactRelationship'
                                                        ? { minLength: 2, maxLength: 80, pattern: TEXT_ONLY_PATTERN.source, title: 'Use letters and basic punctuation only.' }
                                                        : isTextarea
                                                            ? { maxLength: 500 }
                                                            : { maxLength: 80 };

                                return (
                                    <div key={field.key} className={wrapperClass}>
                                        <label className="flex items-center justify-between gap-3 text-sm font-semibold text-[#3D5A80] mb-1.5">
                                            <span>{field.label}</span>
                                            <span className={field.required ? 'text-[#1B98E0]' : 'text-[#3D5A80]/70'}>
                                                {field.required ? 'Required' : 'Optional'}
                                            </span>
                                        </label>
                                        {isLockedEmailField && (
                                            <p className="text-xs text-[#3D5A80] mb-1.5">
                                                This uses the email from your account and cannot be changed here.
                                            </p>
                                        )}
                                        {isTextarea ? (
                                            <textarea
                                                value={formData[field.key]}
                                                onChange={(event) => handleChange(field.key, event.target.value)}
                                                className={commonClassName}
                                                required={field.required}
                                                placeholder={field.placeholder}
                                                {...inputProps}
                                            />
                                        ) : (
                                            <input
                                                type={field.type || 'text'}
                                                value={formData[field.key]}
                                                onChange={(event) => handleChange(field.key, event.target.value)}
                                                className={commonClassName}
                                                required={field.required}
                                                placeholder={field.placeholder}
                                                readOnly={isLockedEmailField}
                                                disabled={isLockedEmailField}
                                                {...inputProps}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-3xl border border-[#0E7C7B]/10 shadow-sm p-5 md:p-6">
                        <p className="text-sm text-[#3D5A80]">
                            You can move between sections anytime. Once the required fields are done, you can continue straight to the assessment.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={goToPreviousSection}
                                disabled={activeSection === 0}
                                className="px-5 py-3 rounded-2xl border border-[#0E7C7B]/15 text-[#0D1B2A] font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <ArrowLeft size={18} /> Previous
                            </button>
                            {activeSection < totalSections - 1 && (
                                <button
                                    type="button"
                                    onClick={goToNextSection}
                                    className="px-5 py-3 rounded-2xl bg-[#0E7C7B] hover:bg-[#0A5E5D] text-white font-semibold flex items-center justify-center gap-2"
                                >
                                    {currentSection.fields.every((field) => !field.required) ? 'Skip for now' : 'Next section'} <ArrowRight size={18} />
                                </button>
                            )}
                            {allRequiredComplete ? (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-[#1B98E0] hover:bg-[#1689C9] disabled:opacity-60 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-[#1B98E0]/20 flex items-center justify-center gap-2"
                                >
                                    {saving ? 'Saving intake...' : 'Continue to assessment'}
                                    {!saving && <ArrowRight size={18} />}
                                </button>
                            ) : activeSection === totalSections - 1 && nextMissingRequiredSectionIndex >= 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setActiveSection(nextMissingRequiredSectionIndex)}
                                    className="bg-[#1B98E0] hover:bg-[#1689C9] text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-[#1B98E0]/20 flex items-center justify-center gap-2"
                                >
                                    Review required fields <ArrowRight size={18} />
                                </button>
                            ) : null}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PatientIntake;
