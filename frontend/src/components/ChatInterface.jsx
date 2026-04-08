import React, { useState, useRef, useEffect } from 'react';
import { Send, HeartPulse, Infinity, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SereneBlob from './SereneBlob';

const ChatInterface = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isCrisis, setIsCrisis] = useState(false);
    const endOfMessagesRef = useRef(null);

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

            setMessages(prev => [...prev, {
                id: Date.now(),
                text: data.reply,
                sender: 'ai',
                timestamp: new Date(),
                isCrisisNote: data.isCrisis
            }]);
            
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
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full border border-slate-400 font-normal">Private & Secure</span>
                        </h2>
                    </div>
                </div>
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
                        placeholder={isCrisis ? "Chat disabled during emergency protocol." : "Type your message..."}
                        className="flex-1 bg-slate-200 text-slate-800 placeholder-slate-500 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-slate-400 border border-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed text-[15px]"
                        autoFocus
                    />
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
