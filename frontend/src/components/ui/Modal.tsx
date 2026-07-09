import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className={`
          bg-cyber-card rounded-t-3xl p-6 w-full max-w-md animate-slide-up
          border-t border-cyber-border relative
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull indicator */}
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Title */}
        {title && (
          <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
};

export default Modal;
