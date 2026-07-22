import React, { useState } from 'react';
import { Gamepad2, Flame } from 'lucide-react';
import type { Order } from '../../types';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

interface OrderCardProps {
  order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const [expanded, setExpanded] = useState(false);

  const formatPrice = (price: number): string => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Bajarildi</Badge>;
      case 'processing':
        return <Badge variant="warning">Jarayonda</Badge>;
      case 'failed':
        return <Badge variant="error">Xatolik</Badge>;
      case 'pending':
        return <Badge variant="info">Kutilmoqda</Badge>;
    }
  };

  const isPubg = order.game === 'pubg';

  return (
    <Card 
      onClick={() => setExpanded(!expanded)} 
      className="mb-3 border-cyber-border hover:border-cyber-purple/30 transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-none flex items-center justify-center font-bold text-lg ${
            isPubg ? 'bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
          }`}>
            {isPubg ? <Gamepad2 className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {order.packageName}
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">
              ID: {order.playerId} • {order.createdAt}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-black text-white">
            {formatPrice(order.price)} so'm
          </p>
          <div className="mt-1 flex justify-end">
            {getStatusBadge(order.status)}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-3 border-t border-cyber-border/50 text-xs text-gray-300 space-y-2 animate-fade-in">
          <div className="flex justify-between">
            <span className="text-gray-400">O'yinchi taxallusi:</span>
            <span className="font-semibold text-white">{order.playerNickname || 'Noma\'lum'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">To'lov usuli:</span>
            <span className="font-semibold uppercase text-white">{order.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Tranzaksiya ID:</span>
            <span className="font-mono text-white/80">{order.id}</span>
          </div>
          {order.errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-none p-2.5 mt-2">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Xatolik sababi:</p>
              <p className="text-red-300/90 mt-0.5 text-[11px] leading-relaxed">{order.errorMessage}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default OrderCard;
