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
        {/* Pulsing glow wrapper */}
        <div className="animate-pulse-glow">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyber-purple to-cyber-cyan bg-clip-text text-transparent">
            CYBERPAY
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-sm text-gray-500 tracking-[0.3em] uppercase mt-2">
          GAMING STORE v2.0
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
