import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { createOrder, getOrderById, createPaylovCheckoutLink } from '../services/api';
import type { Order } from '../types';

function formatPrice(price: number): string {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Checkout() {
  const navigate = useNavigate();
  const {
    selectedGame,
    selectedPackage,
    playerId,
    playerNickname,
    language,
    serverId,
    clearCart,
  } = useStore();

  const isUz = language === 'uz';

  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check order status ONCE when createdOrder is set
  useEffect(() => {
    if (!createdOrder?.id) return;

    let isMounted = true;
    const checkOnce = async () => {
      try {
        const current = await getOrderById(String(createdOrder.id));
        if (isMounted && current && current.status !== 'pending' && current.status !== 'pending_payment') {
          clearCart();
          navigate('/orders');
        }
      } catch (e) {
        console.warn('[Checkout] Single order check failed:', e);
      }
    };

    checkOnce();
    return () => {
      isMounted = false;
    };
  }, [createdOrder?.id]);

  const handlePaylovRedirect = async (orderId: string | number) => {
    try {
      console.log('[Checkout] Requesting Paylov Link for order:', orderId);
      const res = await createPaylovCheckoutLink(String(orderId));
      console.log('[Checkout] Paylov Link response:', res);

      if (res?.success && res?.data?.checkoutUrl) {
        const url = res.data.checkoutUrl;
        console.log('[Checkout] Opening Paylov Hosted Link:', url);
        if ((window as any).Telegram?.WebApp?.openLink) {
          (window as any).Telegram.WebApp.openLink(url);
        } else {
          window.location.href = url;
        }
      } else {
        setError(res?.detail || (isUz ? "Paylov to'lov havolasini shakllantirishda xatolik" : "Error generating Paylov link"));
      }
    } catch (e: any) {
      console.error('[Checkout] handlePaylovRedirect error:', e);
      setError(e.message || (isUz ? "Paylov ulanishida xatolik" : "Paylov connection error"));
    }
  };

  const handleSubmit = async () => {
    if (!agreed || !selectedPackage || !selectedGame) return;

    setLoading(true);
    setError(null);
    try {
      const order = await createOrder({
        game: selectedGame,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        amount: selectedPackage.amount,
        price: selectedPackage.price,
        playerId,
        playerNickname,
        paymentMethod: 'uzcard',
        serverId: serverId || undefined
      });
      setCreatedOrder(order);
    } catch (err: any) {
      console.error('[Checkout] handleSubmit error:', err);
      setError(err.message || (isUz ? "Buyurtma yaratishda xatolik yuz berdi" : "Error creating order"));
    } finally {
      setLoading(false);
    }
  };

  const price = selectedPackage?.price || 0;
  const gameName = selectedGame ? selectedGame.replace(/-buykos/gi, '').replace(/-cis-new/gi, '').replace(/-/g, ' ').toUpperCase() : 'GAME';

  const handleBack = () => {
    if (selectedGame) {
      if (selectedGame === 'pubg-mobile-buykos' || selectedGame === 'pubg') {
        navigate('/purchase/pubg');
      } else if (selectedGame === 'free-fire-cis-new' || selectedGame === 'freefire') {
        navigate('/purchase/freefire');
      } else {
        navigate(`/purchase-game/${selectedGame}`);
      }
    } else {
      navigate('/home');
    }
  };

  if (createdOrder) {
    return (
      <div className="min-h-screen bg-cyber-bg px-4 pt-4 pb-8 animate-fade-in">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 bg-[#121118]/80 backdrop-blur-md border border-[#FF6B00] text-white hover:bg-[#FF6B00] hover:text-[#121118] px-3.5 py-1.5 font-black text-xs tracking-wider rounded-none shadow-[0_0_12px_rgba(255,107,0,0.35)] transition-all duration-300 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>{language === 'uz' ? 'ORQAGA' : 'BACK'}</span>
        </button>

        <h1 className="text-xl font-black text-white tracking-wide uppercase text-center">
          {isUz ? "To'lov ko'rsatmasi" : 'Payment Instructions'}
        </h1>

        <Card className="mt-6 py-7 px-6 min-h-[240px] flex flex-col justify-between border-2 border-[#FF6B00]/70 bg-[#121118]/95 shadow-[0_0_25px_rgba(255,107,0,0.25)]">
          <div>
            <p className="text-xs text-[#FF6B00] font-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
              ⚡ {isUz ? "Paylov Rasmiy Lahzalik To'lov" : "Paylov Official Instant Payment"}
            </p>

            <div className="space-y-2 text-xs text-gray-300 mb-4 font-mono">
              <p>{isUz ? "Buyurtma ID:" : "Order ID:"} <span className="text-white font-bold">#{createdOrder.id}</span></p>
              <p>{isUz ? "O'yin / Paket:" : "Game / Package:"} <span className="text-white font-bold">{createdOrder.packageName}</span></p>
              <p>{isUz ? "Player ID:" : "Player ID:"} <span className="text-white font-bold">{createdOrder.playerId}</span></p>
              <p>{isUz ? "Summa:" : "Amount:"} <span className="text-[#FF6B00] font-black text-sm">{formatPrice(createdOrder.price)} UZS</span></p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold text-center">
                {error}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => handlePaylovRedirect(createdOrder.id)}
            className="w-full block text-center py-4 px-4 bg-[#FF6B00] hover:bg-[#FFB300] disabled:bg-gray-600 text-black font-black text-sm tracking-wider uppercase rounded-none transition-all duration-200 shadow-[0_0_20px_rgba(255,107,0,0.4)] cursor-pointer mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/50 border-t-black rounded-full animate-spin mx-auto" />
            ) : (
              <span>{isUz ? "PAYLOV RASMIY TO'LOV OYNASIGA O'TISH ➔" : "OPEN PAYLOV PAYMENT PAGE ➔"}</span>
            )}
          </button>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6">
          {isUz ? "To'lov qilganingizdan so'ng order avtomatik yangilanadi." : "Your order will be automatically updated after payment."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-bg px-4 pt-4 pb-8">
      <button
        onClick={handleBack}
        className="mb-4 flex items-center gap-2 bg-[#121118]/80 backdrop-blur-md border border-[#FF6B00] text-white hover:bg-[#FF6B00] hover:text-[#121118] px-3.5 py-1.5 font-black text-xs tracking-wider rounded-none shadow-[0_0_12px_rgba(255,107,0,0.35)] transition-all duration-300 active:scale-95 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        <span>{language === 'uz' ? 'ORQAGA' : 'BACK'}</span>
      </button>

      <h1 className="text-2xl font-black text-white mt-4 tracking-wide uppercase animate-fade-in">
        {isUz ? "To'lov" : 'Checkout'}
      </h1>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-none text-red-400 text-xs font-bold">
          {error}
        </div>
      )}

      <div className="mt-5 animate-fade-in">
        <Card className="p-4 border-orange-500/40 bg-[#121118]/90">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-orange-500 uppercase tracking-widest font-black">
                {gameName}
              </span>
              <h3 className="text-lg font-black text-white mt-0.5">
                {selectedPackage?.name || '—'}
              </h3>
              <p className="text-xs text-gray-300 font-mono mt-1">
                ID: <span className="text-white font-bold">{playerId || '—'}</span>
                {serverId && ` (Server: ${serverId})`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-cyber-cyan">
                {formatPrice(price)} so'm
              </span>
              <p className="text-[10px] text-emerald-400 font-bold mt-1 uppercase tracking-wide">
                {isUz ? 'Avtomatik yetkazish' : 'Auto Delivery'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-3 animate-fade-in">
        <Button
          variant="ghost"
          size="none"
          onClick={() => setAgreed(!agreed)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            agreed
              ? 'bg-orange-500 border-orange-500 shadow-[0_0_8px_rgba(255,107,0,0.4)]'
              : 'border-gray-600 bg-transparent'
          }`}
        >
          {agreed && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </Button>
        <span className="text-xs text-gray-400 font-medium">
          {isUz ? "Xizmat shartlariga roziman" : "I agree to the terms of service"}
        </span>
      </div>

      {/* Total */}
      <div className="mt-6 flex justify-between items-center animate-fade-in">
        <span className="text-gray-400 text-sm font-semibold">{isUz ? 'Jami:' : 'Total:'}</span>
        <span className="text-2xl font-black bg-gradient-to-r from-orange-500 to-cyber-cyan bg-clip-text text-transparent tracking-wide">
          {formatPrice(price)} so'm
        </span>
      </div>

      {/* Submit button */}
      <div className="mt-5 animate-fade-in">
        <Button
          variant="primary"
          fullWidth
          size="lg"
          disabled={!agreed || loading || !selectedPackage}
          onClick={handleSubmit}
          className="font-black text-sm uppercase py-4 tracking-wider flex justify-center items-center gap-2 bg-[#FF6B00] hover:bg-[#FF8500] text-black shadow-[0_0_20px_rgba(255,107,0,0.4)]"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-black/50 border-t-black rounded-full animate-spin" />
          ) : (
            <span>{isUz ? "TO'LOV QILISH" : "PROCEED TO PAY"}</span>
          )}
        </Button>
      </div>
    </div>
  );
}
