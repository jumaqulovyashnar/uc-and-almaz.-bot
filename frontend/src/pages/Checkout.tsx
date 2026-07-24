import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Copy, AlertTriangle, Check, ArrowLeft, CreditCard } from 'lucide-react';
import { PaymentMethodCard } from '../components/shared/PaymentMethodCard';
import { useStore } from '../store/useStore';
import { createOrder, getOrders, getOrderById, addPaylovCard, confirmPaylovCard, payWithPaylovSavedCard, paylovPaymentWithoutRegistration, paylovConfirmPaymentWithoutRegistration } from '../services/api';
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
  const [timeLeft, setTimeLeft] = useState(2 * 60); // 2 minutes
  const [userCardNumber, setUserCardNumber] = useState('');
  const [userCardExpire, setUserCardExpire] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [paylovCardId, setPaylovCardId] = useState<string | null>(null);
  const [paylovTxId, setPaylovTxId] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(60);

  useEffect(() => {
    let timer: any;
    if (showOtpModal && otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, otpTimer]);

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

  // Check order status ONLY ONCE when createdOrder is set (No repeated background polling)
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

  // ── Card & Expire Date Regex Validation ──
  const EXPIRE_REGEX = /^(0[1-9]|1[0-2])\/([2-9][0-9])$/;

  const validateCardInputs = (): boolean => {
    if (paymentMethod === 'uzcard' || paymentMethod === 'humo') {
      const rawCard = userCardNumber.replace(/\s/g, '');
      const rawExpire = userCardExpire.trim();

      if (rawCard.length !== 16) {
        setError(isUz ? "Karta raqami (16 xonali) to'liq kiritilishi kerak!" : "Card number must be exactly 16 digits!");
        return false;
      }
      if (paymentMethod === 'uzcard' && !rawCard.startsWith('8600')) {
        setError(isUz ? "UZCARD karta raqami '8600' bilan boshlanishi kerak!" : "UZCARD number must start with '8600'!");
        return false;
      }
      if (paymentMethod === 'humo' && !rawCard.startsWith('9860')) {
        setError(isUz ? "HUMO karta raqami '9860' bilan boshlanishi kerak!" : "HUMO number must start with '9860'!");
        return false;
      }
      if (!EXPIRE_REGEX.test(rawExpire)) {
        setError(isUz ? "Amal qilish muddati noto'g'ri! Format: OO/YY (masalan: 12/28)" : "Invalid expiry date! Format: MM/YY (e.g. 12/28)");
        return false;
      }
    }
    return true;
  };

  const buildPaylovCheckoutUrl = (amount: number, orderId: string | number): string => {
    const merchantId = '76345ec0-f509-49c1-a5e0-27665e715b13';
    const returnUrl = `${window.location.origin}/orders`;
    const queryStr = `merchant_id=${merchantId}&amount=${amount}&account.order_id=${orderId}&return_url=${encodeURIComponent(returnUrl)}`;
    const base64Query = btoa(unescape(encodeURIComponent(queryStr)));
    return `https://my.paylov.uz/checkout/create/${base64Query}`;
  };

  const openPaylovCheckout = (amount: number, orderId: string | number) => {
    const paylovUrl = buildPaylovCheckoutUrl(amount, orderId);
    const tg = (window as any)?.Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(paylovUrl);
    } else {
      window.location.href = paylovUrl;
    }
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
      console.error('[Checkout] handleSubmit error:', err);
      setError(err.message || (isUz ? "Buyurtma yaratishda xatolik yuz berdi" : "Error creating order"));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSmsOtp = async () => {
    if (!createdOrder) return;
    
    if (!validateCardInputs()) {
      setSmsError(isUz ? "Karta raqami va amal qilish muddatini to'liq kiriting!" : "Please enter complete card details!");
      return;
    }

    setSmsSending(true);
    setSmsError(null);
    try {
      console.log('[Paylov Direct Payment] Requesting SMS OTP for order:', createdOrder.id);
      const cardRes = await paylovPaymentWithoutRegistration(userCardNumber, userCardExpire, String(createdOrder.id));
      console.log('[Paylov Direct Payment] SMS OTP API Response:', cardRes);

      const txId = cardRes?.data?.transactionId || cardRes?.data?.result?.transactionId || cardRes?.result?.transactionId || cardRes?.transactionId;

      if (txId) {
        setPaylovTxId(txId);
      } else {
        const fallbackTxId = `paylov_tx_${createdOrder.id}_${Date.now()}`;
        setPaylovTxId(fallbackTxId);
      }
      setOtpTimer(60);
      setShowOtpModal(true);
    } catch (err: any) {
      console.error('[Paylov Direct Payment] Exception:', err);
      const fallbackTxId = `paylov_tx_${createdOrder.id}_${Date.now()}`;
      setPaylovTxId(fallbackTxId);
      setOtpTimer(60);
      setShowOtpModal(true);
    } finally {
      setSmsSending(false);
    }
  };

  const handleConfirmOtp = async () => {
    const cleanOtp = otpCode.trim();
    if (!createdOrder || (!paylovTxId && !paylovCardId) || !/^\d{6}$/.test(cleanOtp)) {
      setOtpError(isUz ? "6 xonali SMS kodni to'liq kiriting!" : "Enter complete 6-digit SMS code!");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      if (paylovTxId) {
        console.log(`[Paylov Direct Payment] Confirming OTP ${cleanOtp} for txId: ${paylovTxId}`);
        const confirmRes = await paylovConfirmPaymentWithoutRegistration(paylovTxId, cleanOtp, String(createdOrder.id));
        console.log('[Paylov Direct Payment] Confirm OTP Response:', confirmRes);

        if (confirmRes?.success || confirmRes?.data?.status === 'success' || confirmRes?.result?.status === 'success' || confirmRes?.data?.success) {
          console.log('[Paylov Direct Payment] OTP Confirmation SUCCESS! Redirecting to /orders');
          clearCart();
          setShowOtpModal(false);
          navigate('/orders');
        } else {
          const errDetail = confirmRes?.detail || confirmRes?.error?.message || confirmRes?.data?.error?.message || (isUz ? 'SMS kod noto\'g\'ri' : 'Invalid SMS OTP code');
          console.error('[Paylov Direct Payment] OTP Confirmation Failed:', errDetail);
          setOtpError(errDetail);
        }
      } else if (paylovCardId) {
        const confirmRes = await confirmPaylovCard(paylovCardId, cleanOtp);
        if (confirmRes?.error) {
          setOtpError(confirmRes.error.message || (isUz ? 'SMS kod noto\'g\'ri' : 'Invalid SMS OTP code'));
          setOtpLoading(false);
          return;
        }
        const payRes = await payWithPaylovSavedCard(String(createdOrder.id), paylovCardId);
        if (payRes?.success || payRes?.data?.success) {
          clearCart();
          setShowOtpModal(false);
          navigate('/orders');
        } else {
          setOtpError(payRes?.detail || payRes?.data?.detail || (isUz ? 'Kartadan pul yechishda xatolik' : 'Error processing card payment'));
        }
      }
    } catch (err: any) {
      setOtpError(err.message || (isUz ? 'OTP tasdiqlashda xatolik yuz berdi' : 'Error confirming OTP'));
    } finally {
      setOtpLoading(false);
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

    if (showOtpModal) {
      return (
        <div className="min-h-screen bg-cyber-bg px-4 pt-4 pb-8 animate-fade-in flex flex-col justify-between">
          <div>
            <button
              onClick={() => {
                setShowOtpModal(false);
                setOtpError(null);
                setOtpCode('');
              }}
              className="mb-4 flex items-center gap-2 bg-[#121118]/80 backdrop-blur-md border border-[#FF6B00] text-white hover:bg-[#FF6B00] hover:text-[#121118] px-3.5 py-1.5 font-black text-xs tracking-wider rounded-none shadow-[0_0_12px_rgba(255,107,0,0.35)] transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>{language === 'uz' ? 'ORQAGA' : 'BACK'}</span>
            </button>

            <div className="mt-4 text-center">
              <h1 className="text-xl font-black text-white tracking-wide uppercase">
                {isUz ? "SMS KODNI KIRITING" : "ENTER SMS OTP CODE"}
              </h1>
              <p className="text-xs text-gray-300 mt-2">
                {isUz ? "Karta egasining telefoniga yuborilgan 6 xonali SMS kodini kiriting:" : "Enter the 6-digit SMS OTP code sent to your phone:"}
              </p>
            </div>

            <Card className="mt-6 p-6 border-2 border-[#FF6B00]/70 bg-[#121118]/95 shadow-[0_0_30px_rgba(255,107,0,0.3)]">
              {/* Live SMS Countdown Timer */}
              <div className="text-center bg-black/70 border border-[#FF6B00]/50 p-3 text-xs">
                <span className="text-gray-400">{isUz ? "SMS kodi amal qilish vaqti: " : "SMS code validity time: "}</span>
                <span className={`font-black font-mono text-base ${otpTimer < 10 ? 'text-red-500 animate-pulse' : 'text-[#FF6B00]'}`}>
                  00:{otpTimer.toString().padStart(2, '0')}
                </span>
              </div>

              {otpError && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold text-center">
                  {otpError}
                </div>
              )}

              <div className="mt-6">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  autoFocus
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(val);
                    if (otpError) setOtpError(null);
                  }}
                  className="w-full bg-black border-2 border-[#FF6B00] text-[#FF6B00] font-mono font-black text-3xl py-4 text-center tracking-[0.5em] focus:border-[#FF6B00] outline-none placeholder-gray-800 shadow-inner"
                />
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  disabled={!/^\d{6}$/.test(otpCode) || otpLoading}
                  onClick={handleConfirmOtp}
                  className="w-full block text-center py-4 px-4 bg-[#FF6B00] hover:bg-[#FF8500] disabled:bg-gray-700 text-black font-black text-sm tracking-wider uppercase rounded-none transition-all duration-200 shadow-[0_0_20px_rgba(255,107,0,0.4)] cursor-pointer"
                >
                  {otpLoading ? (
                    <div className="w-5 h-5 border-2 border-black/50 border-t-black rounded-full animate-spin mx-auto" />
                  ) : (
                    <span>{isUz ? "TASDIQLASH VA TO'LASH" : "CONFIRM & PAY NOW"}</span>
                  )}
                </button>

                {otpTimer === 0 && (
                  <button
                    type="button"
                    onClick={handleRequestSmsOtp}
                    className="w-full text-center py-2 text-xs font-bold text-[#FF6B00] hover:underline cursor-pointer"
                  >
                    🔄 {isUz ? "SMS kod kelmadimi? Qayta yuborish" : "Didn't receive SMS? Resend code"}
                  </button>
                )}
              </div>
            </Card>
          </div>
        </div>
      );
    }

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
          <p className={`text-4xl font-black mt-2 ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-cyber-cyan'}`}>
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
          </p>
        </div>

        {/* Taller card with clean button (NO ICON) */}
        <Card className="mt-6 py-7 px-6 min-h-[240px] flex flex-col justify-between border-2 border-[#FF6B00]/70 bg-[#121118]/95 shadow-[0_0_25px_rgba(255,107,0,0.25)]">
          <div>
            <p className="text-xs text-[#FF6B00] font-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
              ⚡ {isUz ? "Paylov Rasmiy Lahzalik To'lov" : "Paylov Official Instant Payment"}
            </p>

            {userCardNumber && (
              <p className="text-xs text-gray-300 font-mono mb-4">
                {isUz ? "Karta:" : "Card:"} <span className="text-white font-bold">{userCardNumber}</span> ({userCardExpire})
              </p>
            )}

            {smsError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold text-center">
                {smsError}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={smsSending}
            onClick={handleRequestSmsOtp}
            className="w-full block text-center py-4 px-4 bg-[#FF6B00] hover:bg-[#FFB300] disabled:bg-gray-600 text-black font-black text-sm tracking-wider uppercase rounded-none transition-all duration-200 shadow-[0_0_20px_rgba(255,107,0,0.4)] cursor-pointer mt-4"
          >
            {smsSending ? (
              <div className="w-5 h-5 border-2 border-black/50 border-t-black rounded-full animate-spin mx-auto" />
            ) : (
              <span>{isUz ? "SMS YUBORISH" : "SEND SMS"}</span>
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
          <div className="mt-4 p-4 bg-[#14141f] border border-[#FF6B00]/30 rounded-none animate-fade-in space-y-4">
            <h3 className="text-xs font-black text-[#FF6B00] uppercase tracking-widest border-b border-white/10 pb-2">
              {isUz ? "KARTA MA'LUMOTLARI" : "CARD DETAILS"}
            </h3>
            
            <div>
              <label className="block text-[11px] text-gray-300 font-bold mb-1.5 uppercase tracking-wider">
                {isUz ? "Karta raqami:" : "Card Number:"}
              </label>
              <input
                type="text"
                maxLength={19}
                placeholder={paymentMethod === 'uzcard' ? '8600 0000 0000 0000' : '9860 0000 0000 0000'}
                value={userCardNumber}
                onChange={(e) => setUserCardNumber(formatCardNumber(e.target.value))}
                className="w-full bg-black/50 border border-white/15 text-white font-mono font-bold text-base p-3 rounded-none focus:border-[#FF6B00] focus:bg-black/80 outline-none tracking-widest placeholder-gray-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-300 font-bold mb-1.5 uppercase tracking-wider">
                {isUz ? "Amal qilish muddati (OO/YY):" : "Expiry Date (MM/YY):"}
              </label>
              <input
                type="text"
                maxLength={5}
                placeholder="12/28"
                value={userCardExpire}
                onChange={(e) => setUserCardExpire(formatCardExpire(e.target.value))}
                className="w-full bg-black/50 border border-white/15 text-white font-mono font-bold text-base p-3 rounded-none focus:border-[#FF6B00] focus:bg-black/80 outline-none tracking-widest placeholder-gray-600 transition-all"
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
          {isUz ? "SOTIB OLISH ➔" : 'BUY NOW ➔'}
        </Button>
      </div>

      {/* ── Paylov SMS OTP Modal ── */}
      {showOtpModal && createdOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#121118] border border-[#FF6B00] w-full max-w-md p-6 shadow-[0_0_30px_rgba(255,107,0,0.3)]">
            <h3 className="text-base font-black text-white uppercase tracking-wider text-center flex items-center justify-center gap-2">
              <span>📲</span>
              <span>{isUz ? "SMS KODNI KIRITING" : "ENTER SMS OTP CODE"}</span>
            </h3>
            <p className="text-xs text-gray-300 mt-2 text-center">
              {isUz ? "Karta egasining telefoniga yuborilgan 6 xonali SMS kodini kiriting:" : "Enter the 6-digit SMS OTP code sent to your phone:"}
            </p>

            {otpError && (
              <div className="mt-3 p-2.5 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold text-center">
                {otpError}
              </div>
            )}

            <div className="mt-4">
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-black/80 border border-[#FF6B00]/60 text-white font-mono font-black text-2xl p-3 text-center tracking-[0.5em] focus:border-[#FF6B00] focus:bg-black outline-none placeholder-gray-600 shadow-inner"
              />
            </div>

            <div className="mt-5 space-y-2">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                disabled={otpCode.length < 6 || otpLoading}
                onClick={handleConfirmOtp}
                className="font-black text-sm uppercase py-3.5 tracking-wider"
              >
                {otpLoading ? (
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  <span>⚡ {isUz ? "TASDIQLASH VA TO'LASH" : "CONFIRM & PAY NOW"}</span>
                )}
              </Button>

              <Button
                variant="ghost"
                fullWidth
                size="sm"
                onClick={() => setShowOtpModal(false)}
                className="text-gray-400 font-bold text-xs hover:text-white"
              >
                {isUz ? "Bekor qilish" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
