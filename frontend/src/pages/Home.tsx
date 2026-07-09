import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import GameCard from '../components/shared/GameCard';
import useStore from '../store/useStore';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { setGame } = useStore();

  const handleGameSelect = (game: 'pubg' | 'freefire') => {
    setGame(game);
    navigate(`/purchase/${game}`);
  };

  return (
    <div className="min-h-screen bg-cyber-bg">
      <Header />

      <div className="pt-16 pb-24 px-4">
        {/* Greeting */}
        <p className="text-lg font-semibold text-white mt-2 animate-fade-in">
          Xush kelibsiz! 👋
        </p>

        {/* Stats row */}
        <div className="flex gap-3 mt-4 animate-slide-up">
          {/* UC stat card */}
          <div className="bg-gradient-to-br from-purple-900/40 to-cyber-card border border-cyber-border rounded-xl p-3 flex-1">
            <p className="text-xs text-gray-400">Jami UC</p>
            <p className="text-xl font-bold text-white mt-1">12,450</p>
            <div className="mt-1">
              <svg className="w-4 h-4 text-cyber-purple opacity-50" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>

          {/* Olmos stat card */}
          <div className="bg-gradient-to-br from-cyan-900/40 to-cyber-card border border-cyber-border rounded-xl p-3 flex-1">
            <p className="text-xs text-gray-400">Jami Olmos</p>
            <p className="text-xl font-bold text-white mt-1">8,920</p>
            <div className="mt-1">
              <svg className="w-4 h-4 text-cyber-cyan opacity-50" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Top games section */}

        <h2 className="text-lg font-semibold text-white mt-6 mb-3">
          Top O'yin Paketlari
        </h2>

        <div className="flex flex-col gap-3">
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

        {/* Flash sale mini-banner */}
        <div className="mt-4 bg-gradient-to-r from-amber-900/30 to-cyber-card border border-amber-500/20 rounded-xl p-3 animate-slide-up">
          <p className="text-sm text-amber-400">
            ⚡ Flash Sale: 660 UC atigi 99,000 so'm!
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
