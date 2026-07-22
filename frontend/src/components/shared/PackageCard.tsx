import React from 'react';
import type { GamePackage } from '../../types';
import CurrencyIcon from '../icons/CurrencyIcon';

interface PackageCardProps {
  pkg: GamePackage;
  isSelected: boolean;
  onClick: (pkg: GamePackage) => void;
}

export const PackageCard: React.FC<PackageCardProps> = ({ pkg, isSelected, onClick }) => {
  const formatPrice = (price: number): string => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const isPubg = pkg.game === 'pubg';

  return (
    <div
      onClick={() => onClick(pkg)}
      className={`
        relative overflow-hidden rounded-none p-4 cursor-pointer border transition-all duration-300 active:scale-95 flex flex-col justify-between h-[125px] select-none
        ${isSelected
          ? isPubg
            ? 'bg-[#FF6B00]/20 border-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.3)] scale-[1.02]'
            : 'bg-[#FFB300]/20 border-[#FFB300] shadow-[0_0_15px_rgba(255,179,0,0.3)] scale-[1.02]'
          : 'bg-cyber-card border-cyber-border hover:border-[#FF6B00]/40'
        }
      `}
    >
      {/* Icon/Decoration in corner */}
      <div className="absolute top-2.5 right-2.5 opacity-25">
        <CurrencyIcon type={isPubg ? 'uc' : 'diamond'} className="w-5 h-5" />
      </div>

      {/* Package Amount */}
      <div>
        <p className="text-lg font-black text-white tracking-wide">
          {pkg.amount} {isPubg ? 'UC' : ''}
        </p>
        <span className="text-[10px] text-gray-400 capitalize">
          {pkg.category === 'almazar' ? 'paket' : pkg.category}
        </span>
      </div>

      {/* Package Price */}
      <div className="flex items-center justify-between mt-2">
        <p className={`font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
          {formatPrice(pkg.price)} <span className="text-xs font-normal text-gray-400">so'm</span>
        </p>
        
        {pkg.discount !== undefined && pkg.discount > 0 && (
          <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-none animate-pulse">
            -{pkg.discount}%
          </span>
        )}

      </div>
    </div>
  );
};

export default PackageCard;
