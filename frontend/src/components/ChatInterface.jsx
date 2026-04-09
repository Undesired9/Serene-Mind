import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, HeartPulse, Infinity, AlertTriangle, Mic, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import SereneBlob from './SereneBlob';

const ChatInterface = () => {
    const { t, i18n } = useTranslation();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isCrisis, setIsCrisis] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const endOfMessagesRef = useRef(null);
    const recognitionRef = useRef(null);
    const isVoiceLockedRef = useRef(false); // Synchronous lock to prevent double firing

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
                // Ignore no-speech and network errors which are common harmless aborts in Chrome Web Speech API
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
                // Ignore InvalidStateError if it's already started
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

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('serene_token');
                const response = await fetch('http://localhost:5000/api/chat/history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        const formatted = data.map(msg => ({
                            id: msg.id,
                            text: msg.content,
                            sender: msg.sender,
                            timestamp: msg.timestamp,
                            isCrisisNote: msg.risk_level === 'HIGH'
                        }));
                        setMessages(formatted);
                    } else {
                        setMessages([{ id: Date.now(), text: "Hello there. I'm SereneMind. I'm here to listen without judgment. How are you feeling today?", sender: 'ai', timestamp: new Date() }]);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch history', error);
            }
        };
        fetchHistory();
    }, []);

    const scrollToBottom = () => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isCrisis) return;

        const userMsg = { id: Date.now(), text: input, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: input, history: messages })
            });
            const data = await response.json();
            
            setIsTyping(false);
            
            if (data.isCrisis) {
                setIsCrisis(true);
            }

            const replyText = data.reply;
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: replyText,
                sender: 'ai',
                timestamp: new Date(),
                isCrisisNote: data.isCrisis
            }]);

            if (!data.isCrisis) {
                speakText(replyText);
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            setIsTyping(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-serene-dark relative overflow-hidden">
            <SereneBlob isCrisis={isCrisis} isTyping={isTyping} />
            {/* Header */}
            <header className="h-16 border-b border-slate-400/50 flex items-center justify-between px-6 bg-transparent relative z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-1 -right-1 animate-pulse"></div>
                        <HeartPulse className="text-slate-600" />
                    </div>
                    <div>
                        <h2 className="font-semibold tracking-wide flex items-center gap-2 text-slate-800">
                            AI Therapist 
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full border border-slate-400 font-normal">{t('chat_private')}</span>
                        </h2>
                    </div>
                </div>
                {/* Voice Controls */}
                <button 
                    onClick={() => {
                        setVoiceEnabled(!voiceEnabled);
                        if(voiceEnabled) window.speechSynthesis?.cancel(); // Mute immediately
                    }}
                    className={`p-2 rounded-xl transition-all flex items-center gap-2 shadow-sm ${voiceEnabled ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300 border border-slate-300'}`}
                    title={voiceEnabled ? "Mute AI Therapist" : "Unmute AI Therapist"}
                >
                    {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    <span className="text-xs font-bold hidden sm:inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
                </button>
            </header>

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
                                    <button className="bg-red-500 text-white font-semibold py-1.5 px-4 rounded-lg hover:bg-red-600 transition shadow-lg shadow-red-500/20 text-sm">Call 988 (Crisis Hotline)</button>
                                    <button className="bg-white/10 text-red-100 font-medium py-1.5 px-4 rounded-lg hover:bg-white/20 transition text-sm">Contact My Therapist</button>
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
                                    ? 'bg-slate-300 text-slate-900 rounded-tr-sm shadow-md shadow-slate-300/20' 
                                    : 'bg-serene-card border border-slate-400 rounded-tl-sm text-slate-800'
                            } ${msg.isCrisisNote ? 'border-red-500/50 bg-red-900/20' : ''}`}>
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                <span className={`text-[10px] mt-2 block ${msg.sender === 'user' ? 'text-slate-700/80 font-medium' : 'text-slate-500'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-serene-card border border-slate-400 rounded-2xl rounded-tl-sm px-5 py-4 flex gap-1.5 items-center">
                                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0 }} className="w-1.5 h-1.5 bg-slate-500 rounded-full"></motion.span>
                                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-500 rounded-full"></motion.span>
                                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-500 rounded-full"></motion.span>
                            </div>
                        </div>
                    )}
                    <div ref={endOfMessagesRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="bg-transparent border-t border-slate-400/50 p-6 pt-5 relative z-10">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3 relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isCrisis}
                        placeholder={isCrisis ? "Chat disabled during emergency protocol." : (isRecording ? "Listening..." : t('chat_placeholder'))}
                        className={`flex-1 bg-slate-200 text-slate-800 placeholder-slate-500 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-slate-400 border transition disabled:opacity-50 disabled:cursor-not-allowed text-[15px] ${isRecording ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50/50' : 'border-slate-300'}`}
                        autoFocus
                    />
                    <button 
                        type="button"
                        onClick={toggleVoice}
                        disabled={isCrisis}
                        className={`w-14 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-red-500/40' : 'bg-slate-300 hover:bg-slate-400 text-slate-600 shadow-slate-400/20'}`}
                        title={isRecording ? "Click to stop recording" : "Click to start recording"}
                    >
                        <Mic size={20} className={isRecording ? "scale-110" : ""} />
                    </button>
                    <button 
                        type="submit" 
                        disabled={!input.trim() || isCrisis}
                        className="bg-slate-500 hover:bg-slate-600 text-white w-14 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-slate-500/20"
                    >
                        <Send size={20} className={input.trim() ? "translate-x-0.5" : ""} />
                    </button>
                    {!isCrisis && (
                         <div className="absolute -top-6 text-[11px] text-slate-600 flex items-center gap-1.5 left-2">
                             <Infinity size={12}/> AI generations can be inaccurate. Never rely on this for an emergency.
                         </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
