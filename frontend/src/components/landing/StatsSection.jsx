import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { value: '50K+', label: 'Active Users', color: 'from-blue-500 to-sky-400' },
  { value: '98%', label: 'Feel Better in 14 Days', color: 'from-purple-500 to-pink-400' },
  { value: '4.9★', label: 'Average Rating', color: 'from-emerald-500 to-teal-400' },
  { value: '24/7', label: 'Always Available', color: 'from-rose-500 to-orange-400' },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const item = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const StatsSection = () => (
  <section className="py-16 bg-land-ink">
    <div className="max-w-7xl mx-auto px-6">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="grid grid-cols-2 md:grid-cols-4 gap-8"
      >
        {stats.map(({ value, label, color }) => (
          <motion.div key={label} variants={item} className="text-center">
            <p className={`text-4xl md:text-5xl font-black bg-gradient-to-r ${color} bg-clip-text text-transparent mb-2`}>
              {value}
            </p>
            <p className="text-slate-400 text-sm font-medium">{label}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default StatsSection;
