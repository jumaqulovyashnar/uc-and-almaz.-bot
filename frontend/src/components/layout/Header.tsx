import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-cyber-bg/85 backdrop-blur-md border-b border-cyber-border z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <span className="text-xl font-extrabold bg-gradient-to-r from-cyber-purple to-cyber-cyan bg-clip-text text-transparent tracking-wider animate-pulse-glow">
          CYBERPAY
        </span>
        <span className="text-[10px] bg-cyber-purple/20 border border-cyber-purple/30 text-cyber-purple-light font-bold px-1.5 py-0.5 rounded">
          v2.0
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
