import React, { useState } from 'react';
import { Smile, Meh, Frown, CheckCircle } from 'lucide-react';

const DailyCheckIn = ({ onMoodLogged }) => {
    const [mood, setMood] = useState(null); // 1-10 string mapped roughly from emoticons
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mood) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch('http://localhost:5000/api/dashboard/mood', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ mood_score: parseInt(mood), notes: notes.trim() })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to log mood.');
            }

            setSuccess(true);
            setTimeout(() => {
                if (onMoodLogged) onMoodLogged(); // Trigger dashboard refetch
                setSuccess(false);
                setMood(null);
                setNotes('');
            }, 3000);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 rounded-3xl p-6 w-full max-w-6xl mx-auto mb-10 flex flex-col items-center justify-center h-48 text-emerald-600 transition-all">
                <CheckCircle size={40} className="mb-3 animate-bounce" />
                <h3 className="font-bold text-lg text-[#0D1B2A]">Mood Logged!</h3>
                <p className="text-sm text-[#3D5A80]">Your insights help us personalize your therapy.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 rounded-3xl p-6 w-full max-w-6xl mx-auto mb-10 transition-all shadow-sm max-w-xl mx-auto lg:max-w-6xl">
            <h2 className="text-xl font-bold text-[#0D1B2A] mb-4 px-2">Daily Check-In: How are you feeling today?</h2>
            
            {error && <div className="text-red-500 text-sm mb-4 px-2">{error}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-2">
                <div className="flex justify-between md:justify-start gap-4">
                    {/* Map icons to approximate 1-10 scores */}
                    <button type="button" onClick={() => setMood('2')} className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border ${mood === '2' ? 'bg-red-100 border-red-300 text-red-600 shadow-md scale-105' : 'bg-white/60 border-[#0E7C7B]/10 text-[#3D5A80] hover:bg-[#C2FFF0]/30 hover:scale-105'}`}>
                        <Frown size={32} />
                        <span className="text-xs font-semibold">Struggling</span>
                    </button>
                    <button type="button" onClick={() => setMood('5')} className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border ${mood === '5' ? 'bg-amber-100 border-amber-300 text-amber-600 shadow-md scale-105' : 'bg-white/60 border-[#0E7C7B]/10 text-[#3D5A80] hover:bg-[#C2FFF0]/30 hover:scale-105'}`}>
                        <Meh size={32} />
                        <span className="text-xs font-semibold">Okay</span>
                    </button>
                    <button type="button" onClick={() => setMood('9')} className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border ${mood === '9' ? 'bg-emerald-100 border-emerald-300 text-emerald-600 shadow-md scale-105' : 'bg-white/60 border-[#0E7C7B]/10 text-[#3D5A80] hover:bg-[#C2FFF0]/30 hover:scale-105'}`}>
                        <Smile size={32} />
                        <span className="text-xs font-semibold">Great</span>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    <input 
                        type="text" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        placeholder="Any brief thoughts or events causing this? (Optional)" 
                        className="flex-1 bg-white/80 border border-[#0E7C7B]/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B98E0] text-[#0D1B2A]"
                    />
                    <button 
                        type="submit" 
                        disabled={!mood || isSubmitting}
                        className="px-6 py-3 font-semibold rounded-xl bg-[#0E7C7B] hover:bg-[#0A5E5D] text-white disabled:opacity-50 transition-all shadow shadow-[#0E7C7B]/30"
                    >
                        {isSubmitting ? 'Logging...' : 'Save Mood'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DailyCheckIn;
