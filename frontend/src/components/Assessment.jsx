import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Heart, ArrowRight, ArrowLeft } from 'lucide-react';

const phq9Questions = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
    "Trouble concentrating on things, such as reading the newspaper or watching television",
    "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving a lot more than usual",
    "Thoughts that you would be better off dead, or of hurting yourself in some way",
];

const functionalQuestion = "How difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?";

const Assessment = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(-1); // -1 = Intro, 0-8 = PHQ-9, 9 = Functional, 10 = Submitting
    const [answers, setAnswers] = useState(Array(10).fill(null));
    const [error, setError] = useState('');

    const handleSelect = (idx, value) => {
        const newAnswers = [...answers];
        newAnswers[idx] = value;
        setAnswers(newAnswers);
        
        // Auto-advance
        setTimeout(() => {
             // If we answered the last PHQ question, check if score > 0 to show question 10
             if (idx === 8) {
                 const sum = newAnswers.slice(0, 9).reduce((a,b) => a + (b || 0), 0);
                 if (sum === 0) {
                     // They scored zero, functionally question 10 is implicitly 0
                     newAnswers[9] = 0;
                     setAnswers(newAnswers);
                     submitAssessment(newAnswers);
                     return;
                 }
             }
             if (idx === 9) {
                 submitAssessment(newAnswers);
                 return;
             }
             setStep(prev => prev + 1);
        }, 300);
    };

    const submitAssessment = async (finalAnswers) => {
        setStep(10);
        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch('http://localhost:5000/api/auth/assessment', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ answers: finalAnswers })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to submit assessment.');
            }

            // Update user in localStorage to bypass protector
            const userStr = localStorage.getItem('serene_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.needsAssessment = false;
                localStorage.setItem('serene_user', JSON.stringify(user));
            }
            
            // Wait slightly for UX
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 1000);

        } catch (err) {
            setError(err.message);
            setStep(9); // let them try submitting again
        }
    };

    // Render Intro
    if (step === -1) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
                <div className="max-w-2xl w-full relative z-10 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6">
                        <Heart className="text-blue-500" size={32} />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-slate-800 mb-4">Welcome to SereneMind</h1>
                    <p className="text-lg text-slate-600 mb-8 leading-relaxed px-4">
                        To customize your AI therapy experience and provide accurate support, we need to complete a brief foundational assessment (The PHQ-9 Clinical Screener). This typically takes less than 2 minutes.
                    </p>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-10 text-left flex items-start gap-4">
                        <ShieldCheck className="text-emerald-500 shrink-0 mt-1" size={24} />
                        <div>
                            <h3 className="font-bold text-slate-800">100% Private & Secure</h3>
                            <p className="text-sm text-slate-500 mt-1">Your responses are encrypted, bound strictly to your session, and used solely to calibrate the AI's empathetic baseline. They are never shared.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setStep(0)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg hover:shadow-blue-600/30 text-lg flex items-center gap-3 mx-auto"
                    >
                        Begin Assessment <ArrowRight />
                    </button>
                </div>
            </div>
        );
    }

    if (step === 10) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent flex rounded-full animate-spin mb-4"></div>
                    <h3 className="text-lg font-bold text-slate-800">Calibrating your therapy engine...</h3>
                    {error && <p className="text-red-500 mt-2">{error}</p>}
                </div>
            </div>
        );
    }

    // Render Questions (0-9)
    const isFunctional = step === 9;
    const currentQuestion = isFunctional ? functionalQuestion : phq9Questions[step];
    const options = isFunctional 
        ? ['Not difficult at all', 'Somewhat difficult', 'Very difficult', 'Extremely difficult']
        : ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
            <div className="max-w-2xl w-full relative z-10">
                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                        <span>Question {step + 1} of 10</span>
                        <span>{Math.round((step / 10) * 100)}% Completed</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-blue-500"
                            initial={{ width: `${(step / 10) * 100}%` }}
                            animate={{ width: `${((step + 1) / 10) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                {step > 0 && (
                    <button 
                        onClick={() => setStep(step - 1)}
                        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 md:p-12"
                    >
                        {!isFunctional && (
                            <h4 className="text-sm font-bold text-blue-500 mb-2">Over the last 2 weeks:</h4>
                        )}
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8 leading-tight">
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
                                                ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-md scale-[1.02]' 
                                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <span className="font-medium text-lg">{opt}</span>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-blue-500' : 'border-slate-300'}`}>
                                            {isSelected && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
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
