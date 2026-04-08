import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Brain, Shield, Mic, Globe, BarChart2, HeartPulse,
  Zap, Lock, Sparkles
} from 'lucide-react';

/* ── Animated 3D-style card icon ────────────────────────────── */
const Feature3DIcon = ({ color }) => (
  <div className="relative w-16 h-16 mb-2">
    {/* Shadow layer */}
    <div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-3 rounded-full blur-md opacity-40"
      style={{ backgroundColor: color }}
    />
    {/* Cube face bottom */}
    <div
      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-3 rounded-sm"
      style={{ backgroundColor: color, filter: 'brightness(0.65)', transform: 'translateX(-50%) rotateX(60deg) skewX(-10deg)' }}
    />
    {/* Cube face side */}
    <div
      className="absolute bottom-2 right-2 w-3 h-8 rounded-sm"
      style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
    />
    {/* Cube face top (main) */}
    <motion.div
      className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
      style={{ backgroundColor: color, boxShadow: `0 8px 24px -4px ${color}88` }}
      animate={{ y: [0, -4, 0], rotate: [0, 3, -3, 0] }}
      transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut' }}
    >
    </motion.div>
  </div>
);

const features = [
  { icon: <Brain size={22} />, color: '#3b82f6', title: 'AI-Powered Therapy', desc: 'Real-time conversational therapy using NLP trained on evidence-based CBT frameworks — no appointment needed.' },
  { icon: <HeartPulse size={22} />, color: '#f43f5e', title: 'Crisis Detection', desc: 'Our layered risk-triage engine (Low / Medium / High) detects distress signals and escalates to real humans instantly.' },
  { icon: <BarChart2 size={22} />, color: '#8b5cf6', title: 'Mood Analytics', desc: 'Dynamic dashboards visualise your mood trends, session history, and psychological progress with beautiful charts.' },
  { icon: <Shield size={22} />, color: '#10b981', title: 'HIPAA / GDPR Compliant', desc: 'End-to-end encrypted sessions, JWT authentication, and zero third-party data sharing. Your data stays yours.' },
  { icon: <Globe size={22} />, color: '#0ea5e9', title: 'Multi-Language Support', desc: 'Speak in your native tongue. SereneMind supports English, Urdu, and 20+ other languages for accessible global care.' },
  { icon: <Mic size={22} />, color: '#f59e0b', title: 'Voice & Text Sessions', desc: 'Whether you prefer typing or speaking, SereneMind adapts to your communication style naturally.' },
  { icon: <Zap size={22} />, color: '#6366f1', title: 'Instant Responses', desc: 'Sub-2-second AI response times powered by our optimised inference engine — therapy that keeps up with you.' },
  { icon: <Lock size={22} />, color: '#14b8a6', title: 'Offline Support', desc: 'Core journaling and CBT exercises are available offline. Your mental health toolkit is always in your pocket.' },
  { icon: <Sparkles size={22} />, color: '#ec4899', title: 'Personalised Plans', desc: 'SereneMind learns your patterns over time and dynamically adjusts exercises, prompts, and check-in frequency.' },
];

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const card = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const FeaturesSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="features" ref={ref} className="py-28 bg-land-bg relative overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#94a3b8 1px,transparent 1px),linear-gradient(90deg,#94a3b8 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-land-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
            <Sparkles size={14} /> Everything You Need
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-land-ink mb-5 leading-tight">
            Therapy reimagined with{' '}
            <span className="bg-gradient-to-r from-land-primary to-land-secondary bg-clip-text text-transparent">
              AI precision
            </span>
          </h2>
          <p className="text-land-muted text-lg max-w-2xl mx-auto">
            A full mental-health platform built with the expertise of licensed psychologists and the power of modern AI engineering.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={card}
              whileHover={{ y: -6, boxShadow: '0 24px 48px -12px rgba(0,0,0,0.12)' }}
              className="group bg-land-surface border border-land-border rounded-3xl p-7 flex flex-col gap-4 cursor-default transition-shadow"
            >
              {/* Animated icon */}
              <motion.div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: f.color, boxShadow: `0 8px 24px -4px ${f.color}55` }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {f.icon}
              </motion.div>

              {/* Decorative gradient bar */}
              <div className="w-12 h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${f.color}, transparent)` }} />

              <h3 className="text-land-ink font-bold text-[16px]">{f.title}</h3>
              <p className="text-land-muted text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
