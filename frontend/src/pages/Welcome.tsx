import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome: React.FC = () => {
  const [fadeOut, setFadeOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2500);

    const navTimer = setTimeout(() => {
      navigate('/home');
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div
      className={`min-h-screen bg-cyber-bg flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="animate-fade-in flex flex-col items-center">
        {/* Pulsing logo icon */}
        <div className="animate-float mb-6">
          <svg className="w-28 h-28 shadow-[0_0_60px_rgba(255,107,0,0.4)] rounded-none p-4 bg-cyber-card border border-cyber-border" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 15L22 7L12 2z" fill="url(#welcome-logo-grad)" />
            <defs>
              <linearGradient id="welcome-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF6B00" />
                <stop offset="100%" stopColor="#FFB300" />
              </linearGradient>
            </defs>
          </svg>
        </div>


        {/* Title */}
        <h1 className="text-3xl font-black bg-gradient-to-r from-orange-500 to-cyber-cyan bg-clip-text text-transparent tracking-widest uppercase">
          CYBERPAY
        </h1>

        {/* Subtitle */}
        <p className="text-[10px] text-gray-500 tracking-[0.4em] uppercase mt-2 font-mono">
          RESELLER PORTAL
        </p>



        {/* Animated loading dots */}
        <div className="flex gap-2 mt-8">
          <span
            className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"
            style={{ animationDelay: '200ms' }}
          />
          <span
            className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"
            style={{ animationDelay: '400ms' }}
          />
        </div>
      </div>
    </div>
  );
};

export default Welcome;
