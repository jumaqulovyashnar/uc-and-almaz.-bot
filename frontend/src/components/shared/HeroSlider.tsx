import React, { useState, useEffect, useRef } from 'react';

interface Slide {
  id: number;
  imageUrl: string;
  title: string;
  subtitle: string;
}

interface HeroSliderProps {
  slides: Slide[];
  autoPlayInterval?: number;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  slides,
  autoPlayInterval = 3000,
}) => {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = slides.length;

  const startAutoPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, autoPlayInterval);
  };

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoPlayInterval, total]);

  const handleDotClick = (index: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrent(index);
    startAutoPlay();
  };

  return (
    /* aspect-video = 16/9, rasmlar to'liq ko'rinadi */
    <div className="relative w-full overflow-hidden rounded-b-sm bg-black" style={{ height: '220px' }}>
      {/* Slides strip */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="relative min-w-full h-full flex-shrink-0 bg-black">
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="w-full h-full"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              draggable={false}
            />
            {/* bottom gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
            {/* Text overlay */}
            <div className="absolute bottom-0 left-0 p-4">
              <h2 className="text-white font-black text-xl drop-shadow-lg leading-tight">
                {slide.title}
              </h2>
              {slide.subtitle && (
                <p className="text-gray-200 text-xs mt-0.5 drop-shadow-md">
                  {slide.subtitle}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-3 right-4 flex gap-1.5 items-center">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDotClick(i)}
            className={`transition-all duration-300 rounded-full ${
              i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <div
          key={current}
          className="h-full bg-gradient-to-r from-cyber-purple to-cyber-cyan"
          style={{ animation: `slideProgress ${autoPlayInterval}ms linear` }}
        />
      </div>

      <style>{`
        @keyframes slideProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default HeroSlider;
