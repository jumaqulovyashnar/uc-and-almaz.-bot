import React from 'react';

interface InputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  name?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  placeholder,
  value,
  onChange,
  type = 'text',
  className = '',
  name,
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
      )}
      <div
        className={`
          flex items-center bg-cyber-bg border rounded-xl transition-all duration-200
          focus-within:border-cyber-purple focus-within:ring-1 focus-within:ring-cyber-purple/50
          ${error ? 'border-red-500' : 'border-cyber-border'}
        `}
      >
        {icon && <span className="pl-3 text-gray-500 flex-shrink-0">{icon}</span>}
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="bg-transparent text-white placeholder-gray-600 px-4 py-3 w-full outline-none rounded-xl"
        />
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
};

export { Input };
export default Input;

