import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
  isVisible: boolean;
  steps?: string[];
  currentStep?: number;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  steps = [],
  currentStep = 0,
}) => {
  if (!isVisible) return null;

  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-cyber-bg/95 backdrop-blur-md flex flex-col">
      {/* Progress bar at top */}
      {steps.length > 0 && (
        <div className="w-full h-1 bg-cyber-border">
          <div
            className="h-full bg-gradient-to-r from-cyber-purple to-cyber-cyan transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <LoadingSpinner size="lg" />

        {/* Current step text */}
        {steps.length > 0 && steps[currentStep] && (
          <p
            key={currentStep}
            className="text-white text-base font-medium text-center animate-fade-in"
          >
            {steps[currentStep]}
          </p>
        )}

        {/* Step dots */}
        {steps.length > 1 && (
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${index === currentStep
                    ? 'bg-cyber-purple w-4'
                    : index < currentStep
                      ? 'bg-cyber-purple/50'
                      : 'bg-gray-600'
                  }
                `}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { LoadingOverlay };
export default LoadingOverlay;

