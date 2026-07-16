import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import GameCard from '../components/shared/GameCard';
import HeroSlider from '../components/shared/HeroSlider';
import useStore from '../store/useStore';
import { getPublicStats } from '../services/api';

const HERO_SLIDES = [
  { id: 1, imageUrl: '/images/pubg.jpg',   title: 'PUBG MOBILE',  subtitle: "🎮 UC & To'plamlar — eng qulay narxlarda" },
  { id: 2, imageUrl: '/images/free.jpg',   title: 'FREE FIRE',    subtitle: '💎 Olmos & Propuski — tez yetkazib berish' },
  { id: 3, imageUrl: '/images/pubg1.webp', title: 'PUBG MOBILE',  subtitle: "🏆 Prime & Prime Plus obunalar" },
  { id: 4, imageUrl: '/images/free1.webp', title: 'FREE FIRE MAX', subtitle: "⚡ 24/7 avtomatik to'ldirish" },
  { id: 5, imageUrl: '/images/pubg2.jpg',  title: 'PUBG MOBILE',  subtitle: '🎯 Barcha paketlar bir joyda' },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { setGame, language } = useStore();
  const [stats, setStats] = useState<{ total_uc: number; total_diamonds: number } | null>(null);

  const isUz = language === 'uz';

  useEffect(() => {
    getPublicStats().then(s => setStats(s)).catch(() => {});
  }, []);

  const fmt = (n: number) => n > 0 ? n.toLocaleString('uz-UZ') : '0';

  const handleGameSelect = (game: 'pubg' | 'freefire') => {
    setGame(game);
    navigate(`/purchase/${game}`);
  };

  return (
    <div className="min-h-screen bg-cyber-bg pb-36">
      <Header />

      <div className="pt-16">
        <HeroSlider slides={HERO_SLIDES} autoPlayInterval={5000} />
      </div>

      {/* Stats — real data from backend */}
      <div className="flex gap-4 px-4 mt-4 animate-slide-up">
        <div className="bg-gradient-to-br from-amber-900/10 to-cyber-card border border-cyber-border rounded-xl p-3 flex-1 transition-all hover:border-cyber-purple/30">
          <p className="text-xs text-gray-400 font-medium">{isUz ? 'Jami UC' : 'Total UC'}</p>
          <p className="text-xl font-black text-white mt-1">
            {stats !== null ? fmt(stats.total_uc) : '—'}
          </p>
          <svg className="w-4 h-4 text-cyber-purple opacity-60 mt-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="bg-gradient-to-br from-amber-900/10 to-cyber-card border border-cyber-border rounded-xl p-3 flex-1 transition-all hover:border-cyber-cyan/30">
          <p className="text-xs text-gray-400 font-medium">{isUz ? 'Jami Olmos' : 'Total Diamonds'}</p>
          <p className="text-xl font-black text-white mt-1">
            {stats !== null ? fmt(stats.total_diamonds) : '—'}
          </p>
          <svg className="w-4 h-4 text-cyber-cyan opacity-60 mt-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      </div>

      {/* Game select */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">
          {isUz ? "O'yinni tanlang" : 'Select Game'}
        </h2>
        <div className="flex flex-col gap-4">
          <GameCard game="pubg" packagesCount={6} onClick={() => handleGameSelect('pubg')} />
          <GameCard game="freefire" packagesCount={6} onClick={() => handleGameSelect('freefire')} />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
