import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, ShoppingBag, BarChart3, ChevronRight } from 'lucide-react';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import HeroSlider from '../components/shared/HeroSlider';
import Modal from '../components/ui/Modal';
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
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);

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
    if (gameKey === 'pubg-mobile-buykos' || gameKey === 'pubg') {
      navigate('/purchase/pubg');
    } else if (gameKey === 'free-fire-cis-new' || gameKey === 'freefire') {
      navigate('/purchase/freefire');
    } else {
      navigate(`/purchase/${gameKey}`);
    }
  };

  const totalItemsSold = stats ? (stats.total_uc + stats.total_diamonds) : 0;

  return (
    <div className="min-h-screen bg-cyber-bg pb-36">
      <Header />

      <div className="pt-16">
        <HeroSlider slides={HERO_SLIDES} autoPlayInterval={5000} />
      </div>

      {/* ── Single Full Width Horizontal Flex Stat Card ── */}
      <div className="px-4 mt-4 animate-slide-up">
        <div
          onClick={() => setIsStatsModalOpen(true)}
          className="bg-cyber-card border border-[#FF6B00]/40 hover:border-[#FF6B00] rounded-none px-4 py-3.5 w-full transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(255,107,0,0.3)] flex items-center justify-between select-none"
        >
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-[#FF6B00]" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {isUz ? 'Jami Buyurtmalar Soni:' : 'Total Orders:'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-lg font-black text-[#FF6B00]">
              {stats !== null ? fmt(totalItemsSold) : '0'}
            </span>
            <span className="text-xs font-semibold text-gray-400 ml-1">ta</span>
          </div>
        </div>
      </div>

      {/* ── Game select Grid ── */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">
          {isUz ? "O'yinni tanlang" : 'Select Game'}
        </h2>
        
        {gamesLoading ? (
          <div className="flex justify-center py-10">
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {games.map((g) => (
              <div
                key={g.key}
                onClick={() => handleGameSelect(g.key)}
                className="relative bg-cyber-card border border-[#FF6B00]/50 hover:border-[#FF6B00] hover:shadow-[0_0_15px_rgba(255,107,0,0.35)] rounded-none p-4 cursor-pointer transition-all flex flex-col justify-between h-[155px] animate-fade-in group select-none"
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
                  <span>DONAT OLISH</span>
                  <span className="text-[10px]">➔</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Category Breakdown Modal for all 11 Games ── */}
      <Modal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        title={isUz ? "BARCHA 11 TA KATEGORIYA STATISTIKASI" : "ALL 11 CATEGORIES STATS"}
      >
        <div className="max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-2 my-2 no-scrollbar">
          {games.map((g) => (
            <div
              key={g.key}
              onClick={() => {
                setIsStatsModalOpen(false);
                handleGameSelect(g.key);
              }}
              className="flex items-center justify-between p-3 bg-[#121118] border border-[#FF6B00]/30 hover:border-[#FF6B00] cursor-pointer transition-all rounded-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 border border-[#FF6B00]/40 bg-[#0c0e12] flex items-center justify-center rounded-none overflow-hidden flex-shrink-0">
                  {g.image ? (
                    <img src={g.image} alt={g.name} className="w-full h-full object-cover" />
                  ) : (
                    <Gamepad2 className="w-4 h-4 text-[#FF6B00]" />
                  )}
                </div>
                <div>
                  <p className="font-extrabold text-white text-xs uppercase tracking-wide">{g.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isUz ? 'Mavjud xizmat' : 'Available service'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#FF6B00] bg-[#FF6B00]/10 px-2 py-1 border border-[#FF6B00]/30">
                  DONAT OLISH ➔
                </span>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

export default Home;
