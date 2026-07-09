import React from 'react';
import type { GamePackage } from '../../types';

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
        relative overflow-hidden rounded-2xl p-4 cursor-pointer border transition-all duration-300 active:scale-95 flex flex-col justify-between h-[100px] select-none
        ${isSelected
          ? isPubg
            ? 'bg-cyber-purple/20 border-cyber-purple shadow-[0_0_15px_rgba(124,58,237,0.3)] scale-[1.02]'
            : 'bg-amber-500/20 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-[1.02]'
          : 'bg-cyber-card border-cyber-border hover:border-cyber-purple/40'
        }
      `}
    >
      {/* Icon/Decoration in corner */}
      <span className="absolute top-2 right-2 text-lg opacity-25">
        {isPubg ? '🪙' : '💎'}
      </span>

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
          <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-md animate-pulse">
            -{pkg.discount}%
          </span>
        )}

      </div>
    </div>
  );
};

export default PackageCard;
