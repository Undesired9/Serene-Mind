import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { UserPlus, MessageCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ── Animated ring visual (replaces 3D torus) ───────────────── */
const AnimatedRing = ({ color, size = 200 }) => (
  <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
    {/* Outer blurred glow */}
    <div className="absolute inset-0 rounded-full blur-2xl opacity-20" style={{ backgroundColor: color }} />

    {/* Spinning ring 1 */}
    <motion.div
      className="absolute rounded-full border-4"
      style={{
        width: size * 0.9, height: size * 0.9,
        borderColor: color, borderTopColor: 'transparent', borderLeftColor: 'transparent',
        opacity: 0.8,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
    />

    {/* Spinning ring 2 (counter) */}
    <motion.div
      className="absolute rounded-full border-4"
      style={{
        width: size * 0.7, height: size * 0.7,
        borderColor: color, borderBottomColor: 'transparent', borderRightColor: 'transparent',
        opacity: 0.5,
      }}
      animate={{ rotate: -360 }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    />

    {/* Spinning ring 3 */}
    <motion.div
      className="absolute rounded-full border-2"
      style={{
        width: size * 0.5, height: size * 0.5,
        borderColor: color, opacity: 0.3,
        borderTopColor: 'transparent',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    />

    {/* Center glowing orb */}
    <motion.div
      className="w-16 h-16 rounded-full shadow-lg"
      style={{
        background: `radial-gradient(circle at 35% 35%, white 0%, ${color} 60%)`,
        boxShadow: `0 0 30px 8px ${color}44`,
      }}
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);

const steps = [
  {
    number: '01',
    icon: <UserPlus size={24} />,
    title: 'Create Your Safe Space',
    desc: 'Register in seconds. Your account is encrypted end-to-end. We never sell or share your personal information — ever.',
    color: '#3b82f6',
  },
  {
    number: '02',
    icon: <MessageCircle size={24} />,
    title: 'Talk to Your AI Therapist',
    desc: 'Begin an evidence-based conversation. SereneMind uses CBT techniques, active listening, and personalised prompts calibrated to your emotional state.',
    color: '#8b5cf6',
  },
  {
    number: '03',
    icon: <TrendingUp size={24} />,
    title: 'Track Your Progress',
    desc: 'Visualise your mood trends, streak insights, and session history on a beautiful analytics dashboard. Watch yourself grow.',
    color: '#10b981',
  },
];

const slideLeft = { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } } };
const slideRight = { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } } };

const HowItWorksSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const navigate = useNavigate();

  return (
    <section id="how-it-works" ref={ref} className="py-28 bg-land-soft relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-blue-50 to-transparent rounded-full blur-[80px] opacity-60 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 bg-white border border-land-border text-land-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-5 shadow-sm">
            Simple 3-Step Process
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-land-ink mb-5 leading-tight">
            Start feeling better{' '}
            <span className="bg-gradient-to-r from-land-primary to-land-secondary bg-clip-text text-transparent">
              in minutes
            </span>
          </h2>
          <p className="text-land-muted text-lg max-w-xl mx-auto">
            No complex setup. No waiting rooms. No judgment. Just compassionate AI support, right now.
          </p>
        </motion.div>

        <div className="flex flex-col gap-20">
          {steps.map((step, i) => {
            const isEven = i % 2 === 0;
            return (
              <div key={step.number} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Text */}
                <motion.div
                  variants={isEven ? slideLeft : slideRight}
                  initial="hidden"
                  animate={inView ? 'visible' : 'hidden'}
                  className={`flex flex-col gap-5 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
                >
                  <div className="text-7xl font-black leading-none select-none" style={{ color: step.color, opacity: 0.1 }}>
                    {step.number}
                  </div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white -mt-8 shadow-lg"
                    style={{ backgroundColor: step.color, boxShadow: `0 12px 24px -6px ${step.color}66` }}
                  >
                    {step.icon}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-land-ink">{step.title}</h3>
                  <p className="text-land-muted text-[17px] leading-relaxed max-w-md">{step.desc}</p>

                  {i === steps.length - 1 && (
                    <button
                      onClick={() => navigate('/login')}
                      className="group mt-2 inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-full text-white w-fit hover:-translate-y-0.5 transition-all"
                      style={{ backgroundColor: step.color, boxShadow: `0 12px 24px -6px ${step.color}55` }}
                    >
                      Begin My Journey
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </motion.div>

                {/* Animated Ring visual */}
                <motion.div
                  variants={isEven ? slideRight : slideLeft}
                  initial="hidden"
                  animate={inView ? 'visible' : 'hidden'}
                  className={`relative flex items-center justify-center h-72 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}
                >
                  <AnimatedRing color={step.color} size={220} />
                  {/* Step label bubble */}
                  <div
                    className="absolute -bottom-2 -right-2 w-14 h-14 rounded-2xl text-white font-black text-lg flex items-center justify-center shadow-xl"
                    style={{ backgroundColor: step.color }}
                  >
                    {i + 1}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
