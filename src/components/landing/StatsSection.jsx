import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { value: '50K+', label: 'Active Users', color: 'from-[#1B98E0] to-[#C2FFF0]' },
  { value: '98%', label: 'Feel Better in 14 Days', color: 'from-[#0E7C7B] to-[#C2FFF0]' },
  { value: '4.9★', label: 'Average Rating', color: 'from-[#1B98E0] to-[#0E7C7B]' },
  { value: '24/7', label: 'Always Available', color: 'from-[#C2FFF0] to-[#1B98E0]' },
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
  <section className="py-16 bg-[#0D1B2A]">
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
            <p className="text-[#3D5A80] text-sm font-medium">{label}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default StatsSection;
