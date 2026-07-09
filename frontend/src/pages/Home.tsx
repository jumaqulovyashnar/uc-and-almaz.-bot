import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import GameCard from '../components/shared/GameCard';
import useStore from '../store/useStore';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { setGame, language } = useStore();

  const isUz = language === 'uz';

  const handleGameSelect = (game: 'pubg' | 'freefire') => {
    setGame(game);
    navigate(`/purchase/${game}`);
  };

  return (
    <div className="min-h-screen bg-cyber-bg pb-24 pt-16">
      <Header />

      <div className="px-4">
        {/* Greeting */}
        <p className="text-lg font-bold text-white mt-4 animate-fade-in">
          {isUz ? 'Xush kelibsiz! 👋' : 'Welcome! 👋'}
        </p>

        {/* Stats row */}
        <div className="flex gap-4 mt-5 animate-slide-up">
          {/* UC stat card */}
          <div className="bg-gradient-to-br from-amber-900/10 to-cyber-card border border-cyber-border rounded-xl p-3 flex-1 transition-all hover:border-cyber-purple/30">
            <p className="text-xs text-gray-400 font-medium">{isUz ? 'Jami UC' : 'Total UC'}</p>
            <p className="text-xl font-black text-white mt-1">12,450</p>
            <div className="mt-1">
              <svg className="w-4 h-4 text-cyber-purple opacity-60" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>

          {/* Olmos stat card */}
          <div className="bg-gradient-to-br from-amber-900/10 to-cyber-card border border-cyber-border rounded-xl p-3 flex-1 transition-all hover:border-cyber-cyan/30">
            <p className="text-xs text-gray-400 font-medium">{isUz ? 'Jami Olmos' : 'Total Diamonds'}</p>
            <p className="text-xl font-black text-white mt-1">8,920</p>
            <div className="mt-1">
              <svg className="w-4 h-4 text-cyber-cyan opacity-60" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Top games section */}
        <h2 className="text-lg font-black text-white mt-8 mb-4 tracking-wide uppercase">
          {isUz ? "Top O'yin Paketlari" : 'Top Game Packages'}
        </h2>

        <div className="flex flex-col gap-4">
          <GameCard
            game="pubg"
            packagesCount={6}
            onClick={() => handleGameSelect('pubg')}
          />
          <GameCard
            game="freefire"
            packagesCount={6}
            onClick={() => handleGameSelect('freefire')}
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
