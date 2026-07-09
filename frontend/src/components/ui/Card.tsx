import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-cyber-card border border-cyber-border rounded-2xl p-4 animate-slide-up
        ${hover ? 'card-hover' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export { Card };
export default Card;

