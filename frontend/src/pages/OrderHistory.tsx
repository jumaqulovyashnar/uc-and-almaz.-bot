import { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { OrderCard } from '../components/shared/OrderCard';
import type { Order } from '../types';
import useStore from '../store/useStore';
import { getOrders } from '../services/api';

type FilterType = 'all' | 'completed' | 'processing' | 'failed' | 'pending';

export default function OrderHistory() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useStore();

  const isUz = language === 'uz';

  const filters: { label: string; value: FilterType }[] = [
    { label: isUz ? 'Barchasi' : 'All', value: 'all' },
    { label: isUz ? 'Bajarildi' : 'Completed', value: 'completed' },
    { label: isUz ? 'Jarayonda' : 'Processing', value: 'processing' },
    { label: isUz ? 'Kutilmoqda' : 'Pending', value: 'pending' },
    { label: isUz ? 'Xatolik' : 'Failed', value: 'failed' },
  ];

  useEffect(() => {
    let mounted = true;
    getOrders().then(data => {
      if (mounted) {
        setOrders(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const filteredOrders =
    activeFilter === 'all'
      ? orders
      : orders.filter((order) => order.status === activeFilter);

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
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-cyber-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length > 0 ? (
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
