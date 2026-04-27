import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Menu, X } from 'lucide-react';

const links = ['Features', 'How It Works', 'Testimonials'];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id.toLowerCase().replace(/\s/g, '-'));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-[#0E7C7B]/10 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-8 h-8 bg-gradient-to-br from-[#1B98E0] to-[#0E7C7B] rounded-xl flex items-center justify-center shadow-md">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-[#0D1B2A] font-bold text-lg tracking-tight">SereneMind</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <button
              key={link}
              onClick={() => scrollTo(link)}
              className="text-[#3D5A80] hover:text-[#0D1B2A] text-sm font-medium transition-colors"
            >
              {link}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-[#3D5A80] hover:text-[#0D1B2A] text-sm font-medium transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/login')}
            className="bg-[#0D1B2A] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#0D1B2A]/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            Get Started Free
          </button>
        </div>

        {/* Mobile Burger */}
        <button className="md:hidden text-[#0D1B2A]" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-[#0E7C7B]/10 px-6 pb-4 flex flex-col gap-3"
          >
            {links.map((link) => (
              <button key={link} onClick={() => scrollTo(link)} className="text-[#3D5A80] text-sm py-2 text-left">
                {link}
              </button>
            ))}
            <button
              onClick={() => navigate('/login')}
              className="bg-[#0D1B2A] text-white text-sm font-semibold px-5 py-3 rounded-full mt-2"
            >
              Get Started Free
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;
