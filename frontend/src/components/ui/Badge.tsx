import React from 'react';

interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info' | 'discount';
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ variant, children, className = '' }) => {
  const variantClasses: Record<string, string> = {
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    error: 'bg-red-500/20 text-red-400',
    info: 'bg-cyan-500/20 text-cyan-400',
    discount: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export default Badge;
