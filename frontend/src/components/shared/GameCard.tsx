import React from 'react';

interface GameCardProps {
  game: 'pubg' | 'freefire';
  packagesCount: number;
  onClick: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, packagesCount, onClick }) => {
  const isPubg = game === 'pubg';

  const bgImage = isPubg ? '/images/pubg.jpg' : '/images/free.jpg';

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-3xl cursor-pointer active:scale-[0.97] transition-transform duration-200 select-none"
      style={{ height: '140px' }}
    >
      {/* Background image */}
      <img
        src={bgImage}
        alt={isPubg ? 'PUBG' : 'Free Fire'}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover', objectPosition: 'center top' }}
        draggable={false}
      />

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: isPubg
            ? 'linear-gradient(135deg, rgba(10,5,30,0.82) 0%, rgba(80,20,120,0.45) 60%, rgba(0,0,0,0.1) 100%)'
            : 'linear-gradient(135deg, rgba(20,8,0,0.85) 0%, rgba(160,60,0,0.45) 60%, rgba(0,0,0,0.1) 100%)',
        }}
      />

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)',
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-between px-5">
        {/* Left side */}
        <div>
          {/* Badge */}
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase"
              style={{
                background: isPubg
                  ? 'rgba(180,80,255,0.25)'
                  : 'rgba(255,140,0,0.25)',
                border: isPubg
                  ? '1px solid rgba(180,80,255,0.5)'
                  : '1px solid rgba(255,140,0,0.5)',
                color: isPubg ? '#d580ff' : '#ffaa40',
              }}
            >
              {isPubg ? '🎮 PUBG MOBILE' : '🔥 FREE FIRE'}
            </span>
          </div>

          {/* Game name */}
          <h3 className="text-2xl font-black text-white leading-tight tracking-wide drop-shadow-lg">
            {isPubg ? 'UC Sotib\nOlish' : 'Olmos\nSotib Olish'}
          </h3>

          {/* Package count */}
          <p className="text-xs text-white/60 mt-1.5 font-medium">
            {packagesCount}+ xil paket mavjud
          </p>
        </div>

        {/* Right side — arrow button */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{
            background: isPubg
              ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
              : 'linear-gradient(135deg, #f97316, #ea580c)',
          }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>

      {/* Bottom border glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{
          background: isPubg
            ? 'linear-gradient(90deg, transparent, #a855f7, transparent)'
            : 'linear-gradient(90deg, transparent, #f97316, transparent)',
        }}
      />
    </div>
  );
};

export default GameCard;
