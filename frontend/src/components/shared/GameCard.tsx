import React from 'react';
import { Gamepad2, Flame } from 'lucide-react';
import py12Img from '../../assets/py12.jpg';
import fr12Img from '../../assets/fr12.jpg';

interface GameCardProps {
  game: 'pubg' | 'freefire';
  packagesCount: number;
  onClick: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, packagesCount, onClick }) => {
  const isPubg = game === 'pubg';

  const bgImage = isPubg ? py12Img : fr12Img;

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-none border border-cyber-border cursor-pointer select-none bg-black transition-all duration-300 card-hover"
      style={{
        boxShadow: isPubg
          ? '0 0 15px rgba(255,107,0,0.15)'
          : '0 0 15px rgba(255,107,0,0.15)',
        height: '140px',
      }}
    >
      {/* Game Image Background */}
      <img
        src={bgImage}
        alt={isPubg ? 'PUBG MOBILE' : 'FREE FIRE'}
        className="absolute inset-0 w-full h-full object-cover opacity-75"
      />
      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10" />

      <div className="absolute inset-0 flex items-center justify-between px-5 z-20">
        {/* Left side */}
        <div>
          {/* Badge */}
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-none tracking-widest uppercase inline-flex items-center gap-1"
              style={{
                background: isPubg
                  ? 'rgba(255,107,0,0.25)'
                  : 'rgba(255,140,0,0.25)',
                border: isPubg
                  ? '1px solid rgba(255,107,0,0.5)'
                  : '1px solid rgba(255,140,0,0.5)',
                color: isPubg ? '#FF6B00' : '#ffaa40',
              }}
            >
              {isPubg ? (
                <>
                  <Gamepad2 className="w-3 h-3" />
                  PUBG MOBILE
                </>
              ) : (
                <>
                  <Flame className="w-3 h-3" />
                  FREE FIRE
                </>
              )}
            </span>
          </div>

          {/* Game name — always white/orange, never black */}
          <h3
            className="text-2xl font-black leading-tight tracking-wide drop-shadow-lg"
            style={{ color: isPubg ? '#ffffff' : '#FF6B00' }}
          >
            {isPubg ? 'UC Sotib\nOlish' : 'Olmos\nSotib Olish'}
          </h3>

          {/* Package count */}
          <p className="text-xs mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {packagesCount}+ xil paket mavjud
          </p>
        </div>

        {/* Right side — arrow button */}
        <div
          className="w-12 h-12 rounded-none flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{
            background: isPubg
              ? 'linear-gradient(135deg, #FF6B00, #E65C00)'
              : 'linear-gradient(135deg, #FFB300, #E6A200)',
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
            ? 'linear-gradient(90deg, transparent, #FF6B00, transparent)'
            : 'linear-gradient(90deg, transparent, #f97316, transparent)',
        }}
      />
    </div>
  );
};

export default GameCard;
