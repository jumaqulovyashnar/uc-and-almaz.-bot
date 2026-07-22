import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import HeroSlider from '../components/shared/HeroSlider';
import useStore from '../store/useStore';
import { getPublicStats, getDynamicGames, type DynamicGame } from '../services/api';

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
  const [games, setGames] = useState<DynamicGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState<boolean>(true);

  const isUz = language === 'uz';

  useEffect(() => {
    getPublicStats().then(s => setStats(s)).catch(() => {});
    
    getDynamicGames()
      .then(g => {
        setGames(g);
        setGamesLoading(false);
      })
      .catch(() => setGamesLoading(false));
  }, []);

  const fmt = (n: number) => n > 0 ? n.toLocaleString('uz-UZ') : '0';

  const handleGameSelect = (gameKey: string) => {
    setGame(gameKey);
    // Legacy support for pubg-mobile-buykos to PurchasePUBG, free-fire-cis-new to PurchaseFreeFire, etc.
    if (gameKey === 'pubg-mobile-buykos' || gameKey === 'pubg') {
      navigate('/purchase/pubg');
    } else if (gameKey === 'free-fire-cis-new' || gameKey === 'freefire') {
      navigate('/purchase/freefire');
    } else {
      navigate(`/purchase/${gameKey}`);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg pb-36">
      <Header />

      <div className="pt-16">
        <HeroSlider slides={HERO_SLIDES} autoPlayInterval={5000} />
      </div>

      {/* Stats — real data from backend */}
      <div className="flex gap-4 px-4 mt-4 animate-slide-up">
        <div className="bg-gradient-to-br from-amber-900/10 to-cyber-card border border-[#FF6B00]/40 hover:border-2 hover:border-[#FF6B00] rounded-none p-3 flex-1 transition-all hover:shadow-[0_0_12px_rgba(255,107,0,0.25)]">
          <p className="text-xs text-gray-400 font-medium">{isUz ? 'Jami UC' : 'Total UC'}</p>
          <p className="text-xl font-black text-white mt-1">
            {stats !== null ? fmt(stats.total_uc) : '—'}
          </p>
          <svg className="w-4 h-4 text-cyber-purple opacity-60 mt-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="bg-gradient-to-br from-amber-900/10 to-cyber-card border border-[#FF6B00]/40 hover:border-2 hover:border-[#FF6B00] rounded-none p-3 flex-1 transition-all hover:shadow-[0_0_12px_rgba(255,107,0,0.25)]">
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
        
        {gamesLoading ? (
          <div className="flex justify-center py-10">
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-cyber-purple animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-cyber-purple animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-cyber-purple animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {games.map((g) => (
              <div
                key={g.key}
                onClick={() => handleGameSelect(g.key)}
                className="relative bg-cyber-card border border-[#FF6B00]/50 hover:border-2 hover:border-[#FF6B00] hover:shadow-[0_0_15px_rgba(255,107,0,0.35)] rounded-none p-4 cursor-pointer transition-all flex flex-col justify-between h-[155px] animate-fade-in group select-none"
              >
                {g.popular && (
                  <div className="absolute top-0 right-0 bg-[#FF6B00] text-white font-black text-[9px] px-1.5 py-0.5 tracking-wider uppercase">
                    TOP
                  </div>
                )}
                <div>
                  {/* Game Thumbnail */}
                  <div className="w-12 h-12 border border-[#FF6B00]/40 bg-[#0c0e12] flex items-center justify-center rounded-none overflow-hidden mb-3">
                    {g.image ? (
                      <img
                        src={g.image}
                        alt={g.name}
                        className="w-full h-full object-cover rounded-none"
                        onError={(e) => {
                          // Hide broken image, show fallback icon
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-gray-500"><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><path d="M17.32 5H6.68a4 4 0 00-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 003 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 019.828 16h4.344a2 2 0 011.414.586L17 18c.5.5 1 1 2 1a3 3 0 003-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0017.32 5z"/></svg>';
                            parent.appendChild(fallback.firstChild!);
                          }
                        }}
                      />
                    ) : (
                      <Gamepad2 className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <h4 className="font-extrabold text-white text-xs leading-snug line-clamp-2 uppercase tracking-wide">
                    {g.name}
                  </h4>
                </div>
                <div className="text-[#FF6B00] font-extrabold text-[9px] tracking-wider uppercase mt-auto flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>{isUz ? 'DONAT OLISH' : 'DONAT OLISH'}</span>
                  <span className="text-[10px]">➔</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
