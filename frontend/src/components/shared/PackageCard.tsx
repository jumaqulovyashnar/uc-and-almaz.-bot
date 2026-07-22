import React from 'react';
import type { GamePackage } from '../../types';

interface PackageCardProps {
  pkg: GamePackage;
  isSelected: boolean;
  onClick: (pkg: GamePackage) => void;
}

export const PackageCard: React.FC<PackageCardProps> = ({ pkg, isSelected, onClick }) => {
  const formatPrice = (price: number): string => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const isPubg = pkg.game === 'pubg';

  return (
    <div
      onClick={() => onClick(pkg)}
      className={`
        flex justify-between items-center px-4 py-4 cursor-pointer border transition-all rounded-none w-full select-none
        ${isSelected
          ? 'bg-[#FF6B00]/15 border-[#FF6B00] shadow-[0_0_12px_rgba(255,107,0,0.3)]'
          : 'bg-cyber-card border-cyber-border hover:border-[#FF6B00]/40'
        }
      `}
    >
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-white text-sm">
          {pkg.name || `${pkg.amount} ${isPubg ? 'UC' : ''}`}
        </span>
        {pkg.discount !== undefined && pkg.discount > 0 && (
          <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-none">
            -{pkg.discount}%
          </span>
        )}
      </div>
      <div className="text-right">
        <span className="text-[#FF6B00] font-black text-sm">{formatPrice(pkg.price)}</span>
        <span className="text-gray-400 text-[11px] font-semibold ml-1">so'm</span>
      </div>
    </div>
  );
};

export default PackageCard;
