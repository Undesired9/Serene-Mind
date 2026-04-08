import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Brain, Heart } from 'lucide-react';

/* ── Animated CSS Orb ────────────────────────────────────────── */
const HeroOrb = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    {/* Outer glow ring */}
    <motion.div
      className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full"
      style={{
        background: 'radial-gradient(circle at 40% 40%, #e0f2fe, #c7d2fe, #ddd6fe)',
        filter: 'blur(2px)',
      }}
      animate={{ scale: [1, 1.05, 1], rotate: [0, 360] }}
      transition={{ scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 20, repeat: Infinity, ease: 'linear' } }}
    />

    {/* Main orb */}
    <motion.div
      className="absolute w-56 h-56 md:w-72 md:h-72 rounded-full shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #0ea5e9 100%)',
        boxShadow: '0 40px 80px -20px rgba(59,130,246,0.5)',
      }}
      animate={{ scale: [1, 1.04, 1], y: [0, -12, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* Inner highlight */}
    <motion.div
      className="absolute w-32 h-32 md:w-40 md:h-40 rounded-full"
      style={{
        background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5) 0%, transparent 70%)',
      }}
      animate={{ rotate: [0, -360] }}
      transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
    />

    {/* Orbiting dot 1 */}
    <motion.div
      className="absolute w-4 h-4 rounded-full bg-blue-400 shadow-lg"
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
      style={{ transformOrigin: '0 -130px' }}
    />

    {/* Orbiting dot 2 */}
    <motion.div
      className="absolute w-3 h-3 rounded-full bg-purple-400 shadow-lg"
      animate={{ rotate: [180, 540] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      style={{ transformOrigin: '0 -100px' }}
    />

    {/* Orbiting dot 3 */}
    <motion.div
      className="absolute w-5 h-5 rounded-full bg-sky-300 shadow-lg"
      animate={{ rotate: [90, -270] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      style={{ transformOrigin: '-120px 0' }}
    />

    {/* Floating particles */}
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full opacity-60"
        style={{
          width: `${6 + (i % 3) * 4}px`,
          height: `${6 + (i % 3) * 4}px`,
          background: ['#3b82f6','#8b5cf6','#10b981','#f43f5e','#0ea5e9','#f59e0b'][i],
          left: `${15 + i * 12}%`,
          top: `${10 + (i % 3) * 25}%`,
        }}
        animate={{ y: [0, -20, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
      />
    ))}
  </div>
);

/* ── Main Section ────────────────────────────────────────────── */
const badgePill = { hidden: { scale: 0.8, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { duration: 0.5 } } };
const fade = (delay = 0) => ({ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] } } });

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-land-bg">

      {/* Gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-40 w-[700px] h-[700px] bg-blue-100 rounded-full blur-[120px] opacity-60" />
        <div className="absolute -bottom-20 -right-40 w-[600px] h-[600px] bg-purple-100 rounded-full blur-[120px] opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-sky-50 rounded-full blur-[80px] opacity-40" />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">

        {/* Left copy */}
        <motion.div initial="hidden" animate="visible" className="relative z-10">
          <motion.div variants={badgePill} className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-land-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-land-primary animate-pulse" />
            AI-Powered Mental Health Support
          </motion.div>

          <motion.h1
            variants={fade(0.1)}
            className="text-5xl md:text-6xl lg:text-7xl font-black text-land-ink leading-none tracking-tight mb-6"
          >
            Your Mind,{' '}
            <span className="bg-gradient-to-r from-land-primary via-land-secondary to-land-teal bg-clip-text text-transparent">
              Healed.
            </span>
            <br />Anytime.
          </motion.h1>

          <motion.p variants={fade(0.2)} className="text-land-muted text-lg md:text-xl leading-relaxed mb-10 max-w-lg">
            SereneMind combines cutting-edge AI therapy with proven psychological frameworks to deliver deeply personalized mental wellness — private, secure, and available 24/7.
          </motion.p>

          <motion.div variants={fade(0.3)} className="flex flex-wrap gap-4 mb-12">
            <button
              onClick={() => navigate('/login')}
              className="group flex items-center gap-2 bg-land-ink text-white font-bold px-7 py-4 rounded-full shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-300"
            >
              Start Free Session
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 border border-land-border text-land-ink font-semibold px-7 py-4 rounded-full hover:bg-land-soft transition-all"
            >
              See How It Works
            </button>
          </motion.div>

          {/* Trust badges */}
          <motion.div variants={fade(0.4)} className="flex flex-wrap gap-5">
            {[
              { icon: <ShieldCheck size={15} />, label: 'HIPAA Compliant' },
              { icon: <Brain size={15} />, label: 'CBT-Based Therapy' },
              { icon: <Heart size={15} />, label: 'Crisis Detection' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-land-muted text-xs font-medium">
                <span className="text-land-primary">{icon}</span>
                {label}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right — CSS 3D Orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-[420px] lg:h-[560px] w-full"
        >
          <HeroOrb />

          {/* Floating info cards */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="absolute bottom-16 left-0 bg-white rounded-2xl shadow-xl border border-land-border p-4 flex items-center gap-3 z-10"
          >
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
              <Heart size={18} />
            </div>
            <div>
              <p className="text-land-ink font-bold text-sm">Mood Improved</p>
              <p className="text-land-muted text-xs">+32% after 7 days</p>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 0.5 }}
            className="absolute top-20 right-0 bg-white rounded-2xl shadow-xl border border-land-border p-4 flex items-center gap-3 z-10"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Brain size={18} />
            </div>
            <div>
              <p className="text-land-ink font-bold text-sm">AI Therapist</p>
              <p className="text-land-muted text-xs">Available 24 / 7</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
