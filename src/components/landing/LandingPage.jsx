import React, { useEffect } from 'react';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';
import TestimonialsSection from './TestimonialsSection';
import StatsSection from './StatsSection';
import CTASection from './CTASection';
import Footer from './Footer';

const LandingPage = () => {
  useEffect(() => {
    // Load Google Fonts for landing page
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  return (
    <div className="min-h-screen bg-land-bg font-display overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;
