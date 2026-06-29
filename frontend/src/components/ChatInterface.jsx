import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, HeartPulse, Infinity, AlertTriangle, Mic, Volume2, VolumeX, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import SereneBlob from './SereneBlob';
import BookingModal from './BookingModal';

const API_BASE = 'http://localhost:5000';

const ChatInterface = () => {
    const { t, i18n } = useTranslation();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isCrisis, setIsCrisis] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [escalationStatus, setEscalationStatus] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    
    const [searchParams, setSearchParams] = useSearchParams();
    const sessionIdParam = searchParams.get('session');
    
    // Active session state
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [activeSessionTitle, setActiveSessionTitle] = useState('');

    const endOfMessagesRef = useRef(null);
    const recognitionRef = useRef(null);
    const isVoiceLockedRef = useRef(false); // Synchronous lock to prevent double firing

    // Fetch escalation status
    const fetchEscalationStatus = useCallback(async () => {
        const token = localStorage.getItem('serene_token');
        if (!token) return;
        
        try {
            const response = await fetch(`${API_BASE}/api/chat/escalation-status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setEscalationStatus(data);
                if (data.is_chat_locked) {
                    setShowBookingModal(true);
                }
            }
        } catch (error) {
            console.error('Failed to fetch escalation status:', error);
        }
    }, []);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            
            recognitionRef.current.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                setInput(transcript);
            };
            
            recognitionRef.current.onerror = (event) => {
                if (event.error !== 'no-speech' && event.error !== 'network') {
                    console.error("Speech recognition error:", event.error);
                }
                setIsRecording(false);
                isVoiceLockedRef.current = false;
            };
            
            recognitionRef.current.onend = () => {
                setIsRecording(false);
                isVoiceLockedRef.current = false;
            };
        }
    }, []);

    // Play TTS
    const speakText = useCallback((text) => {
        if (!voiceEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel(); // Stop current speaking
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = i18n.language; // Match TTS language to selected i18n
        utterance.rate = 0.95; // slightly slower for therapist feel
        utterance.pitch = 1.0;
        
        window.speechSynthesis.speak(utterance);
    }, [voiceEnabled, i18n.language]);

    const toggleVoice = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        if (isVoiceLockedRef.current) return;
        
        if (isRecording) {
            handleVoiceEnd();
        } else {
            handleVoiceStart();
        }
    };

    const handleVoiceStart = () => {
        if (recognitionRef.current) {
            try {
                isVoiceLockedRef.current = true;
                recognitionRef.current.lang = i18n.language; // set to current language
                recognitionRef.current.start();
                setIsRecording(true);
                setInput('');
            } catch (error) {
                isVoiceLockedRef.current = false;
                if (error.name !== 'InvalidStateError') {
                    console.error('Speech start error:', error);
                }
            }
        } else {
            alert("Your browser does not support Voice Recognition. Try Google Chrome.");
        }
    };

    const handleVoiceEnd = () => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }
    };

    // Load active session history when sessionIdParam changes
    useEffect(() => {
        const loadHistory = async () => {
            const token = localStorage.getItem('serene_token');
            if (!token) return;

            await fetchEscalationStatus();

            if (sessionIdParam) {
                const sessionId = parseInt(sessionIdParam, 10);
                try {
                    const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}/history`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const formatted = data.map(msg => ({
                            id: msg.id,
                            text: msg.content,
                            sender: msg.sender,
                            timestamp: msg.timestamp,
                            isCrisisNote: msg.risk_level === 'HIGH'
                        }));
                        setMessages(formatted.length > 0 ? formatted : [{ id: Date.now(), text: "Hello there. I'm SereneMind. How are you feeling today?", sender: 'ai', timestamp: new Date() }]);
                        setActiveSessionId(sessionId);
                        
                        // Fetch sessions list to find the title for the header
                        const listRes = await fetch(`${API_BASE}/api/chat/sessions`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (listRes.ok) {
                            const listData = await listRes.json();
                            const current = listData.find(s => s.id === sessionId);
                            if (current) {
                                setActiveSessionTitle(current.title);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to load session history', error);
                }
            } else {
                // Fallback to fetch history for latest active session
                try {
                    const response = await fetch(`${API_BASE}/api/chat/history`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        // data is { messages: [], sessionId: X, sessionTitle: Y }
                        if (data.messages && data.messages.length > 0) {
                            const formatted = data.messages.map(msg => ({
                                id: msg.id,
                                text: msg.content,
                                sender: msg.sender,
                                timestamp: msg.timestamp,
                                isCrisisNote: msg.risk_level === 'HIGH'
                            }));
                            setMessages(formatted);
                        } else {
                            setMessages([{ id: Date.now(), text: "Hello there. I'm SereneMind. How are you feeling today?", sender: 'ai', timestamp: new Date() }]);
                        }
                        setActiveSessionId(data.sessionId);
                        setActiveSessionTitle(data.sessionTitle);
                        setSearchParams({ session: data.sessionId });
                    }
                } catch (error) {
                    console.error('Failed to load fallback history', error);
                }
            }
        };

        loadHistory();
    }, [sessionIdParam, fetchEscalationStatus]);

    const scrollToBottom = () => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isCrisis || escalationStatus?.is_chat_locked) return;

        const userMsg = { id: Date.now(), text: input, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: input, history: messages, sessionId: activeSessionId })
            });
            const data = await response.json();
            
            setIsTyping(false);
            
            if (data.isCrisis) {
                setIsCrisis(true);
            }

            // Update escalation status
            if (data.escalationStatus) {
                setEscalationStatus(data.escalationStatus);
                if (data.escalationStatus.is_chat_locked) {
                    setShowBookingModal(true);
                }
            }

            const replyText = data.reply;
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: replyText,
                sender: 'ai',
                timestamp: new Date(),
                isCrisisNote: data.isCrisis
            }]);

            if (data.sessionId && data.sessionId !== activeSessionId) {
                setActiveSessionId(data.sessionId);
                setSearchParams({ session: data.sessionId });
                window.dispatchEvent(new Event('session-created'));
            }

            if (!data.isCrisis) {
                speakText(replyText);
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            setIsTyping(false);
        }
    };

    const handleBookingSuccess = () => {
        fetchEscalationStatus();
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-[#E8E8E8] relative overflow-hidden">
            <SereneBlob isCrisis={isCrisis} isTyping={isTyping} />
            {/* Header */}
            <header className="h-16 border-b border-[#0E7C7B]/20 flex items-center justify-between px-6 bg-transparent relative z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-1 -right-1 animate-pulse"></div>
                        <HeartPulse className="text-[#0E7C7B]" />
                    </div>
                    <div>
                        <h2 className="font-semibold tracking-wide flex items-center gap-2 text-[#0D1B2A]">
                            AI Therapist 
                            <span className="text-xs bg-[#C2FFF0]/50 text-[#0E7C7B] px-2 py-0.5 rounded-full border border-[#0E7C7B]/15 font-normal">{t('chat_private')}</span>
                        </h2>
                        {activeSessionTitle && (
                            <p className="text-[10px] text-[#3D5A80]/80 font-bold tracking-wide mt-0.5 uppercase">{activeSessionTitle}</p>
                        )}
                    </div>
                </div>
                {/* Voice Controls */}
                <button 
                    onClick={() => {
                        setVoiceEnabled(!voiceEnabled);
                        if(voiceEnabled) window.speechSynthesis?.cancel(); // Mute immediately
                    }}
                    className={`p-2 rounded-xl transition-all flex items-center gap-2 shadow-sm ${voiceEnabled ? 'bg-[#1B98E0]/10 text-[#1B98E0] hover:bg-[#1B98E0]/20 border border-[#1B98E0]/20' : 'bg-[#E8E8E8] text-[#3D5A80] hover:bg-[#C2FFF0]/30 border border-[#0E7C7B]/15'}`}
                    title={voiceEnabled ? "Mute AI Therapist" : "Unmute AI Therapist"}
                >
                    {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    <span className="text-xs font-bold hidden sm:inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
                </button>
            </header>

            {/* Chat Locked Banner */}
            <AnimatePresence>
                {escalationStatus?.is_chat_locked && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-100 border-b border-amber-300 p-4 shrink-0 flex items-center justify-between z-10"
                    >
                        <div className="flex items-start gap-4">
                            <Lock className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-amber-800 font-bold text-lg">Session Review Required</h3>
                                <p className="text-amber-700/80 text-sm mt-1 max-w-2xl">
                                    To ensure you receive the best care, we require a brief check-in with a licensed clinician.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowBookingModal(true)}
                            className="bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-amber-700 transition shadow-lg"
                        >
                            Book Now
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Crisis Overlay */}
            <AnimatePresence>
                {isCrisis && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-900/40 border-b border-red-500/50 p-4 shrink-0 flex items-center justify-between backdrop-blur-sm z-10"
                    >
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-red-100 font-bold text-lg">Crisis Support Required</h3>
                                <p className="text-red-200/80 text-sm mt-1 max-w-2xl">
                                    Our system has detected language indicating elevated risk. Please contact emergency services immediately.
                                    We are escalating this session to our human medical review team.
                                </p>
                                <div className="flex gap-4 mt-3">
                                    <a href="tel:988" className="bg-red-500 text-white font-semibold py-1.5 px-4 rounded-lg hover:bg-red-600 transition shadow-lg shadow-red-500/20 text-sm">Call 988 (Crisis Hotline)</a>
                                    <button onClick={() => setShowBookingModal(true)} className="bg-white/10 text-red-100 font-medium py-1.5 px-4 rounded-lg hover:bg-white/20 transition text-sm">Book Urgent Session</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto w-full mx-auto px-4 lg:px-24 py-6 scroll-smooth relative z-10">
                <div className="space-y-6 max-w-4xl mx-auto">
                    {messages.map((msg) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id} 
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm text-[15px] ${
                                msg.sender === 'user' 
                                    ? 'bg-[#1B98E0] text-white rounded-tr-sm shadow-md shadow-[#1B98E0]/20' 
                                    : 'bg-white/80 border border-[#0E7C7B]/15 rounded-tl-sm text-[#0D1B2A]'
                            } ${msg.isCrisisNote ? 'border-red-500/50 bg-red-900/20' : ''}`}>
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                <span className={`text-[10px] mt-2 block ${msg.sender === 'user' ? 'text-white/70 font-medium' : 'text-[#3D5A80]'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white/80 border border-[#0E7C7B]/15 rounded-2xl rounded-tl-sm px-5 py-4 flex gap-1.5 items-center">
                                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0 }} className="w-1.5 h-1.5 bg-[#0E7C7B] rounded-full"></motion.span>
                                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#0E7C7B] rounded-full"></motion.span>
                                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#0E7C7B] rounded-full"></motion.span>
                            </div>
                        </div>
                    )}
                    <div ref={endOfMessagesRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="bg-transparent border-t border-[#0E7C7B]/20 p-6 pt-5 relative z-10">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3 relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isCrisis || escalationStatus?.is_chat_locked}
                        placeholder={
                            isCrisis 
                                ? "Chat disabled during emergency protocol." 
                                : escalationStatus?.is_chat_locked 
                                    ? "Chat locked - please book a session first." 
                                    : (isRecording ? "Listening..." : t('chat_placeholder'))
                        }
                        className={`flex-1 bg-white/80 text-[#0D1B2A] placeholder-[#3D5A80]/60 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#1B98E0] border transition disabled:opacity-50 disabled:cursor-not-allowed text-[15px] ${isRecording ? 'border-[#1B98E0] ring-2 ring-[#1B98E0]/20 bg-[#C2FFF0]/20' : 'border-[#0E7C7B]/15'}`}
                        autoFocus
                    />
                    <button 
                        type="button"
                        onClick={toggleVoice}
                        disabled={isCrisis || escalationStatus?.is_chat_locked}
                        className={`w-14 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-red-500/40' : 'bg-[#C2FFF0]/60 hover:bg-[#C2FFF0] text-[#0E7C7B] shadow-[#0E7C7B]/10'}`}
                        title={isRecording ? "Click to stop recording" : "Click to start recording"}
                    >
                        <Mic size={20} className={isRecording ? "scale-110" : ""} />
                    </button>
                    <button 
                        type="submit" 
                        disabled={!input.trim() || isCrisis || escalationStatus?.is_chat_locked}
                        className="bg-[#1B98E0] hover:bg-[#1689C9] text-white w-14 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#1B98E0]/20"
                    >
                        <Send size={20} className={input.trim() ? "translate-x-0.5" : ""} />
                    </button>
                    {!isCrisis && !escalationStatus?.is_chat_locked && (
                         <div className="absolute -top-6 text-[11px] text-[#3D5A80] flex items-center gap-1.5 left-2">
                             <Infinity size={12}/> AI generations can be inaccurate. Never rely on this for an emergency.
                         </div>
                    )}
                </form>
            </div>

            {/* Booking Modal */}
            <BookingModal 
                isOpen={showBookingModal} 
                onClose={() => {
                    if (!escalationStatus?.is_chat_locked) {
                        setShowBookingModal(false);
                    }
                }}
                onBooked={handleBookingSuccess}
            />
        </div>
    );
};

export default ChatInterface;