import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Heart, ArrowRight, ArrowLeft } from 'lucide-react';
import { API_BASE } from '../apiConfig';

const questionsData = [
    // Depression
    { id: "D1", category: "depression", text: "Little interest or pleasure in doing things" },
    { id: "D2", category: "depression", text: "Feeling down, depressed, or hopeless" },
    { id: "D3", category: "depression", text: "Trouble sleeping, sleeping too much, or poor sleep quality" },
    { id: "D4", category: "depression", text: "Feeling tired or having little energy" },
    { id: "D5", category: "depression", text: "Poor appetite or overeating" },
    { id: "D6", category: "depression", text: "Feeling bad about yourself, like you are a failure or have let yourself or others down" },
    { id: "D7", category: "depression", text: "Thoughts that you would be better off dead or of hurting yourself" },
    
    // Anxiety
    { id: "A1", category: "anxiety", text: "Feeling nervous, anxious, or on edge" },
    { id: "A2", category: "anxiety", text: "Not being able to stop or control worrying" },
    { id: "A3", category: "anxiety", text: "Worrying too much about different things" },
    { id: "A4", category: "anxiety", text: "Trouble relaxing" },
    { id: "A5", category: "anxiety", text: "Feeling restless or unable to sit still" },
    { id: "A6", category: "anxiety", text: "Becoming easily annoyed or irritable" },
    { id: "A7", category: "anxiety", text: "Feeling afraid as if something bad might happen" },
    
    // Stress
    { id: "S1", category: "stress", text: "Feeling under constant strain or pressure" },
    { id: "S2", category: "stress", text: "Finding it hard to concentrate on what you are doing" },
    { id: "S3", category: "stress", text: "Feeling unable to cope with daily problems" },
    { id: "S4", category: "stress", text: "Feeling unhappy or losing confidence in yourself" },
    { id: "S5", category: "stress", text: "Not enjoying normal day-to-day activities" },
    { id: "S6", category: "stress", text: "Feeling overwhelmed by responsibilities" },
    { id: "S7", category: "stress", text: "Feeling that your general mental well-being is worse than usual" }
];

const getSeverity = (score) => {
    if (score <= 4) return "Minimal";
    if (score <= 9) return "Mild";
    if (score <= 14) return "Moderate";
    return "Severe";
};

const Assessment = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(-1); // -1 = Intro, 0-20 = Questions, 21 = Submitting, 22 = Results
    const [answers, setAnswers] = useState(Array(questionsData.length).fill(null));
    const [error, setError] = useState('');
    const [results, setResults] = useState(null);

    const handleSelect = (idx, value) => {
        const newAnswers = [...answers];
        newAnswers[idx] = value;
        setAnswers(newAnswers);
        
        // Auto-advance
        setTimeout(() => {
             if (idx === questionsData.length - 1) {
                 calculateResultsAndSubmit(newAnswers);
             } else {
                 setStep(prev => prev + 1);
             }
        }, 300);
    };

    const calculateResultsAndSubmit = async (finalAnswers) => {
        setStep(21); // submitting state
        
        let depressionScore = 0;
        let anxietyScore = 0;
        let stressScore = 0;
        let d7Score = 0;

        finalAnswers.forEach((val, idx) => {
            const q = questionsData[idx];
            if (q.category === 'depression') depressionScore += val;
            if (q.category === 'anxiety') anxietyScore += val;
            if (q.category === 'stress') stressScore += val;
            if (q.id === 'D7') d7Score = val;
        });

        const totalScore = depressionScore + anxietyScore + stressScore;

        const issues = {
            depression: depressionScore >= 10,
            anxiety: anxietyScore >= 10,
            stress: stressScore >= 10,
        };

        const maxScore = Math.max(depressionScore, anxietyScore, stressScore);
        const mainConcerns = [];
        if (depressionScore === maxScore) mainConcerns.push("Depression");
        if (anxietyScore === maxScore) mainConcerns.push("Anxiety");
        if (stressScore === maxScore) mainConcerns.push("Stress");

        const computedResults = {
            depressionScore,
            depressionSeverity: getSeverity(depressionScore),
            anxietyScore,
            anxietySeverity: getSeverity(anxietyScore),
            stressScore,
            stressSeverity: getSeverity(stressScore),
            totalScore,
            mainConcerns: mainConcerns.join(', '),
            issues,
            selfHarmRisk: d7Score > 0
        };

        try {
            setError('');
            const token = localStorage.getItem('serene_token');
            const response = await fetch(`${API_BASE}/api/auth/assessment`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ 
                    answers: finalAnswers,
                    ...computedResults
                })
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
                    data = { error: text || `Server error (${response.status})` };
                }
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit assessment.');
            }

            // Update user in localStorage to bypass protector
            const userStr = localStorage.getItem('serene_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.needsAssessment = false;
                localStorage.setItem('serene_user', JSON.stringify(user));
            }
            
            setResults(computedResults);
            setStep(22); // results state

        } catch (err) {
            setError(err.message);
            setStep(20); // let them try submitting again from the last question
        }
    };

    const handleContinue = () => {
        navigate('/dashboard', { replace: true });
    };

    // Render Intro
    if (step === -1) {
        return (
            <div className="min-h-screen bg-[#E8E8E8] flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#C2FFF0]/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
                <div className="max-w-2xl w-full relative z-10 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6">
                        <Heart className="text-[#1B98E0]" size={32} />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-[#0D1B2A] mb-4">Welcome to SereneMind</h1>
                    <p className="text-lg text-[#3D5A80] mb-8 leading-relaxed px-4">
                        To customize your AI therapy experience and provide accurate support, we need to complete a brief foundational assessment. This screens for depression, anxiety, and stress levels.
                    </p>
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl mb-6 text-left">
                        <p className="text-amber-800 text-sm font-medium">
                            This questionnaire is for screening purposes only and is not a medical diagnosis.
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#0E7C7B]/10 mb-10 text-left flex items-start gap-4">
                        <ShieldCheck className="text-emerald-500 shrink-0 mt-1" size={24} />
                        <div>
                            <h3 className="font-bold text-[#0D1B2A]">100% Private & Secure</h3>
                            <p className="text-sm text-[#3D5A80] mt-1">Your responses are encrypted, bound strictly to your session, and used solely to calibrate the AI's empathetic baseline. They are never shared.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setStep(0)}
                        className="bg-[#1B98E0] hover:bg-[#1689C9] text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg hover:shadow-[#1B98E0]/30 text-lg flex items-center gap-3 mx-auto"
                    >
                        Begin Assessment <ArrowRight />
                    </button>
                </div>
            </div>
        );
    }

    if (step === 21) {
        return (
            <div className="min-h-screen bg-[#E8E8E8] flex items-center justify-center p-6">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-[#1B98E0] border-t-transparent flex rounded-full animate-spin mb-4"></div>
                    <h3 className="text-lg font-bold text-[#0D1B2A]">Calibrating your therapy engine...</h3>
                    {error && <p className="text-red-500 mt-2">{error}</p>}
                </div>
            </div>
        );
    }

    if (step === 22 && results) {
        return (
            <div className="min-h-screen bg-[#E8E8E8] p-6 md:p-10 flex items-center justify-center">
                <div className="max-w-3xl w-full bg-white rounded-3xl p-8 shadow-xl border border-[#0E7C7B]/10">
                    <h2 className="text-3xl font-bold text-[#0D1B2A] mb-6">Screening Results</h2>
                    
                    <div className="bg-[#1B98E0]/10 p-4 rounded-xl mb-6">
                        <p className="text-[#0D1B2A] font-medium text-lg">Total Score: {results.totalScore} / 63</p>
                        <p className="text-[#0D1B2A] font-medium text-lg">Main Concern: <span className="font-bold text-[#0E7C7B]">{results.mainConcerns}</span></p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-[#E8E8E8]/50 p-4 rounded-xl border border-[#0E7C7B]/20">
                            <h3 className="font-bold text-[#0D1B2A] mb-2">Depression</h3>
                            <p className="text-xl font-bold text-[#1B98E0]">{results.depressionScore}</p>
                            <p className="text-sm text-[#3D5A80]">Severity: {results.depressionSeverity}</p>
                            {results.issues.depression && <p className="text-xs font-bold text-amber-600 mt-2">Score ≥ 10</p>}
                        </div>
                        <div className="bg-[#E8E8E8]/50 p-4 rounded-xl border border-[#0E7C7B]/20">
                            <h3 className="font-bold text-[#0D1B2A] mb-2">Anxiety</h3>
                            <p className="text-xl font-bold text-[#1B98E0]">{results.anxietyScore}</p>
                            <p className="text-sm text-[#3D5A80]">Severity: {results.anxietySeverity}</p>
                            {results.issues.anxiety && <p className="text-xs font-bold text-amber-600 mt-2">Score ≥ 10</p>}
                        </div>
                        <div className="bg-[#E8E8E8]/50 p-4 rounded-xl border border-[#0E7C7B]/20">
                            <h3 className="font-bold text-[#0D1B2A] mb-2">Stress</h3>
                            <p className="text-xl font-bold text-[#1B98E0]">{results.stressScore}</p>
                            <p className="text-sm text-[#3D5A80]">Severity: {results.stressSeverity}</p>
                            {results.issues.stress && <p className="text-xs font-bold text-amber-600 mt-2">Score ≥ 10</p>}
                        </div>
                    </div>

                    {results.selfHarmRisk && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl mb-6">
                            <h3 className="text-red-700 font-bold text-lg mb-2 flex items-center gap-2">
                                ⚠️ Critical Warning
                            </h3>
                            <p className="text-red-700 mb-2 font-medium">
                                Your response suggests possible self-harm thoughts. Please seek immediate support from a trusted person, emergency services, or a mental health professional.
                            </p>
                            <p className="text-red-600 text-sm">
                                If you are in the U.S., call or text 988 for crisis support. If you are outside the U.S., contact your local emergency number or crisis helpline.
                            </p>
                        </div>
                    )}

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleContinue}
                            className="px-8 py-4 bg-[#1B98E0] text-white rounded-xl font-bold hover:bg-[#1689C9] transition-colors flex items-center gap-2 shadow-md"
                        >
                            Continue to Dashboard <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render Questions (0-20)
    const currentQuestion = questionsData[step]?.text;
    const options = ['0 = Not at all', '1 = Several days', '2 = More than half the days', '3 = Nearly every day'];

    return (
        <div className="min-h-screen bg-[#E8E8E8] flex items-center justify-center p-6 relative">
            <div className="max-w-2xl w-full relative z-10">
                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-xs font-bold text-[#3D5A80] mb-2 uppercase tracking-wider">
                        <span>Question {step + 1} of {questionsData.length}</span>
                        <span>{Math.round((step / questionsData.length) * 100)}% Completed</span>
                    </div>
                    <div className="h-2 w-full bg-[#C2FFF0]/50 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-[#1B98E0]"
                            initial={{ width: `${(step / questionsData.length) * 100}%` }}
                            animate={{ width: `${((step + 1) / questionsData.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                {step > 0 && (
                    <button 
                        onClick={() => setStep(step - 1)}
                        className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#3D5A80] hover:text-[#0D1B2A] transition"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                )}

                {error && (
                    <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700 flex items-center justify-between shadow-sm">
                        <span className="text-sm font-medium">{error}</span>
                        <button
                            type="button"
                            onClick={() => calculateResultsAndSubmit(answers)}
                            className="text-xs bg-rose-600 text-white font-bold px-3.5 py-1.5 rounded-xl hover:bg-rose-700 transition shrink-0 ml-3"
                        >
                            Retry
                        </button>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-3xl shadow-xl border border-[#0E7C7B]/10 p-8 md:p-12"
                    >
                        <h4 className="text-sm font-bold text-[#1B98E0] mb-2">Over the last 2 weeks, how often have you experienced the following?</h4>
                        <h2 className="text-2xl md:text-3xl font-bold text-[#0D1B2A] mb-8 leading-tight">
                            {currentQuestion}
                        </h2>

                        <div className="space-y-3">
                            {options.map((opt, idx) => {
                                const isSelected = answers[step] === idx;
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => handleSelect(step, idx)}
                                        className={`w-full text-left p-5 rounded-2xl transition-all border-2 flex items-center justify-between ${
                                            isSelected 
                                                ? 'border-[#1B98E0] bg-[#1B98E0]/5 text-[#0D1B2A] shadow-md scale-[1.02]' 
                                                : 'border-[#0E7C7B]/10 hover:border-[#1B98E0]/40 hover:bg-[#C2FFF0]/15 text-[#0D1B2A]'
                                        }`}
                                    >
                                        <span className="font-medium text-lg">{opt}</span>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#1B98E0]' : 'border-[#0E7C7B]/30'}`}>
                                            {isSelected && <div className="w-2.5 h-2.5 bg-[#1B98E0] rounded-full" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Assessment;
