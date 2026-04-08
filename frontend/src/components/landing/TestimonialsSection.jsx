import React, { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Software Engineer',
    avatar: 'SM',
    avatarGrad: 'from-blue-500 to-sky-400',
    stars: 5,
    text: 'SereneMind has been a game-changer. After just two weeks of daily check-ins I noticed a 40% reduction in my anxiety levels. The AI actually listens — it never rushes me or gives generic answers.',
    tag: 'Anxiety & Burnout',
  },
  {
    name: 'Dr. Aisha Rahman',
    role: 'Medical Professional',
    avatar: 'AR',
    avatarGrad: 'from-purple-500 to-pink-400',
    stars: 5,
    text: "As a healthcare professional, I was sceptical. But SereneMind's CBT framework is genuinely impressive. I now recommend it to patients who are on therapy waiting-lists as a safe bridging tool.",
    tag: 'Clinical Endorsement',
  },
  {
    name: 'Marcus Lee',
    role: 'Graduate Student',
    avatar: 'ML',
    avatarGrad: 'from-emerald-500 to-teal-400',
    stars: 5,
    text: 'I hit rock bottom during my PhD. SereneMind\'s crisis detection saved me — the handoff to a real human was seamless and felt genuinely caring. I\'m now three months into recovery.',
    tag: 'Crisis Support',
  },
  {
    name: 'Fatima Al-Hassan',
    role: 'Mother of Three',
    avatar: 'FA',
    avatarGrad: 'from-rose-500 to-orange-400',
    stars: 5,
    text: 'The Urdu support was a surprise I never expected. Finally an app that speaks my language — literally. My husband and I now use it together for couples journaling.',
    tag: 'Multi-Language',
  },
];

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const card = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const TestimonialsSection = () => {
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const prev = () => setActive((p) => (p - 1 + testimonials.length) % testimonials.length);
  const next = () => setActive((p) => (p + 1) % testimonials.length);

  return (
    <section id="testimonials" ref={ref} className="py-28 bg-land-bg overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
            <Star size={13} fill="currentColor" /> Real Stories
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-land-ink mb-4 leading-tight">
            Lives transformed by{' '}
            <span className="bg-gradient-to-r from-land-primary to-land-secondary bg-clip-text text-transparent">
              SereneMind
            </span>
          </h2>
          <p className="text-land-muted text-lg max-w-xl mx-auto">
            50,000+ people have taken the first step. Here are their stories.
          </p>
        </motion.div>

        {/* Desktop grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="hidden md:grid grid-cols-2 gap-6"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={card}
              whileHover={{ y: -5, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.1)' }}
              className="bg-land-surface border border-land-border rounded-3xl p-8 flex flex-col gap-5 relative transition-shadow"
            >
              <Quote size={28} className="text-land-border absolute top-6 right-6" />

              {/* Stars */}
              <div className="flex gap-1">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>

              <p className="text-land-ink text-[15px] leading-relaxed">"{t.text}"</p>

              <div className="flex items-center gap-3 mt-auto pt-4 border-t border-land-border">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarGrad} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {t.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-land-ink font-bold text-sm">{t.name}</p>
                  <p className="text-land-muted text-xs">{t.role}</p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold bg-blue-50 text-land-primary border border-blue-100 px-2.5 py-1 rounded-full">
                  {t.tag}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile carousel */}
        <div className="md:hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className="bg-land-surface border border-land-border rounded-3xl p-7 flex flex-col gap-5"
            >
              <div className="flex gap-1">
                {Array.from({ length: testimonials[active].stars }).map((_, i) => (
                  <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-land-ink text-[15px] leading-relaxed">"{testimonials[active].text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-land-border">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonials[active].avatarGrad} flex items-center justify-center text-white text-xs font-bold`}>
                  {testimonials[active].avatar}
                </div>
                <div>
                  <p className="text-land-ink font-bold text-sm">{testimonials[active].name}</p>
                  <p className="text-land-muted text-xs">{testimonials[active].role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-3 mt-6">
            <button onClick={prev} className="w-10 h-10 rounded-full border border-land-border bg-land-surface flex items-center justify-center hover:bg-land-soft transition">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === active ? 'bg-land-primary w-5' : 'bg-land-border'}`}
                />
              ))}
            </div>
            <button onClick={next} className="w-10 h-10 rounded-full border border-land-border bg-land-surface flex items-center justify-center hover:bg-land-soft transition">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
