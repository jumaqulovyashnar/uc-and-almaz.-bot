import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PackageCard from '../components/shared/PackageCard';
import CategoryTabs from '../components/shared/CategoryTabs';
import useStore from '../store/useStore';
import { freeFirePackages } from '../data/packages';
import type { CategoryType } from '../types';


const PurchaseFreeFire: React.FC = () => {
  const navigate = useNavigate();
  const [verifyLoading, setVerifyLoading] = useState(false);

  const {
    selectedCategory,
    selectedPackage,
    playerId,
    playerNickname,
    isVerified,
    setCategory,
    setPackage,
    setPlayerId,
    setNickname,
    setVerified,
  } = useStore();

  const handleVerify = () => {
    if (!playerId) return;
    setVerifyLoading(true);
    setTimeout(() => {
      setNickname('ProGamer_' + playerId.slice(-3));
      setVerified(true);
      setVerifyLoading(false);
    }, 1500);
  };

  const handleCategoryChange = (category: CategoryType) => {
    setCategory(category);
    setPackage(null);
  };

  const filteredPackages = freeFirePackages.filter(
    (p) => p.category === selectedCategory
  );


  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US').replace(/,/g, ',');
  };

  return (
    <div className="min-h-screen bg-cyber-bg pb-24">
      {/* Top section with banner */}
      <div className="relative">
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
        <div className="h-32 bg-gradient-to-br from-orange-900 via-red-900 to-cyber-bg rounded-b-3xl flex items-end p-5">
          <div>
            <h1 className="text-2xl font-bold text-white">FREE FIRE</h1>
            <p className="text-sm text-gray-300 mt-1">💎 Olmos & Propuski</p>
          </div>
        </div>
      </div>

      {/* Player ID section */}
      <div className="px-4 mt-4 animate-fade-in">
        <Card>
          <p className="text-sm font-semibold text-white mb-2">O'yinchi ID</p>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                placeholder="ID raqamini kiriting..."
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
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
                'Tekshirish'
              )}
            </Button>
          </div>

          {/* Verification status */}
          {isVerified && playerNickname && (
            <div className="mt-3 bg-green-900/30 border border-green-500/30 rounded-lg px-3 py-2 animate-slide-up">
              <p className="text-sm text-green-400">✅ {playerNickname}</p>
            </div>
          )}
          {!isVerified && playerId && !verifyLoading && (
            <p className="text-xs text-gray-400 mt-2">ID ni tekshiring</p>
          )}
        </Card>
      </div>

      {/* Category tabs */}
      <div className="px-4 mt-4">
        <CategoryTabs
          activeCategory={selectedCategory}
          onChange={handleCategoryChange}
        />
      </div>

      {/* Package grid */}
      <div className="px-4 mt-4">
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
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-cyber-bg/80 backdrop-blur-xl border-t border-cyber-border p-4">
        {selectedPackage ? (
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-400">Tanlangan:</p>
              <p className="text-white font-semibold text-sm">{selectedPackage.name}</p>
            </div>
            <p className="text-cyber-purple font-bold">
              {formatPrice(selectedPackage.price)} so'm
            </p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center mb-3">Paketni tanlang</p>
        )}
        <Button
          variant="primary"
          fullWidth
          disabled={!selectedPackage || !isVerified}
          onClick={() => navigate('/checkout')}
        >
          SOTIB OLISH 🛒
        </Button>
      </div>
    </div>
  );
};

export default PurchaseFreeFire;
