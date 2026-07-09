import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../../store/useStore';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, telegramUser } = useStore();

  const isUz = language === 'uz';

  // Get display name from Telegram user
  const displayName = telegramUser
    ? telegramUser.username
      ? `@${telegramUser.username}`
      : telegramUser.first_name
    : isUz
    ? 'Mehmon'
    : 'Guest';

  const navItems = [
    {
      id: 'home',
      label: isUz ? 'Asosiy' : 'Home',
      path: '/home',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'referrals',
      label: isUz ? 'Referallar' : 'Referrals',
      path: '/referrals',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'orders',
      label: isUz ? 'Tarix' : 'History',
      path: '/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: isUz ? 'Profil' : 'Profile',
      path: '/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      {/* Welcome sticker strip */}
      <div className="bg-gradient-to-r from-cyber-purple/20 via-cyber-bg/95 to-cyber-cyan/20 backdrop-blur-md border-t border-cyber-purple/30 px-4 py-1.5 flex items-center gap-2">
        {/* Animated wave emoji */}
        <span
          className="text-base select-none"
          style={{ display: 'inline-block', animation: 'waveHand 1.8s ease-in-out infinite' }}
        >
          👋
        </span>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[11px] text-gray-400 whitespace-nowrap">
            {isUz ? 'Xush kelibsiz,' : 'Welcome,'}
          </span>
          <span className="text-[11px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyber-purple to-cyber-cyan truncate max-w-[140px]">
            {displayName}
          </span>
        </div>
        {/* Decorative dots */}
        <div className="ml-auto flex gap-1 items-center opacity-40">
          <span className="w-1 h-1 rounded-full bg-cyber-purple animate-pulse" />
          <span className="w-1 h-1 rounded-full bg-cyber-cyan animate-pulse" style={{ animationDelay: '300ms' }} />
          <span className="w-1 h-1 rounded-full bg-cyber-purple animate-pulse" style={{ animationDelay: '600ms' }} />
        </div>
      </div>

      {/* Nav buttons */}
      <div className="h-16 bg-cyber-bg/95 backdrop-blur-lg border-t border-cyber-border flex items-center justify-around px-2 pb-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all duration-300 ${
                active
                  ? 'text-cyber-purple scale-105 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className={`transition-transform duration-300 ${active ? 'drop-shadow-[0_0_6px_rgba(124,58,237,0.8)]' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] mt-0.5 tracking-wider">{item.label}</span>
              {active && (
                <span className="w-4 h-0.5 rounded-full bg-gradient-to-r from-cyber-purple to-cyber-cyan mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes waveHand {
          0%, 60%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(18deg); }
          20% { transform: rotate(-8deg); }
        }
      `}</style>
    </nav>
  );
};

export default BottomNav;
