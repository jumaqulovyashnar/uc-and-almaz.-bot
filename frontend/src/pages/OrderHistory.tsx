import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { OrderCard } from '../components/shared/OrderCard';
import type { Order } from '../types';
import useStore from '../store/useStore';

const mockOrders: Order[] = [
  {
    id: '1',
    game: 'pubg',
    packageName: '660 UC',
    amount: 660,
    price: 115000,
    playerId: '5847291036',
    playerNickname: 'ProGamer_036',
    status: 'completed' as const,
    paymentMethod: 'uzcard',
    createdAt: '2 soat oldin',
  },
  {
    id: '2',
    game: 'freefire',
    packageName: '520 Olmos',
    amount: 520,
    price: 55000,
    playerId: '9182736450',
    playerNickname: 'DiamondKing',
    status: 'processing' as const,
    paymentMethod: 'humo',
    createdAt: '5 soat oldin',
  },
  {
    id: '3',
    game: 'pubg',
    packageName: '1800 UC',
    amount: 1800,
    price: 300000,
    playerId: '3847562910',
    playerNickname: 'UCMaster',
    status: 'failed' as const,
    paymentMethod: 'visa',
    createdAt: '1 kun oldin',
  },
  {
    id: '4',
    game: 'freefire',
    packageName: '100 Olmos',
    amount: 100,
    price: 11000,
    playerId: '7463829150',
    playerNickname: 'FireStarter',
    status: 'completed' as const,
    paymentMethod: 'uzcard',
    createdAt: '2 kun oldin',
  },
];

type FilterType = 'all' | 'completed' | 'processing' | 'failed';

export default function OrderHistory() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { language } = useStore();

  const isUz = language === 'uz';

  const filters: { label: string; value: FilterType }[] = [
    { label: isUz ? 'Barchasi' : 'All', value: 'all' },
    { label: isUz ? 'Bajarildi' : 'Completed', value: 'completed' },
    { label: isUz ? 'Jarayonda' : 'Processing', value: 'processing' },
    { label: isUz ? 'Xatolik' : 'Failed', value: 'failed' },
  ];

  const filteredOrders =
    activeFilter === 'all'
      ? mockOrders
      : mockOrders.filter((order) => order.status === activeFilter);

  return (
    <div className="pt-20 pb-24 px-4 bg-cyber-bg min-h-screen">
      <Header />

      <h1 className="text-2xl font-black text-white mt-2 tracking-wide uppercase">
        {isUz ? 'Buyurtmalar Tarixi' : 'Order History'}
      </h1>

      {/* Filter tabs */}
      <div className="mt-5 flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 ${
              activeFilter === filter.value
                ? 'bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white shadow-lg'
                : 'bg-cyber-card text-gray-400 border border-cyber-border hover:text-gray-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Order list */}
      {filteredOrders.length > 0 ? (
        <div className="mt-5 flex flex-col gap-3">
          {filteredOrders.map((order, index) => (
            <div
              key={order.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <OrderCard order={order} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-4xl mb-3">😔</span>
          <span className="text-gray-500 text-sm font-medium">
            {isUz ? 'Buyurtmalar topilmadi' : 'No orders found'}
          </span>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
