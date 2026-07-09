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
          <svg className="w-16 h-16 shadow-[0_0_50px_rgba(255,94,94,0.3)] rounded-full p-2 bg-cyber-card border border-cyber-border" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" fill="url(#welcome-logo-grad)" />
            <defs>
              <linearGradient id="welcome-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF5E5E" />
                <stop offset="100%" stopColor="#FF9F43" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black bg-gradient-to-r from-cyber-purple to-cyber-cyan bg-clip-text text-transparent tracking-widest uppercase">
          CYBERPAY
        </h1>

        {/* Subtitle */}
        <p className="text-[10px] text-gray-500 tracking-[0.4em] uppercase mt-2 font-mono">
          RESELLER PORTAL v2.0
        </p>


        {/* Animated loading dots */}
        <div className="flex gap-2 mt-8">
          <span
            className="w-2 h-2 bg-cyber-purple rounded-full animate-pulse"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 bg-cyber-purple rounded-full animate-pulse"
            style={{ animationDelay: '200ms' }}
          />
          <span
            className="w-2 h-2 bg-cyber-purple rounded-full animate-pulse"
            style={{ animationDelay: '400ms' }}
          />
        </div>
      </div>
    </div>
  );
};

export default Welcome;
