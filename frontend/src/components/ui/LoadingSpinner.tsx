import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
}) => {
  const sizeClasses: Record<string, string> = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          border-4 border-cyber-border border-t-cyber-purple rounded-full animate-spin
          ${sizeClasses[size]}
        `}
      />
      {text && <p className="text-gray-400 text-sm mt-2">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
