import React from 'react';
import { Gem, Zap, LucideProps } from 'lucide-react';

interface CurrencyIconProps extends Omit<LucideProps, 'ref'> {
  type: 'pubg' | 'uc' | 'freefire' | 'diamond';
}

export const CurrencyIcon: React.FC<CurrencyIconProps> = ({ type, className = '', ...props }) => {
  const isPubg = type === 'pubg' || type === 'uc';

  if (isPubg) {
    return (
      <Zap
        className={`text-yellow-400 fill-yellow-400/20 ${className}`}
        {...props}
      />
    );
  }

  return (
    <Gem
      className={`text-cyan-400 fill-cyan-400/10 ${className}`}
      {...props}
    />
  );
};

export default CurrencyIcon;
