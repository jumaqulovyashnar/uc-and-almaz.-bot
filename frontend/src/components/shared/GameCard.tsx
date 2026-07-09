import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';

interface GameCardProps {
  game: 'pubg' | 'freefire';
  packagesCount: number;
  onClick: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, packagesCount, onClick }) => {
  const isPubg = game === 'pubg';
  
  return (
    <Card 
      hover 
      onClick={onClick}
      className={`cursor-pointer overflow-hidden relative border transition-all duration-300 active:scale-95 group ${
        isPubg 
          ? 'bg-gradient-to-r from-purple-900/40 to-indigo-950/20 hover:border-cyber-purple/50' 
          : 'bg-gradient-to-r from-amber-900/40 to-red-950/20 hover:border-amber-500/50'
      }`}
    >
      {/* Decorative background glow */}
      <div 
        className={`
          absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500 group-hover:scale-125
          ${isPubg ? 'bg-cyber-purple' : 'bg-amber-500'}
        `}
      />

      <div className="flex items-center justify-between p-5 relative z-10">
        <div>
          <h3 className="text-xl font-black text-white tracking-wide uppercase group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300">
            {isPubg ? 'PUBG Mobile' : 'Free Fire'}
          </h3>
          <p className="text-sm text-gray-400 mt-1 font-medium">
            {packagesCount} xil paketlar mavjud
          </p>
        </div>

        <div className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-300 ${
          isPubg 
            ? 'bg-cyber-purple/10 border-cyber-purple/30 text-cyber-purple group-hover:bg-cyber-purple group-hover:text-white' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-500 group-hover:bg-amber-500 group-hover:text-white'
        }`}>
          <svg className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>
    </Card>
  );
};

export default GameCard;
