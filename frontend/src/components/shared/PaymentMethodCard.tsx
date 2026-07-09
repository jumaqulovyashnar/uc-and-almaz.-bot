import React from 'react';
import type { PaymentMethodType } from '../../types';

interface PaymentMethodCardProps {
  method: PaymentMethodType;
  selected: boolean;
  onSelect: (method: PaymentMethodType) => void;
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({ method, selected, onSelect }) => {
  const getColors = () => {
    switch (method) {
      case 'uzcard':
        return selected
          ? 'bg-blue-600/25 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
          : 'bg-cyber-card border-cyber-border hover:border-blue-500/40';
      case 'humo':
        return selected
          ? 'bg-emerald-600/25 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
          : 'bg-cyber-card border-cyber-border hover:border-emerald-500/40';
      case 'visa':
        return selected
          ? 'bg-amber-600/25 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
          : 'bg-cyber-card border-cyber-border hover:border-amber-500/40';
    }
  };

  const getLogo = () => {
    switch (method) {
      case 'uzcard':
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-blue-400 text-sm">UZ</span>
            <span className="font-light text-white text-sm">CARD</span>
          </div>
        );
      case 'humo':
        return (
          <div className="flex items-center gap-1">
            <span className="font-extrabold text-emerald-400 text-sm">HUMO</span>
          </div>
        );
      case 'visa':
        return (
          <div className="flex items-center gap-1">
            <span className="font-black italic text-amber-400 text-base">VISA</span>
          </div>
        );
    }
  };

  return (
    <div
      onClick={() => onSelect(method)}
      className={`
        flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 active:scale-98 select-none
        ${getColors()}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Radio dot */}
        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
          selected 
            ? method === 'uzcard' ? 'border-blue-500' : method === 'humo' ? 'border-emerald-500' : 'border-amber-500' 
            : 'border-gray-500'
        }`}>
          {selected && (
            <div className={`w-2 h-2 rounded-full ${
              method === 'uzcard' ? 'bg-blue-500' : method === 'humo' ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
          )}
        </div>

        {/* Brand Display */}
        {getLogo()}
      </div>

      <span className="text-[10px] text-gray-400 font-medium">
        {method === 'visa' ? 'Xalqaro to\'lov' : 'Milliy to\'lov'}
      </span>
    </div>
  );
};

export default PaymentMethodCard;
