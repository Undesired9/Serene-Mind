import React from 'react';
import { MessageCircle, Globe, Mail, Heart } from 'lucide-react';

const cols = [
  {
    title: 'Product',
    links: ['Features', 'How It Works', 'Pricing', 'Changelog'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Blog', 'Mental Health Library', 'Crisis Resources'],
  },
  {
    title: 'Company',
    links: ['About', 'Privacy Policy', 'Terms of Service', 'Contact Us'],
  },
];

const Footer = () => (
  <footer className="bg-[#0D1B2A] text-white">
    {/* Main footer */}
    <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
      {/* Brand */}
      <div className="lg:col-span-2">
        <div className="flex items-center gap-2.5 mb-4">
          <img src="/Serene Mind.svg" alt="SereneMind Logo" className="w-12 h-12 object-contain" />
          <span className="font-bold text-lg tracking-tight">SereneMind</span>
        </div>
        <p className="text-[#3D5A80] text-sm leading-relaxed max-w-xs mb-6">
          AI-powered mental health support — private, evidence-based, and available 24 hours a day, 7 days a week.
        </p>
        {/* Social icons */}
        <div className="flex gap-3">
          {[
            { icon: <MessageCircle size={16} />, href: '#' },
            { icon: <Globe size={16} />, href: '#' },
            { icon: <Mail size={16} />, href: '#' },
          ].map(({ icon, href }, i) => (
            <a
              key={i}
              href={href}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#0E7C7B]/30 flex items-center justify-center transition-colors"
            >
              {icon}
            </a>
          ))}
        </div>
      </div>

      {/* Nav columns */}
      {cols.map((col) => (
        <div key={col.title}>
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">{col.title}</h4>
          <ul className="space-y-3">
            {col.links.map((link) => (
              <li key={link}>
                <a href="#" className="text-[#3D5A80] text-sm hover:text-[#C2FFF0] transition-colors">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    {/* Bottom bar */}
    <div className="border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#3D5A80] text-xs">
        <p>© 2026 SereneMind. All rights reserved.</p>
        <p className="flex items-center gap-1">
          Built with <Heart size={11} className="text-rose-400 fill-rose-400 mx-1" /> for mental wellness worldwide.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
