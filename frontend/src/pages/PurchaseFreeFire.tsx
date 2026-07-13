import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CategoryTabs } from '../components/shared/CategoryTabs';
import { PackageCard } from '../components/shared/PackageCard';
import { freeFirePackages } from '../data/packages';
import { useStore } from '../store/useStore';
import type { CategoryType, GamePackage } from '../types';

// ─── Free Fire banner slides ──────────────────────────────────────────────────
const FF_SLIDES = [
  { id: 1, imageUrl: '/images/free.jpg' },
  { id: 2, imageUrl: '/images/free1.webp' },
];

// ─── Banner Slider ────────────────────────────────────────────────────────────
const FFBannerSlider: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = FF_SLIDES.length;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total]);

  const goTo = (i: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent(i);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 5000);
  };

  return (
    <div className="relative w-full overflow-hidden bg-black" style={{ height: '220px' }}>
      {/* Slides strip */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {FF_SLIDES.map((slide) => (
          <div key={slide.id} className="relative min-w-full h-full flex-shrink-0 bg-black">
            <img
              src={slide.imageUrl}
              alt="Free Fire"
              className="w-full h-full"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          </div>
        ))}
      </div>

      {/* Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wider drop-shadow-lg">
            FREE FIRE
          </h1>
          <p className="text-xs text-gray-300 mt-0.5">💎 Olmos & Propuski</p>
        </div>
        {/* Dot indicators */}
        <div className="flex gap-1.5 items-center mb-1">
          {FF_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`transition-all duration-300 rounded-full ${
                i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <div
          key={current}
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400"
          style={{ animation: 'ffProgress 5s linear' }}
        />
      </div>

      <style>{`
        @keyframes ffProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const PurchaseFreeFire: React.FC = () => {
  const navigate = useNavigate();
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dynamicPackages, setDynamicPackages] = useState<GamePackage[]>([]);

  const {
    selectedCategory,
    selectedPackage,
    playerId,
    playerNickname,
    isVerified,
    language,
    setCategory,
    setPackage,
    setPlayerId,
    setNickname,
    setVerified,
  } = useStore();

  const isUz = language === 'uz';

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
        const res = await fetch(`${apiBase}/packages/freefire`);
        if (res.ok) {
          const json = await res.json();
          const pkgGroup = json?.data?.packages;
          if (pkgGroup) {
            const flatList: GamePackage[] = [];
            Object.keys(pkgGroup).forEach((category) => {
              pkgGroup[category].forEach((p: any) => {
                flatList.push({
                  id: String(p.id),
                  name: p.name,
                  amount: p.amount,
                  price: parseFloat(p.sell_price),
                  game: p.game as any,
                  category: p.category as any,
                });
              });
            });
            if (flatList.length > 0) {
              setDynamicPackages(flatList);
            }
          }
        }
      } catch (err) {
        console.error('[PurchaseFreeFire] Error fetching real-time packages:', err);
      }
    };
    fetchPackages();
  }, []);

  const handleVerify = async () => {
    if (!playerId) return;
    const ffRegex = /^\d{8,12}$/;
    if (!ffRegex.test(playerId)) {
      setError(
        isUz
          ? "Free Fire ID faqat 8-12 ta raqamdan iborat bo'lishi kerak"
          : 'Free Fire ID must be 8-12 digits of numbers'
      );
      setVerified(false);
      return;
    }
    setError(null);
    setVerifyLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
      const res = await fetch(`${apiBase}/verify-player`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game: 'freefire',
          player_id: playerId,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setNickname(json.data.nickname);
        setVerified(true);
      } else {
        setError(
          json.detail || (isUz ? "O'yinchi topilmadi yoki xatolik yuz berdi" : "Player not found or verification error")
        );
        setVerified(false);
      }
    } catch (err) {
      console.error('[PurchaseFreeFire] Verification failed:', err);
      setError(
        isUz
          ? "Tizimga ulanishda xatolik yuz berdi"
          : "Connection to validation server failed"
      );
      setVerified(false);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCategoryChange = (category: CategoryType) => {
    setCategory(category);
    setPackage(null);
  };

  // Use dynamic packages if loaded, otherwise fall back to static
  const currentPackages = dynamicPackages.length > 0 ? dynamicPackages : freeFirePackages;

  const filteredPackages = currentPackages.filter(
    (p) => p.category === selectedCategory
  );

  const formatPrice = (price: number) =>
    price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return (
    <div className="min-h-screen bg-cyber-bg pb-36">
      {/* ── Banner Slider ── */}
      <div className="relative">
        <button
          onClick={() => navigate('/home')}
          className="absolute top-3 left-3 z-20 bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-black/70 transition-colors"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <FFBannerSlider />
      </div>

      {/* ── Player ID ── */}
      <div className="px-4 mt-4 animate-fade-in">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
          PLAYER ID
        </p>
        <div className="bg-cyber-card border border-cyber-border rounded-2xl p-3.5 flex gap-2 items-start">
          <div className="flex-1">
            <Input
              placeholder={isUz ? 'ID raqamini kiriting...' : 'Enter ID number...'}
              value={playerId}
              error={error || undefined}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={12}
              onChange={(e) => {
                setPlayerId(e.target.value.replace(/\D/g, ''));
                if (error) setError(null);
              }}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            className="py-3 px-5 font-bold rounded-xl"
            onClick={handleVerify}
            disabled={!playerId || verifyLoading}
          >
            {verifyLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              isUz ? 'Tekshirish' : 'Verify'
            )}
          </Button>
        </div>

        {isVerified && playerNickname && (
          <div className="mt-2 bg-green-950/20 border border-green-500/20 rounded-xl px-3 py-2 animate-slide-up">
            <p className="text-xs text-green-400 font-semibold">✅ {playerNickname}</p>
          </div>
        )}
        {error && (
          <div className="mt-2 bg-yellow-950/20 border border-yellow-500/20 rounded-xl px-3 py-2 animate-slide-up">
            <p className="text-xs text-yellow-400 font-semibold">
              ⚠️ {isUz 
                ? "Ismni avtomatik aniqlash imkoni bo'lmadi. ID to'g'riligiga ishonchingiz komil bo'lsa, xaridni davom ettirishingiz mumkin." 
                : "Unable to retrieve name. If you are sure your ID is correct, you can proceed with the purchase."}
            </p>
          </div>
        )}
        {!isVerified && !error && playerId && !verifyLoading && (
          <p className="text-[10px] text-gray-500 mt-1.5 px-1">
            {isUz ? 'Tugmani bosib ID ni tekshiring' : 'Click button to verify ID'}
          </p>
        )}
      </div>

      {/* ── Category tabs ── */}
      <div className="px-4 mt-5">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
          {isUz ? 'MAHSULOTNI TANLANG' : 'SELECT PRODUCT'}
        </p>
        <CategoryTabs
          activeCategory={selectedCategory}
          onChange={handleCategoryChange}
          tabs={[
            { id: 'almazar', label: isUz ? 'Paketlar' : 'Packages' },
            { id: 'propuski', label: isUz ? 'Propuski' : 'Passes' },
            { id: 'levelup', label: isUz ? 'Level Up' : 'Level Up' },
          ]}
        />
      </div>

      {/* ── Package grid ── */}
      <div className="px-4 mt-2">
        <div className={selectedCategory === 'almazar' ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
          {filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              isSelected={selectedPackage?.id === pkg.id}
              onClick={() => setPackage(pkg)}
            />
          ))}
        </div>
      </div>

      {/* ── Fixed bottom buy bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-cyber-bg/90 backdrop-blur-xl border-t border-cyber-border p-4">
        {selectedPackage ? (
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-gray-500">{isUz ? 'Tanlangan:' : 'Selected:'}</p>
              <p className="text-white font-bold text-sm">{selectedPackage.name}</p>
            </div>
            <p className="text-cyber-purple font-black text-base">
              {formatPrice(selectedPackage.price)} <span className="text-xs font-normal text-gray-400">so'm</span>
            </p>
          </div>
        ) : null}
        <Button
          variant="primary"
          fullWidth
          disabled={!selectedPackage || !playerId}
          onClick={() => navigate('/checkout')}
          className="font-black text-sm uppercase py-4 rounded-2xl tracking-wider"
        >
          {isUz ? 'SOTIB OLISH 🛒' : 'BUY NOW 🛒'}
        </Button>
      </div>
    </div>
  );
};

export default PurchaseFreeFire;
