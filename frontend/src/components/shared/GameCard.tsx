import React from 'react';

interface GameCardProps {
  game: 'pubg' | 'freefire';
  packagesCount: number;
  onClick: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, packagesCount, onClick }) => {
  const isPubg = game === 'pubg';
  
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-5 cursor-pointer border transition-all duration-300 active:scale-95 group
        ${isPubg 
          ? 'bg-gradient-to-r from-purple-900/60 to-indigo-950/40 border-purple-500/20 hover:border-cyber-purple/50 hover:shadow-[0_0_20px_rgba(124,58,237,0.25)]' 
          : 'bg-gradient-to-r from-amber-900/60 to-red-950/40 border-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]'
        }
      `}
    >
      {/* Decorative glow in background */}
      <div 
        className={`
          absolute -right-10 -bottom-10 w-36 h-36 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-500 group-hover:scale-125
          ${isPubg ? 'bg-cyber-purple' : 'bg-amber-500'}
        `}
      />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isPubg ? 'bg-cyber-purple/20 text-cyber-purple-light border border-cyber-purple/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {isPubg ? 'Instant Delivery' : 'Fast Topup'}
            </span>
          </div>
          
          <h3 className="text-xl font-black mt-2 text-white tracking-wide uppercase group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300">
            {isPubg ? 'PUBG Mobile' : 'Free Fire'}
          </h3>
          
          <p className="text-xs text-gray-400 mt-1">
            {packagesCount} xil paketlar mavjud
          </p>
        </div>

        <div className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all duration-300 ${
          isPubg 
            ? 'bg-cyber-purple/10 border-cyber-purple/30 text-cyber-purple group-hover:bg-cyber-purple group-hover:text-white' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-500 group-hover:bg-amber-500 group-hover:text-white'
        }`}>
          <svg className="w-6 h-6 transform transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
