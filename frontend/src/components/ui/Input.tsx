import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
  roundedClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', containerClassName = '', roundedClassName = 'rounded-none', ...props }, ref) => {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
        )}
        <div
          className={`
            flex items-center bg-cyber-bg border ${roundedClassName} transition-all duration-200
            focus-within:border-cyber-purple focus-within:ring-1 focus-within:ring-cyber-purple/50
            ${error ? 'border-red-500 animate-pulse-once' : 'border-cyber-border'}
            ${containerClassName}
          `}
        >
          {icon && <span className="pl-3 text-gray-500 flex-shrink-0">{icon}</span>}
          <input
            ref={ref}
            className={`bg-transparent text-white placeholder-gray-600 px-4 py-3 w-full outline-none ${roundedClassName}`}
            {...props}
          />
        </div>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
export default Input;
