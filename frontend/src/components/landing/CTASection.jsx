import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ── Animated gem (pure CSS) ─────────────────────────────────── */
const AnimatedGem = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    {/* Glow */}
    <div className="absolute w-56 h-56 rounded-full bg-blue-500 blur-[80px] opacity-20" />
    <div className="absolute w-40 h-40 rounded-full bg-purple-500 blur-[60px] opacity-15" />

    {/* Main gem shape using clip-path */}
    <motion.div
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      className="relative"
    >
      <svg width="220" height="220" viewBox="0 0 220 220">
        <defs>
          <linearGradient id="gemGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="gemGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {/* Outer gem */}
        <polygon points="110,10 200,70 200,150 110,210 20,150 20,70" fill="url(#gemGrad1)" />
        {/* Inner facet */}
        <polygon points="110,40 175,80 175,140 110,180 45,140 45,80" fill="url(#gemGrad2)" />
        {/* Center highlight */}
        <polygon points="110,70 150,95 150,125 110,150 70,125 70,95" fill="rgba(255,255,255,0.2)" />
        {/* Top highlight */}
        <polygon points="110,40 145,65 110,75 75,65" fill="rgba(255,255,255,0.3)" />
      </svg>
    </motion.div>

    {/* Counter-rotating inner */}
    <motion.div
      className="absolute"
      animate={{ rotate: [0, -360] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
    >
      <svg width="120" height="120" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0.2)" />
          </linearGradient>
        </defs>
        <polygon points="60,5 110,35 110,85 60,115 10,85 10,35" fill="url(#innerGrad)" />
      </svg>
    </motion.div>

    {/* Orbiting sparkles */}
    {[0, 60, 120, 180, 240, 300].map((deg, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 rounded-full bg-white"
        style={{
          left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * 100}px)`,
          top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * 100}px)`,
          opacity: 0.7,
          boxShadow: '0 0 6px 2px rgba(255,255,255,0.5)',
        }}
        animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
      />
    ))}
  </div>
);

const CTASection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const navigate = useNavigate();

  return (
    <section ref={ref} className="py-28 relative overflow-hidden bg-land-bg">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative bg-land-ink rounded-[40px] overflow-hidden"
        >
          {/* Background blobs */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600 rounded-full blur-[100px] opacity-25 pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600 rounded-full blur-[100px] opacity-25 pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-8 p-10 md:p-16">
            {/* Text */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-6"
              >
                <Sparkles size={14} /> Free to Get Started
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3, duration: 0.7 }}
                className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight"
              >
                Your first step to a{' '}
                <span className="bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent">
                  calmer mind
                </span>{' '}
                starts today.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.7 }}
                className="text-slate-400 text-lg mb-10 max-w-lg"
              >
                No credit card required. No waiting rooms. No stigma. Just compassionate AI support, private and secure.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5, duration: 0.7 }}
                className="flex flex-wrap gap-4"
              >
                <button
                  onClick={() => navigate('/login')}
                  className="group flex items-center gap-2 bg-white text-land-ink font-bold px-8 py-4 rounded-full shadow-2xl shadow-white/10 hover:-translate-y-1 hover:shadow-white/20 transition-all duration-300"
                >
                  Start Free — No Card Needed
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/10 transition-all"
                >
                  Sign In
                </button>
              </motion.div>
            </div>

            {/* Animated gem */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
              animate={inView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="h-72 lg:h-80 w-full"
            >
              <AnimatedGem />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
