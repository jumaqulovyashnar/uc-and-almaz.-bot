import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Gem, CheckCircle2, AlertTriangle, ShoppingCart, ArrowLeft, Flame } from 'lucide-react';
import { CategoryTabs } from '../components/shared/CategoryTabs';
import { PackageCard } from '../components/shared/PackageCard';
import { freeFirePackages } from '../data/packages';
import { useStore } from '../store/useStore';
import type { CategoryType, GamePackage } from '../types';
import { verifyPlayer, API_BASE } from '../services/api';
import frrrImg from '../assets/frrr.jpg';
import hh11Img from '../assets/hh11.avif';

// ─── Free Fire banner slides ──────────────────────────────────────────────────
const FF_SLIDES = [
  { id: 1, imageUrl: '/images/free.jpg' },
  { id: 2, imageUrl: frrrImg },
  { id: 3, imageUrl: hh11Img },
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
          <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
            <Gem className="w-3.5 h-3.5 text-cyan-400" />
            Olmos & Propuski
          </p>
        </div>
        {/* Dot indicators */}
        <div className="flex gap-1.5 items-center mb-1">
          {FF_SLIDES.map((_, i) => (
            <Button
              key={i}
              variant="ghost"
              size="none"
              onClick={() => goTo(i)}
              className={`transition-all duration-300 rounded-none ${
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
        const apiBase = API_BASE;
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
          ? "Free Fire ID 8-12 ta raqamdan iborat bo'lishi kerak"
          : 'Free Fire ID must be 8-12 digits'
      );
      setVerified(false);
      return;
    }
    setError(null);
    setVerifyLoading(true);
    try {
      const res = await verifyPlayer('freefire', playerId);
      if (res.valid) {
        setNickname(res.nickname);
        setVerified(true);
      } else {
        const errorCode = res.error_code || 'UNKNOWN';
        let errMsg = isUz ? "O'yinchi topilmadi yoki xatolik yuz berdi" : "Player not found or verification error";
        
        if (errorCode === 'CAPTCHA_TRIGGERED') {
          errMsg = isUz 
            ? "Xavfsizlik tekshiruvi (Captcha) tufayli ismni avtomatik aniqlab bo'lmadi. ID to'g'ri bo'lsa, xaridni davom ettiravering."
            : "Due to security check (Captcha), name could not be resolved. If ID is correct, feel free to proceed.";
        } else if (errorCode === 'INVALID_ID') {
          errMsg = isUz 
            ? "Bunaqa IDga ega player (o'yinchi) mavjud emas."
            : "No player exists with this ID.";
        } else if (errorCode === 'TIMEOUT') {
          errMsg = isUz 
            ? "Kutish vaqti tugadi (Tizim band). Qaytadan urining yoki to'g'ridan-to'g'ri xarid qiling."
            : "Request timed out. Please try again or proceed with the purchase directly.";
        } else if (res.error) {
          errMsg = res.error;
        }

        setError(errMsg);
        setVerified(false);
      }
    } catch (err) {
      console.error('[PurchaseFreeFire] Verification failed:', err);
      setError(
        isUz
          ? "Tizimga ulanishda xatolik yuz berdi (Tarmoq yoki CORS xatosi)"
          : "Connection error to the system (Network or CORS error)"
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
        {/* Back button */}
        <button
          onClick={() => navigate('/home')}
          className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-[#121118]/80 backdrop-blur-md border border-[#FF6B00] text-white hover:bg-[#FF6B00] hover:text-black px-3.5 py-1.5 font-black text-xs tracking-wider rounded-none shadow-[0_0_12px_rgba(255,107,0,0.35)] transition-all duration-300 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>{isUz ? 'ORQAGA' : 'BACK'}</span>
        </button>
        <FFBannerSlider />
      </div>

      {/* ── Section 02: SELECT PRODUCT ── */}
      <div className="px-4 mt-5 animate-fade-in">
        <div className="flex items-center mb-3">
          <span className="bg-[#FF6B00] text-white font-extrabold px-1.5 py-0.5 text-[10px] rounded-none">02</span>
          <span className="text-white font-black tracking-wider text-[11px] ml-2 uppercase">
            {isUz ? 'MAHSULOTNI TANLANG' : 'SELECT PRODUCT'}
          </span>
          <div className="flex-1 h-[1px] bg-white/10 ml-3" />
        </div>

        {/* Game Title Bar */}
        <div className="bg-[#121118] border-l-[3px] border-[#FF6B00] px-3.5 py-2.5 flex items-center gap-2 rounded-none mb-4">
          <Flame className="w-4 h-4 text-[#FF6B00]" />
          <span className="font-black text-white text-xs tracking-wider uppercase">Free Fire</span>
        </div>

        <CategoryTabs
          activeCategory={selectedCategory}
          onChange={handleCategoryChange}
          tabs={[
            { id: 'almazar', label: isUz ? 'Paketlar' : 'Packages' },
            { id: 'propuski', label: isUz ? 'Propuski' : 'Passes' },
            { id: 'levelup', label: isUz ? 'Level Up' : 'Level Up' },
          ]}
        />

        {/* ── Package vertical list ── */}
        <div className="flex flex-col gap-2.5 mt-4">
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

      {/* ── Section 03: ENTER DETAILS ── */}
      <div className="px-4 mt-8 animate-fade-in">
        <div className="flex items-center mb-4">
          <span className="bg-[#FF6B00] text-white font-extrabold px-1.5 py-0.5 text-[10px] rounded-none">03</span>
          <span className="text-white font-black tracking-wider text-[11px] ml-2 uppercase">
            {isUz ? "MA'LUMOTLARNI KIRIT" : "ENTER DETAILS"}
          </span>
          <div className="flex-1 h-[1px] bg-white/10 ml-3" />
        </div>

        {/* Selected package block styled as selected card */}
        {selectedPackage && (
          <div className="border border-[#FF6B00] bg-cyber-card px-4 py-4 flex justify-between items-center rounded-none mb-4 animate-fade-in w-full">
            <span className="font-extrabold text-white text-sm">{selectedPackage.name}</span>
            <div className="text-right">
              <span className="text-[#FF6B00] font-black text-sm">{formatPrice(selectedPackage.price)}</span>
              <span className="text-gray-400 text-[11px] font-semibold ml-1">so'm</span>
            </div>
          </div>
        )}

        {/* Player ID label and input */}
        <div className="mt-2">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">
            PLAYER ID
          </p>
          <Input
            placeholder={isUz ? 'ID raqamingiz...' : 'Enter player ID...'}
            value={playerId}
            error={error || undefined}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={11}
            roundedClassName="rounded-none"
            containerClassName="border-[#201E29] focus-within:border-[#FF6B00] focus-within:ring-[#FF6B00]/40"
            onChange={(e) => {
              setPlayerId(e.target.value.replace(/\D/g, ''));
              if (error) setError(null);
            }}
          />
        </div>

        {isVerified && playerNickname && (
          <div className="mt-2 bg-green-950/20 border border-green-500/20 px-3 py-2 animate-slide-up">
            <p className="text-xs text-green-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              {playerNickname}
            </p>
          </div>
        )}
        {error && (
          <div className="mt-2 bg-yellow-950/20 border border-yellow-500/20 px-3 py-2 animate-slide-up">
            <p className="text-xs text-yellow-400 font-semibold flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span>
                {isUz 
                  ? "Ismni avtomatik aniqlash imkoni bo'lmadi. ID to'g'riligiga ishonchingiz komil bo'lsa, xaridni davom ettirishingiz mumkin." 
                  : "Unable to retrieve name. If you are sure your ID is correct, you can proceed with the purchase."}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ── Fixed bottom buy bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-cyber-bg/90 backdrop-blur-xl border-t border-cyber-border p-4 pb-safe">
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
          <button
            disabled={!selectedPackage || !playerId}
            onClick={() => navigate('/checkout')}
            className="w-full rounded-none bg-[#FF6B00] hover:bg-[#E65C00] text-white font-black text-sm uppercase py-4 tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isUz ? 'DAVOM ETISH' : 'CONTINUE'}</span>
            <span className="text-base font-bold">➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseFreeFire;
