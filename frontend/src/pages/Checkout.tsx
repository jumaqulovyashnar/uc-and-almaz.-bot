import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PaymentMethodCard } from '../components/shared/PaymentMethodCard';
import { useStore } from '../store/useStore';
import { createOrder, getOrders } from '../services/api';
import type { Order } from '../types';

function formatPrice(price: number): string {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const PAYMENT_CARDS: Record<string, string> = {
  uzcard: '8600 1204 5678 9012',
  humo: '9860 1801 0950 0686',
};

const CARD_HOLDERS: Record<string, string> = {
  uzcard: 'Jumaqulov Y',
  humo: 'Jumaqulov Y',
};

export default function Checkout() {
  const navigate = useNavigate();
  const {
    selectedGame,
    selectedPackage,
    playerId,
    playerNickname,
    paymentMethod,
    language,
    setPaymentMethod,
    clearCart,
  } = useStore();

  const isUz = language === 'uz';

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes

  // Timer logic
  useEffect(() => {
    if (!createdOrder) return;
    if (timeLeft <= 0) return;

    const t = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(t);
  }, [createdOrder, timeLeft]);

  // Polling logic
  useEffect(() => {
    if (!createdOrder) return;

    const poll = async () => {
      const orders = await getOrders();
      const current = orders.find(o => String(o.id) === String(createdOrder.id));
      if (current && current.status !== 'pending_payment') {
        // Status changed!
        clearCart();
        navigate('/orders');
      }
    };

    const intervalId = setInterval(poll, 5000); // Poll every 5s
    return () => clearInterval(intervalId);
  }, [createdOrder, clearCart, navigate]);

  const handleSubmit = async () => {
    if (!paymentMethod || !agreed || !selectedPackage || !selectedGame) return;
    
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
        paymentMethod
      });
      setCreatedOrder(order);
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could show a toast here if you have a toast system
  };

  const price = selectedPackage?.price || 0;
  const gameIcon = selectedGame === 'freefire' ? '💎' : '🎮';
  const gameName = selectedGame === 'freefire' ? 'FREE FIRE' : 'PUBG MOBILE';

  if (createdOrder) {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    
    return (
      <div className="min-h-screen bg-cyber-bg px-4 pt-4 pb-8 animate-fade-in">
        <h1 className="text-xl font-black text-white mt-4 tracking-wide uppercase text-center">
          {isUz ? "To'lov ko'rsatmasi" : 'Payment Instructions'}
        </h1>
        
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">{isUz ? "To'lov qilish uchun vaqt:" : "Time left to pay:"}</p>
          <p className={`text-4xl font-black mt-2 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-cyber-cyan'}`}>
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
          </p>
        </div>

        <Card className="mt-6">
          <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">
            {isUz ? "Karta raqami (nusxa oling):" : "Card number (copy):"}
          </p>
          <div 
            className="bg-black/30 p-4 rounded-xl flex justify-between items-center cursor-pointer border border-white/5 hover:border-white/20 transition-all"
            onClick={() => copyToClipboard(PAYMENT_CARDS[paymentMethod || 'uzcard'])}
          >
            <span className="text-xl font-mono font-bold tracking-widest text-white">
              {PAYMENT_CARDS[paymentMethod || 'uzcard']}
            </span>
            <span className="text-xl">📋</span>
          </div>
          
          <p className="text-xs text-gray-400 mt-3 font-semibold">
            {isUz ? "Karta egasi:" : "Card holder:"} <span className="text-white font-bold">{CARD_HOLDERS[paymentMethod || 'uzcard']}</span>
          </p>

          <div className="mt-6 bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
            <p className="text-xs text-red-400 font-bold mb-2 uppercase tracking-wide flex items-center gap-2">
              <span className="animate-pulse">⚠️</span> {isUz ? "Muhim!" : "Important!"}
            </p>
            <p className="text-sm text-white/90">
              {isUz ? "Ilovadan (Click, Payme, Uzum) to'lov qilayotganda izoh (kommentariya) qismiga faqatgina quydagini yozing:" : "When paying via your app (Click, Payme, Uzum) write exactly this in the comment:"}
            </p>
            <div 
              className="bg-red-500/20 p-3 rounded-lg mt-3 flex justify-between items-center cursor-pointer hover:bg-red-500/30 transition-all"
              onClick={() => copyToClipboard(`#${createdOrder.id}`)}
            >
              <span className="text-2xl font-black text-red-400 font-mono tracking-widest">
                #{createdOrder.id}
              </span>
              <span className="text-xl">📋</span>
            </div>
            <p className="text-[10px] text-red-400 mt-2 font-semibold">
              {isUz ? "Aks holda to'lov avtomatik qabul qilinmaydi va pulingiz qaytarilmaydi!" : "Otherwise your payment will not be processed automatically and money will not be refunded!"}
            </p>
          </div>
        </Card>

        <div className="mt-6">
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={() => {
              clearCart();
              navigate('/orders');
            }}
            className="font-black text-sm py-3.5 tracking-wider"
          >
            {isUz ? "Men to'lov qildim ✅" : 'I have paid ✅'}
          </Button>
        </div>
        <p className="text-center text-xs text-gray-500 mt-4">
          {isUz ? "To'lov qilganingizdan so'ng order avtomatik yangilanadi." : "Your order will be automatically updated after payment."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-bg px-4 pt-4 pb-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        <span className="text-sm font-semibold">{isUz ? 'Ortga' : 'Back'}</span>
      </button>

      {/* Title */}
      <h1 className="text-xl font-black text-white mt-4 tracking-wide uppercase">
        {isUz ? 'Buyurtma' : 'Checkout'}
      </h1>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Order summary */}
      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{gameIcon}</span>
          <span className="text-white font-black tracking-wide">{gameName}</span>
        </div>

        <div className="h-px bg-cyber-border my-3" />

        <div className="flex justify-between text-xs py-1.5 font-medium">
          <span className="text-gray-400">{isUz ? 'Paket:' : 'Package:'}</span>
          <span className="text-white font-bold">{selectedPackage?.name || '—'}</span>
        </div>
        <div className="flex justify-between text-xs py-1.5 font-medium">
          <span className="text-gray-400">{isUz ? "O'yinchi ID:" : 'Player ID:'}</span>
          <span className="text-white font-mono font-bold">{playerId || '—'}</span>
        </div>
        <div className="flex justify-between text-xs py-1.5 font-medium">
          <span className="text-gray-400">Nickname:</span>
          <span className="text-white font-bold">{playerNickname || '—'}</span>
        </div>
        <div className="flex justify-between text-xs py-1.5 font-medium">
          <span className="text-gray-400">{isUz ? 'Narxi:' : 'Price:'}</span>
          <span className="text-cyber-cyan font-bold">
            {formatPrice(price)} so'm
          </span>
        </div>
      </Card>

      {/* Payment method selection */}
      <div className="mt-6 animate-fade-in">
        <h2 className="text-md font-black text-white mb-3 tracking-wide uppercase">
          {isUz ? "To'lov usulini tanlang" : 'Choose payment method'}
        </h2>
        <div className="flex flex-col gap-3">
          <PaymentMethodCard
            method="uzcard"
            selected={paymentMethod === 'uzcard'}
            onSelect={() => setPaymentMethod('uzcard')}
          />
          <PaymentMethodCard
            method="humo"
            selected={paymentMethod === 'humo'}
            onSelect={() => setPaymentMethod('humo')}
          />
        </div>
      </div>

      {/* Terms checkbox */}
      <div className="mt-5 flex items-center gap-3 animate-fade-in">
        <button
          onClick={() => setAgreed(!agreed)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            agreed
              ? 'bg-cyber-purple border-cyber-purple shadow-[0_0_8px_rgba(255,107,0,0.4)]'
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
        </button>
        <span className="text-xs text-gray-400 font-medium">
          {isUz ? "Xizmat shartlariga roziman" : "I agree to the terms of service"}
        </span>
      </div>

      {/* Total */}
      <div className="mt-6 flex justify-between items-center animate-fade-in">
        <span className="text-gray-400 text-sm font-semibold">{isUz ? 'Jami:' : 'Total:'}</span>
        <span className="text-2xl font-black bg-gradient-to-r from-cyber-purple to-cyber-cyan bg-clip-text text-transparent tracking-wide">
          {formatPrice(price)} so'm
        </span>
      </div>

      {/* Submit button */}
      <div className="mt-5 animate-fade-in">
        <Button
          variant="primary"
          fullWidth
          size="lg"
          disabled={!paymentMethod || !agreed || loading || !selectedPackage}
          onClick={handleSubmit}
          className="font-black text-sm uppercase py-3.5 tracking-wider flex justify-center items-center gap-2"
        >
          {loading && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
          {isUz ? "BUYURTMA BERISH" : 'PLACE ORDER'}
        </Button>
      </div>
    </div>
  );
}
