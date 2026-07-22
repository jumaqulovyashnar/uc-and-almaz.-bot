import React from 'react';
import useStore from '../../store/useStore';
import Button from '../ui/Button';

export const Header: React.FC = () => {
  const { theme, language, setTheme, setLanguage } = useStore();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'uz' ? 'en' : 'uz');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-cyber-bg/85 backdrop-blur-md border-b border-cyber-border z-50 flex items-center justify-between px-4">
      {/* Brand logo (no lightning bolt icon) */}
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-black bg-gradient-to-r from-cyber-purple to-cyber-cyan bg-clip-text text-transparent tracking-widest">
          CYBERPAY
        </span>
      </div>

      {/* Control panel (Theme & Language) */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="none"
          onClick={toggleLanguage}
          className="h-8 px-3 flex items-center justify-center rounded-none bg-cyber-card border border-cyber-border text-xs font-black tracking-wider text-gray-300 hover:text-white hover:border-cyber-purple/50 transition-all duration-300"
          title={language === 'uz' ? "Switch to English" : "O'zbek tiliga o'tish"}
        >
          {language === 'uz' ? 'UZ' : 'EN'}
        </Button>

        <Button
          variant="ghost"
          size="none"
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-none bg-cyber-card border border-cyber-border text-gray-300 hover:text-white hover:border-cyber-purple/50 transition-all duration-300"
          title={theme === 'dark' ? "Kunduzgi rejim" : "Tungi rejim"}
        >

          {theme === 'dark' ? (
            // Sun icon for switching to light mode
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            // Moon icon for switching to dark mode
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </Button>
      </div>
    </header>
  );
};

export default Header;
