import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CategoryTabs } from '../components/shared/CategoryTabs';
import { PackageCard } from '../components/shared/PackageCard';
import { pubgPackages } from '../data/packages';
import { useStore } from '../store/useStore';
import type { CategoryType } from '../types';

const PurchasePUBG: React.FC = () => {
  const navigate = useNavigate();
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleVerify = () => {
    if (!playerId) return;
    
    // Zod-matching regex check: only numbers, 5-12 digits
    const pubgRegex = /^\d{5,12}$/;
    if (!pubgRegex.test(playerId)) {
      setError(
        isUz
          ? "PUBG Player ID faqat 5-12 ta raqamdan iborat bo'lishi kerak (M-n: 5123456789)"
          : 'PUBG Player ID must be 5-12 digits of numbers (e.g. 5123456789)'
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

  const handleCategoryChange = (category: CategoryType) => {
    setCategory(category);
    setPackage(null);
  };

  const filteredPackages = pubgPackages.filter(
    (p) => p.category === selectedCategory
  );

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US').replace(/,/g, ',');
  };

  return (
    <div className="min-h-screen bg-cyber-bg pb-24">
      {/* Top section with banner */}
      <div className="relative animate-fade-in">
        {/* Back button */}
        <button
          onClick={() => navigate('/home')}
          className="absolute top-4 left-4 z-10 bg-black/30 rounded-full p-2 hover:bg-black/50 transition-colors"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Header banner */}
        <div className="h-32 bg-gradient-to-br from-orange-950 via-amber-950 to-cyber-bg rounded-b-3xl flex items-end p-5">
          <div>
            <h1 className="text-2xl font-black text-white">PUBG MOBILE</h1>
            <p className="text-xs text-gray-400 mt-1">🎮 UC & {isUz ? 'Propuski' : 'Passes'}</p>
          </div>
        </div>
      </div>

      {/* Player ID section */}
      <div className="px-4 mt-4 animate-fade-in">
        <Card>
          <p className="text-sm font-black text-white mb-2">
            {isUz ? "O'yinchi ID" : 'Player ID'}
          </p>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                placeholder={isUz ? "ID raqamini kiriting..." : "Enter ID number..."}
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
              className="py-3 px-4 font-bold"
              onClick={handleVerify}
              disabled={!playerId || verifyLoading}
            >
              {verifyLoading ? (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </span>
              ) : (
                isUz ? 'Tekshirish' : 'Verify'
              )}
            </Button>
          </div>

          {/* Verification status */}
          {isVerified && playerNickname && (
            <div className="mt-3 bg-green-950/20 border border-green-500/20 rounded-lg px-3 py-2 animate-slide-up">
              <p className="text-xs text-green-400 font-medium">✅ {playerNickname}</p>
            </div>
          )}
          {!isVerified && playerId && !verifyLoading && (
            <p className="text-xs text-gray-500 mt-2">
              {isUz ? "Tugmani bosib ID ni tekshiring" : "Click button to verify ID"}
            </p>
          )}
        </Card>
      </div>

      {/* Category tabs */}
      <div className="px-4 mt-5">
        <CategoryTabs
          activeCategory={selectedCategory}
          onChange={handleCategoryChange}
          tabs={[
            { id: 'almazar', label: isUz ? 'Paketlar' : 'Packages' },
            { id: 'propuski', label: isUz ? "To'plamlar" : 'Bundles' },
          ]}
        />
      </div>

      {/* Package grid */}
      <div className="px-4 mt-2">
        <div
          className={
            selectedCategory === 'almazar'
              ? 'grid grid-cols-2 gap-3'
              : 'grid grid-cols-1 gap-3'
          }
        >
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

      {/* Fixed bottom purchase bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-cyber-bg/85 backdrop-blur-xl border-t border-cyber-border p-4 animate-fade-in">
        {selectedPackage ? (
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500 font-medium">{isUz ? 'Tanlangan:' : 'Selected:'}</p>
              <p className="text-white font-bold text-sm">{selectedPackage.name}</p>
            </div>
            <p className="text-cyber-purple font-black">
              {formatPrice(selectedPackage.price)} so'm
            </p>
          </div>
        ) : (
          <p className="text-gray-500 text-xs font-semibold text-center mb-3">
            {isUz ? 'Paketni tanlang' : 'Choose a package'}
          </p>
        )}
        <Button
          variant="primary"
          fullWidth
          disabled={!selectedPackage || !isVerified}
          onClick={() => navigate('/checkout')}
          className="font-black text-sm uppercase py-3"
        >
          {isUz ? 'SOTIB OLISH 🛒' : 'BUY NOW 🛒'}
        </Button>
      </div>
    </div>
  );
};

export default PurchasePUBG;
