import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Gamepad2, CheckCircle2, AlertTriangle, Package, Sparkles, ShoppingCart } from 'lucide-react';
import CurrencyIcon from '../components/icons/CurrencyIcon';
import { pubgPackages } from '../data/packages';
import { useStore } from '../store/useStore';
import type { CategoryType, GamePackage } from '../types';
import { verifyPlayer, API_BASE } from '../services/api';

// ─── PUBG banner slides (infinity loop) ─────────────────────────────────────
const PUBG_SLIDES = [
  { id: 1, imageUrl: '/images/pubg.jpg' },
  { id: 2, imageUrl: '/images/pubg1.webp' },
  { id: 3, imageUrl: '/images/pubg2.jpg' },
];

// ─── Mini Infinity Slider ────────────────────────────────────────────────────
const PubgBannerSlider: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = PUBG_SLIDES.length;

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
        {PUBG_SLIDES.map((slide) => (
          <div key={slide.id} className="relative min-w-full h-full flex-shrink-0 bg-black">
            <img
              src={slide.imageUrl}
              alt="PUBG"
              className="w-full h-full"
              style={{ objectFit: 'cover', objectPosition: 'center center' }}
              draggable={false}
            />
            {/* dark gradient bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          </div>
        ))}
      </div>

      {/* PUBG MOBILE title overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wider drop-shadow-lg">
            PUBG MOBILE
          </h1>
          <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
            <Gamepad2 className="w-3.5 h-3.5 text-orange-500" />
            UC & To'plamlar
          </p>
        </div>
        {/* dot indicators */}
        <div className="flex gap-1.5 items-center mb-1">
          {PUBG_SLIDES.map((_, i) => (
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
          className="h-full bg-gradient-to-r from-orange-500 to-cyber-cyan"
          style={{ animation: 'pubgProgress 5s linear' }}
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
    ? 'border-orange-500 shadow-[0_0_12px_rgba(255,107,0,0.35)] bg-orange-500/10'
    : 'border-cyber-border hover:border-orange-500/40 bg-cyber-card';

  return (
    <div
      onClick={() => onClick(pkg)}
      className={`relative flex items-center gap-3 rounded-none p-3 cursor-pointer border transition-all duration-200 select-none ${borderColor}`}
    >
      {/* Icon box */}
      <div className={`w-11 h-11 rounded-none bg-gradient-to-br ${iconBg} flex items-center justify-center flex-shrink-0 shadow-md`}>
        {pkg.image ? (
          <span className="text-xl">{pkg.image}</span>
        ) : (
          <Package className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight truncate">{pkg.name}</p>
        <p className="text-xs text-orange-500 font-semibold mt-0.5">
          {formatPrice(pkg.price)} so'm
        </p>
      </div>

      {/* Selected radio dot */}
      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all duration-200 ${
        isSelected
          ? 'border-orange-500 bg-orange-500 shadow-[0_0_6px_rgba(255,107,0,0.6)]'
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
      className={`relative overflow-hidden rounded-none p-3.5 cursor-pointer border transition-all duration-200 select-none flex flex-col justify-between h-[113px] ${
        isSelected
          ? 'bg-orange-500/15 border-orange-500 shadow-[0_0_14px_rgba(255,107,0,0.3)]'
          : 'bg-cyber-card border-cyber-border hover:border-orange-500/40'
      }`}
    >
      <div className="absolute top-2 right-2 opacity-20">
        <CurrencyIcon type="uc" className="w-5 h-5" />
      </div>
      <div>
        <p className="text-base font-black text-white">{pkg.amount} UC</p>
      </div>
      <p className={`text-xs font-bold ${isSelected ? 'text-orange-500' : 'text-gray-300'}`}>
        {formatPrice(pkg.price)} <span className="text-[10px] font-normal text-gray-500">so'm</span>
      </p>
      {isSelected && (
        <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(255,107,0,0.8)]" />
      )}
    </div>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────
const PurchasePUBG: React.FC = () => {
  const navigate = useNavigate();
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [dynamicPackages, setDynamicPackages] = useState<GamePackage[]>([]);

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

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const apiBase = API_BASE;
        const res = await fetch(`${apiBase}/packages/pubg`);
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
        console.error('[PurchasePUBG] Error fetching real-time packages:', err);
      }
    };
    fetchPackages();
  }, []);

  // Use dynamic packages if loaded, otherwise fall back to static
  const currentPackages = dynamicPackages.length > 0 ? dynamicPackages : pubgPackages;

  // UC packages (avto mode)
  const ucPackages = currentPackages.filter((p) => p.category === 'almazar');

  const handleVerify = async () => {
    if (!playerId) return;
    const pubgRegex = /^\d{8,12}$/;
    if (!pubgRegex.test(playerId)) {
      setError(
        isUz
          ? "PUBG Player ID 8-12 ta raqamdan iborat bo'lishi kerak"
          : 'PUBG Player ID must be 8-12 digits'
      );
      setVerified(false);
      return;
    }
    setError(null);
    setErrorCode(null);
    setVerifyLoading(true);
    try {
      const res = await verifyPlayer('pubg', playerId);
      if (res.valid) {
        setNickname(res.nickname);
        setVerified(true);
      } else {
        const errorCode = res.error_code || 'UNKNOWN';
        let errMsg: string;

        if (errorCode === 'INVALID_ID') {
          errMsg = isUz
            ? "Bunaqa IDga ega player (o'yinchi) mavjud emas."
            : "No player exists with this ID.";
        } else if (errorCode === 'CAPTCHA_TRIGGERED') {
          errMsg = isUz
            ? "Xavfsizlik tekshiruvi (Captcha) tufayli ismni avtomatik aniqlab bo'lmadi. ID to'g'ri bo'lsa, xaridni davom ettiravering."
            : "Security check (Captcha) prevented auto-verification. If your ID is correct, you may proceed.";
        } else if (errorCode === 'TIMEOUT') {
          errMsg = isUz
            ? "So'rov vaqti tugadi. Qaytadan urinib ko'ring yoki to'g'ridan-to'g'ri xarid qiling."
            : "Request timed out. Please retry or proceed with the purchase.";
        } else if (errorCode === 'RATE_LIMITED') {
          errMsg = isUz
            ? "Juda ko'p so'rov yuborildi. Bir oz kuting va qayta urining."
            : "Too many attempts. Please wait a moment and try again.";
        } else {
          errMsg = isUz
            ? "Tekshiruv xizmati vaqtincha ishlamayapti. Qaytadan urining yoki xaridni davom ettiring — ID va nickname qo'lda tasdiqlanadi."
            : "Verification service is temporarily unavailable. You may retry or proceed; your ID and nickname will be manually confirmed.";
        }

        setError(errMsg);
        setErrorCode(errorCode);
        setVerified(false);
      }
    } catch (err) {
      console.error('[PurchasePUBG] Verification failed:', err);
      setError(
        isUz
          ? "Tarmoq xatosi. Internet aloqangizni tekshiring va qaytadan urining."
          : "Network error. Please check your connection and try again."
      );
      setErrorCode('NETWORK_ERROR');
      setVerified(false);
    } finally {
      setVerifyLoading(false);
    }
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
          className="absolute top-3 left-3 z-20 bg-black/40 border border-white/20 text-gray-300 hover:text-white px-3 py-1.5 font-extrabold text-[11px] tracking-wider rounded-none transition-colors"
        >
          ◀ {isUz ? 'ORQAGA' : 'BACK'}
        </button>

        <PubgBannerSlider />
      </div>

      {/* ── Section 02: SELECT PRODUCT ────────────────────── */}
      <div className="px-4 mt-5 animate-fade-in">
        <div className="flex items-center mb-3">
          <span className="bg-[#c6f806] text-black font-extrabold px-1.5 py-0.5 text-[10px] rounded-none">02</span>
          <span className="text-white font-black tracking-wider text-[11px] ml-2 uppercase">
            {isUz ? 'PAKETNI TANLA' : 'SELECT PRODUCT'}
          </span>
          <div className="flex-1 h-[1px] bg-white/10 ml-3" />
        </div>

        {/* Game Title Bar */}
        <div className="bg-[#121118] border-l-[3px] border-[#c6f806] px-3.5 py-2.5 flex items-center gap-2 rounded-none mb-4">
          <span className="text-sm">🔫</span>
          <span className="font-black text-white text-xs tracking-wider uppercase">PUBG Mobile</span>
        </div>

        {/* ── UC packages in vertical list ── */}
        <div className="flex flex-col gap-2.5">
          {ucPackages.map((pkg) => (
            <UcCard
              key={pkg.id}
              pkg={pkg}
              isSelected={selectedPackage?.id === pkg.id}
              onClick={() => setPackage(pkg)}
            />
          ))}
        </div>
      </div>

      {/* ── Section 03: ENTER DETAILS ─────────────────────── */}
      <div className="px-4 mt-8 animate-fade-in">
        <div className="flex items-center mb-4">
          <span className="bg-[#c6f806] text-black font-extrabold px-1.5 py-0.5 text-[10px] rounded-none">03</span>
          <span className="text-white font-black tracking-wider text-[11px] ml-2 uppercase">
            {isUz ? "MA'LUMOTLARNI KIRIT" : "ENTER DETAILS"}
          </span>
          <div className="flex-1 h-[1px] bg-white/10 ml-3" />
        </div>

        {/* Selected package block styled as selected card */}
        {selectedPackage && (
          <div className="border border-[#c6f806] bg-cyber-card px-4 py-4 flex justify-between items-center rounded-none mb-4 animate-fade-in w-full">
            <span className="font-extrabold text-white text-sm">{selectedPackage.name}</span>
            <div className="text-right">
              <span className="text-[#c6f806] font-black text-sm">{formatPrice(selectedPackage.price)}</span>
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
            containerClassName="border-[#201E29] focus-within:border-[#c6f806] focus-within:ring-[#c6f806]/40"
            onChange={(e) => {
              setPlayerId(e.target.value.replace(/\D/g, ''));
              if (error) { setError(null); setErrorCode(null); }
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
          <div className={`mt-2 px-3 py-2 animate-slide-up border ${
            errorCode === 'INVALID_ID'
              ? 'bg-red-950/20 border-red-500/25'
              : 'bg-yellow-950/20 border-yellow-500/20'
          }`}>
            <p className={`text-xs font-semibold flex items-start gap-1.5 ${
              errorCode === 'INVALID_ID' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                errorCode === 'INVALID_ID' ? 'text-red-400' : 'text-yellow-400'
              }`} />
              <span>{error}</span>
            </p>
          </div>
        )}
      </div>

      {/* ── Fixed bottom buy bar ──────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-cyber-bg/90 backdrop-blur-xl border-t border-cyber-border p-4 pb-safe">
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {selectedPackage ? (
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] text-gray-500">{isUz ? 'Tanlangan:' : 'Selected:'}</p>
                <p className="text-white font-bold text-sm">{selectedPackage.name}</p>
              </div>
              <p className="text-orange-500 font-black text-base">
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
            className="w-full rounded-none bg-[#c6f806] hover:bg-[#b0dc05] active:scale-[0.99] text-black font-black text-sm uppercase py-4 tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isUz ? 'DAVOM ETISH' : 'CONTINUE'}</span>
            <span className="text-base font-bold">➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchasePUBG;
