import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { pubgPackages } from '../data/packages';
import { useStore } from '../store/useStore';
import type { CategoryType, GamePackage } from '../types';

// ─── PUBG banner slides (infinity loop) ─────────────────────────────────────
const PUBG_SLIDES = [
  {
    id: 1,
    imageUrl: 'https://images.alphacoders.com/132/1326382.jpg',
  },
  {
    id: 2,
    imageUrl: 'https://images3.alphacoders.com/132/1320882.jpg',
  },
  {
    id: 3,
    imageUrl: 'https://images8.alphacoders.com/134/1345639.jpg',
  },
];

// ─── Mini Infinity Slider ────────────────────────────────────────────────────
const PubgBannerSlider: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = PUBG_SLIDES.length;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 3200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total]);

  const goTo = (i: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent(i);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 3200);
  };

  return (
    <div className="relative w-full h-44 overflow-hidden">
      {/* Slides strip */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {PUBG_SLIDES.map((slide) => (
          <div key={slide.id} className="relative min-w-full h-full flex-shrink-0">
            <img
              src={slide.imageUrl}
              alt="PUBG"
              className="w-full h-full object-cover object-center"
              draggable={false}
            />
            {/* dark gradient bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
        ))}
      </div>

      {/* PUBG MOBILE title overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wider drop-shadow-lg">
            PUBG MOBILE
          </h1>
          <p className="text-xs text-gray-300 mt-0.5">🎮 UC & To'plamlar</p>
        </div>
        {/* dot indicators */}
        <div className="flex gap-1.5 items-center mb-1">
          {PUBG_SLIDES.map((_, i) => (
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
          className="h-full bg-gradient-to-r from-cyber-purple to-cyber-cyan"
          style={{ animation: 'pubgProgress 3.2s linear' }}
        />
      </div>

      <style>{`
        @keyframes pubgProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
};

// ─── To'plamlar Card (matches screenshot design) ─────────────────────────────
interface ToplamlarCardProps {
  pkg: GamePackage;
  isSelected: boolean;
  onClick: (pkg: GamePackage) => void;
}

const ToplamlarCard: React.FC<ToplamlarCardProps> = ({ pkg, isSelected, onClick }) => {
  const formatPrice = (price: number) =>
    price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // Determine icon color by package tier
  const isMythic = pkg.name.toLowerCase().includes('mythic') || pkg.name.toLowerCase().includes('mifiche');
  const isPlus = pkg.name.includes('Plus');
  const isNabor = pkg.name.toLowerCase().includes('nabor') || pkg.name.toLowerCase().includes('weekly');

  const iconBg = isMythic
    ? 'from-red-700 to-red-900'
    : isNabor
    ? 'from-red-600 to-orange-800'
    : isPlus
    ? 'from-amber-600 to-yellow-800'
    : 'from-teal-600 to-emerald-800';

  const borderColor = isSelected
    ? 'border-cyber-purple shadow-[0_0_12px_rgba(124,58,237,0.35)] bg-cyber-purple/10'
    : 'border-cyber-border hover:border-cyber-purple/40 bg-cyber-card';

  return (
    <div
      onClick={() => onClick(pkg)}
      className={`relative flex items-center gap-3 rounded-2xl p-3 cursor-pointer border transition-all duration-200 active:scale-95 select-none ${borderColor}`}
    >
      {/* Icon box */}
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center flex-shrink-0 shadow-md`}>
        <span className="text-xl">{pkg.image ?? '📦'}</span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight truncate">{pkg.name}</p>
        <p className="text-xs text-cyber-purple font-semibold mt-0.5">
          {formatPrice(pkg.price)} so'm
        </p>
      </div>

      {/* Selected radio dot */}
      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all duration-200 ${
        isSelected
          ? 'border-cyber-purple bg-cyber-purple shadow-[0_0_6px_rgba(124,58,237,0.6)]'
          : 'border-gray-600'
      }`}>
        {isSelected && (
          <span className="w-full h-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </span>
        )}
      </div>

      {pkg.discount !== undefined && pkg.discount > 0 && (
        <span className="absolute top-1.5 right-8 text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-md">
          -{pkg.discount}%
        </span>
      )}
    </div>
  );
};

// ─── UC Package Card (2-column grid) ────────────────────────────────────────
interface UcCardProps {
  pkg: GamePackage;
  isSelected: boolean;
  onClick: (pkg: GamePackage) => void;
}

const UcCard: React.FC<UcCardProps> = ({ pkg, isSelected, onClick }) => {
  const formatPrice = (price: number) =>
    price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return (
    <div
      onClick={() => onClick(pkg)}
      className={`relative overflow-hidden rounded-2xl p-3.5 cursor-pointer border transition-all duration-200 active:scale-95 select-none flex flex-col justify-between h-[88px] ${
        isSelected
          ? 'bg-cyber-purple/15 border-cyber-purple shadow-[0_0_14px_rgba(124,58,237,0.3)]'
          : 'bg-cyber-card border-cyber-border hover:border-cyber-purple/40'
      }`}
    >
      <span className="absolute top-2 right-2 text-base opacity-20">🪙</span>
      <div>
        <p className="text-base font-black text-white">{pkg.amount} UC</p>
      </div>
      <p className={`text-xs font-bold ${isSelected ? 'text-cyber-purple' : 'text-gray-300'}`}>
        {formatPrice(pkg.price)} <span className="text-[10px] font-normal text-gray-500">so'm</span>
      </p>
      {isSelected && (
        <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-cyber-purple shadow-[0_0_6px_rgba(124,58,237,0.8)]" />
      )}
    </div>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────
type TabMode = 'avto' | 'toplamlar';

const PurchasePUBG: React.FC = () => {
  const navigate = useNavigate();
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabMode, setTabMode] = useState<TabMode>('avto');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('almazar');

  const {
    selectedPackage,
    playerId,
    playerNickname,
    isVerified,
    language,
    setPackage,
    setPlayerId,
    setNickname,
    setVerified,
  } = useStore();

  const isUz = language === 'uz';

  // UC packages (avto mode)
  const ucPackages = pubgPackages.filter((p) => p.category === 'almazar');
  // To'plamlar packages
  const toplamlarPackages = pubgPackages.filter((p) => p.category === 'toplamlar');

  const handleVerify = () => {
    if (!playerId) return;
    const pubgRegex = /^\d{5,12}$/;
    if (!pubgRegex.test(playerId)) {
      setError(
        isUz
          ? "PUBG Player ID faqat 5-12 ta raqamdan iborat bo'lishi kerak"
          : 'PUBG Player ID must be 5-12 digits'
      );
      setVerified(false);
      return;
    }
    setError(null);
    setVerifyLoading(true);
    setTimeout(() => {
      setNickname('ProGamer_' + playerId.slice(-4));
      setVerified(true);
      setVerifyLoading(false);
    }, 1500);
  };

  const handleTabChange = (mode: TabMode) => {
    setTabMode(mode);
    setPackage(null);
  };

  const formatPrice = (price: number) =>
    price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return (
    <div className="min-h-screen bg-cyber-bg pb-36">
      {/* ── Banner Slider ─────────────────────────────────── */}
      <div className="relative">
        {/* Back button */}
        <button
          onClick={() => navigate('/home')}
          className="absolute top-3 left-3 z-20 bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-black/70 transition-colors"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <PubgBannerSlider />
      </div>

      {/* ── Player ID ─────────────────────────────────────── */}
      <div className="px-4 mt-4 animate-fade-in">
        {/* Section label */}
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
          {isUz ? 'PLAYER ID' : 'PLAYER ID'}
        </p>
        <div className="bg-cyber-card border border-cyber-border rounded-2xl p-3.5 flex gap-2 items-start">
          <div className="flex-1">
            <Input
              placeholder={isUz ? 'Player ID ni kiriting...' : 'Enter Player ID...'}
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
        {!isVerified && playerId && !verifyLoading && (
          <p className="text-[10px] text-gray-500 mt-1.5 px-1">
            {isUz ? 'Tugmani bosib ID ni tekshiring' : 'Click button to verify ID'}
          </p>
        )}
      </div>

      {/* ── Product section ───────────────────────────────── */}
      <div className="px-4 mt-5">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
          {isUz ? 'MAHSULOTNI TANLANG' : 'SELECT PRODUCT'}
        </p>

        {/* Tab switcher: AVTO 24/7 | To'plamlar */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleTabChange('avto')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all duration-200 ${
              tabMode === 'avto'
                ? 'bg-cyber-card border border-cyber-border text-yellow-400'
                : 'bg-transparent border border-cyber-border/50 text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-yellow-400">✦</span>
            {isUz ? 'AVTO 24/7' : 'AUTO 24/7'}
          </button>
          <button
            onClick={() => handleTabChange('toplamlar')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all duration-200 ${
              tabMode === 'toplamlar'
                ? 'bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]'
                : 'bg-transparent border border-cyber-border/50 text-gray-500 hover:text-gray-300'
            }`}
          >
            📦 {isUz ? "To'plamlar" : 'Bundles'}
          </button>
        </div>

        {/* ── AVTO mode: UC packages in 2-col grid ── */}
        {tabMode === 'avto' && (
          <div className="grid grid-cols-2 gap-3">
            {ucPackages.map((pkg) => (
              <UcCard
                key={pkg.id}
                pkg={pkg}
                isSelected={selectedPackage?.id === pkg.id}
                onClick={() => setPackage(pkg)}
              />
            ))}
          </div>
        )}

        {/* ── To'plamlar mode: list cards ── */}
        {tabMode === 'toplamlar' && (
          <div className="grid grid-cols-2 gap-3">
            {toplamlarPackages.map((pkg) => (
              <ToplamlarCard
                key={pkg.id}
                pkg={pkg}
                isSelected={selectedPackage?.id === pkg.id}
                onClick={() => setPackage(pkg)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Fixed bottom buy bar ──────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-cyber-bg/90 backdrop-blur-xl border-t border-cyber-border p-4 pb-safe">
        {/* Welcome nav strip height compensation — 32px */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
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
          ) : (
            <p className="text-gray-500 text-xs font-semibold text-center mb-3">
              {isUz ? "Mahsulot tanlang" : 'Choose a product'}
            </p>
          )}
          <Button
            variant="primary"
            fullWidth
            disabled={!selectedPackage || !isVerified}
            onClick={() => navigate('/checkout')}
            className="font-black text-sm uppercase py-4 rounded-2xl tracking-wider"
          >
            {isUz ? 'SOTIB OLISH 🛒' : 'BUY NOW 🛒'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PurchasePUBG;
