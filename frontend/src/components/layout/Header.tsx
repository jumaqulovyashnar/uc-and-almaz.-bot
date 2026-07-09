import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-cyber-bg/85 backdrop-blur-md border-b border-cyber-border z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6 animate-float" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" fill="url(#logo-grad)" />
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF5E5E" />
              <stop offset="100%" stopColor="#FF9F43" />
            </linearGradient>
          </defs>
        </svg>
        <span className="text-lg font-black bg-gradient-to-r from-cyber-purple to-cyber-cyan bg-clip-text text-transparent tracking-wide">
          CYBERPAY
        </span>
        <span className="text-[9px] bg-cyber-purple/10 border border-cyber-purple/20 text-cyber-purple-light font-bold px-1 py-0.5 rounded tracking-tighter">
          V2.0
        </span>
      </div>

      
      <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-cyber-card border border-cyber-border text-gray-400 hover:text-white hover:border-cyber-purple/50 transition-all duration-300">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </header>
  );
};

export default Header;
