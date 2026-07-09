import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'home',
      label: 'Asosiy',
      path: '/home',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'referrals',
      label: 'Referallar',
      path: '/referrals',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'orders',
      label: 'Tarix',
      path: '/orders',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profil',
      path: '/profile',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  // Helper to determine if path is active (handling sub-paths if necessary)
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-cyber-bg/90 backdrop-blur-lg border-t border-cyber-border z-40 flex items-center justify-around px-2 pb-2">
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${
              active
                ? 'text-cyber-purple scale-105 font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className={`transition-transform duration-300 ${active ? 'animate-pulse' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[10px] mt-1 tracking-wider">{item.label}</span>
            {active && (
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyber-purple to-cyber-cyan mt-1 shadow-[0_0_8px_rgba(255,107,0,0.8)]" />
            )}
          </button>
        );
      })}
    </nav>
  );
};


export default BottomNav;
