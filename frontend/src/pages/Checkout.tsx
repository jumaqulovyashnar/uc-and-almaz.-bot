import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Copy, AlertTriangle, Check, ArrowLeft, CreditCard } from 'lucide-react';
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
    serverId,
    setPaymentMethod,
    clearCart,
  } = useStore();

  const isUz = language === 'uz';

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [userCardNumber, setUserCardNumber] = useState('');
  const [userCardExpire, setUserCardExpire] = useState('');

  const formatCardNumber = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatCardExpire = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

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

  // ── Card & Expire Date Regex Validation ──
  const EXPIRE_REGEX = /^(0[1-9]|1[0-2])\/([2-9][0-9])$/;

  const validateCardInputs = (): boolean => {
    if (paymentMethod === 'uzcard' || paymentMethod === 'humo') {
      const rawCard = userCardNumber.trim();
      const rawExpire = userCardExpire.trim();

      if (rawCard) {
        const digitsOnly = rawCard.replace(/\s/g, '');
        if (digitsOnly.length !== 16) {
          setError(isUz ? "Karta raqami 16 ta raqamdan iborat bo'lishi kerak!" : "Card number must be exactly 16 digits!");
          return false;
        }
        if (paymentMethod === 'uzcard' && !digitsOnly.startsWith('8600')) {
          setError(isUz ? "UZCARD karta raqami '8600' bilan boshlanishi kerak!" : "UZCARD number must start with '8600'!");
          return false;
        }
        if (paymentMethod === 'humo' && !digitsOnly.startsWith('9860')) {
          setError(isUz ? "HUMO karta raqami '9860' bilan boshlanishi kerak!" : "HUMO number must start with '9860'!");
          return false;
        }
      }

      if (rawExpire) {
        if (!EXPIRE_REGEX.test(rawExpire)) {
          setError(isUz ? "Amal qilish muddati noto'g'ri! Format: OO/YY (masalan: 12/28)" : "Invalid expiry date! Format: MM/YY (e.g. 12/28)");
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!paymentMethod || !agreed || !selectedPackage || !selectedGame) return;
    
    if (!validateCardInputs()) return;

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
        paymentMethod,
        serverId: serverId || undefined
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
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    
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
        
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">{isUz ? "To'lov qilish uchun vaqt:" : "Time left to pay:"}</p>
          <p className={`text-4xl font-black mt-2 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-cyber-cyan'}`}>
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
          </p>
        </div>

        <Card className="mt-6">
          {/* Paylov Direct Online Auto Payment */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <p className="text-xs text-[#FF6B00] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
              ⚡ {isUz ? "Avtomatik Lahzalik To'lov (Paylov)" : "Instant Auto Payment (Paylov)"}
            </p>
            <a
              href={`https://paylov.uz/pay?merchant_id=54321ec0-f607-50c1-a5e0-27665e715b15&amount=${createdOrder.price}&order_id=${createdOrder.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center py-3.5 px-4 bg-[#FF6B00] hover:bg-[#FFB300] text-black font-black text-sm tracking-wider uppercase rounded-none transition-all duration-200 shadow-[0_0_20px_rgba(255,107,0,0.4)]"
            >
              🚀 {isUz ? "Paylov orqali to'lash (Uzcard / Humo / Click)" : "Pay via Paylov (Uzcard / Humo / Click)"}
            </a>
            <p className="text-[10px] text-gray-400 mt-2 text-center font-medium">
              {isUz ? "To'lov bajarilishi bilan donat 0.1 sekundda avtomatik o'yinga tushadi." : "Donate will be automatically delivered in 0.1s after payment."}
            </p>
          </div>

          <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">
            {isUz ? "Yoki qo'lda kartaga o'tkazish (P2P):" : "Or manual card transfer (P2P):"}
          </p>
          <div 
            className="bg-black/30 p-4 rounded-none flex justify-between items-center cursor-pointer border border-white/5 hover:border-white/20 transition-all"
            onClick={() => copyToClipboard(PAYMENT_CARDS[paymentMethod || 'uzcard'])}
          >
            <span className="text-xl font-mono font-bold tracking-widest text-white">
              {PAYMENT_CARDS[paymentMethod || 'uzcard']}
            </span>
            <Copy className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
          </div>
          
          <p className="text-xs text-gray-400 mt-3 font-semibold">
            {isUz ? "Karta egasi:" : "Card holder:"} <span className="text-white font-bold">{CARD_HOLDERS[paymentMethod || 'uzcard']}</span>
          </p>

          <div className="mt-6 bg-red-500/10 border border-red-500/30 p-4 rounded-none">
            <p className="text-xs text-red-400 font-bold mb-2 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse flex-shrink-0" /> {isUz ? "Muhim!" : "Important!"}
            </p>
            <p className="text-sm text-white/90">
              {isUz ? "Ilovadan (Click, Payme, Uzum) to'lov qilayotganda izoh (kommentariya) qismiga faqatgina quydagini yozing:" : "When paying via your app (Click, Payme, Uzum) write exactly this in the comment:"}
            </p>
            <div 
              className="bg-red-500/20 p-3 rounded-none mt-3 flex justify-between items-center cursor-pointer hover:bg-red-500/30 transition-all"
              onClick={() => copyToClipboard(`#${createdOrder.id}`)}
            >
              <span className="text-2xl font-black text-red-400 font-mono tracking-widest">
                #{createdOrder.id}
              </span>
              <Copy className="w-5 h-5 text-red-400 hover:text-red-300 transition-colors" />
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
            icon={<Check className="w-4 h-4" />}
            className="font-black text-sm py-3.5 tracking-wider"
          >
            {isUz ? "Men to'lov qildim" : 'I have paid'}
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

      <div className="mt-6 animate-fade-in">
        <h2 className="text-xs font-black text-white uppercase tracking-widest mb-3">
          {isUz ? "To'lov usuli" : 'Payment Method'}
        </h2>
        <div className="grid grid-cols-2 gap-3">
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

        {/* Karta raqami va amal qilish muddati inputlari */}
        {(paymentMethod === 'uzcard' || paymentMethod === 'humo') && (
          <div className="mt-4 p-4 bg-[#121118] border border-orange-500/40 rounded-none animate-fade-in space-y-3.5 shadow-lg">
            <p className="text-xs font-black text-orange-500 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-orange-500 shrink-0" />
              <span>{isUz ? "Karta Ma'lumotlaringiz (Karta Raqami va Amal Qilish Muddati):" : "Your Card Details (Number & Expiry Date):"}</span>
            </p>
            
            <div>
              <label className="block text-xs text-gray-200 font-bold mb-1 tracking-wide">
                {isUz ? "Karta raqami (16 ta raqam):" : "Card Number (16 digits):"}
              </label>
              <input
                type="text"
                maxLength={19}
                placeholder={paymentMethod === 'uzcard' ? '8600 0000 0000 0000' : '9860 0000 0000 0000'}
                value={userCardNumber}
                onChange={(e) => setUserCardNumber(formatCardNumber(e.target.value))}
                className="w-full bg-black/70 border border-white/20 text-white font-black text-base font-mono p-3 rounded-none focus:border-orange-500 focus:bg-black/90 outline-none tracking-widest placeholder-gray-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-200 font-bold mb-1 tracking-wide">
                {isUz ? "Amal qilish muddati (OO/YY):" : "Expiry Date (MM/YY):"}
              </label>
              <input
                type="text"
                maxLength={5}
                placeholder="12/28"
                value={userCardExpire}
                onChange={(e) => setUserCardExpire(formatCardExpire(e.target.value))}
                className="w-full bg-black/70 border border-white/20 text-white font-black text-base font-mono p-3 rounded-none focus:border-orange-500 focus:bg-black/90 outline-none tracking-widest placeholder-gray-500 transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3 animate-fade-in">
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
