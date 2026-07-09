import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { PaymentMethodCard } from '../components/shared/PaymentMethodCard';
import { useStore } from '../store/useStore';

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
    paymentMethod,
    language,
    setPaymentMethod,
    addOrder,
    clearCart,
  } = useStore();

  const isUz = language === 'uz';

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<{ cardNumber?: string; expiry?: string; cvv?: string }>({});

  const overlaySteps = [
    isUz ? "To'lov tekshirilmoqda..." : "Verifying payment...",
    isUz ? "Buyurtma yaratilmoqda..." : "Creating order...",
    isUz ? "Muvaffaqiyatli! ✅" : "Successful! ✅",
  ];

  useEffect(() => {
    if (!showOverlay) return;

    if (currentStep === 0) {
      const t = setTimeout(() => setCurrentStep(1), 2000);
      return () => clearTimeout(t);
    }
    if (currentStep === 1) {
      const t = setTimeout(() => setCurrentStep(2), 1500);
      return () => clearTimeout(t);
    }
    if (currentStep === 2) {
      const t = setTimeout(() => {
        addOrder({
          id: Date.now().toString(),
          game: selectedGame || 'pubg',
          packageName: selectedPackage?.name || '',
          amount: selectedPackage?.amount || 0,
          price: selectedPackage?.price || 0,
          playerId: playerId,
          playerNickname: playerNickname,
          status: 'completed',
          paymentMethod: paymentMethod || 'uzcard',
          createdAt: 'Hozir',
        });
        clearCart();
        navigate('/orders');
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [showOverlay, currentStep]);

  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    const limited = digits.substring(0, 16);
    const formatted = limited.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
    if (errors.cardNumber) {
      setErrors((prev) => ({ ...prev, cardNumber: undefined }));
    }
  };

  const handleExpiryChange = (val: string) => {
    const digits = val.replace(/[^\d/]/g, '');
    let formatted = digits.substring(0, 5);
    if (formatted.length === 2 && !formatted.includes('/') && val.length > expiry.length) {
      formatted = formatted + '/';
    }
    setExpiry(formatted);
    if (errors.expiry) {
      setErrors((prev) => ({ ...prev, expiry: undefined }));
    }
  };

  const handleCvvChange = (val: string) => {
    const digits = val.replace(/\D/g, '').substring(0, 4);
    setCvv(digits);
    if (errors.cvv) {
      setErrors((prev) => ({ ...prev, cvv: undefined }));
    }
  };

  const validateInputs = () => {
    const newErrors: typeof errors = {};
    const cleanCard = cardNumber.replace(/\s/g, '');

    if (paymentMethod === 'uzcard') {
      if (!/^8600\d{12}$/.test(cleanCard)) {
        newErrors.cardNumber = isUz 
          ? "Uzcard karta raqami noto'g'ri (8600 bilan boshlanishi va 16 raqam bo'lishi kerak)"
          : "Invalid Uzcard card number (must start with 8600 and be 16 digits)";
      }
    } else if (paymentMethod === 'humo') {
      if (!/^9860\d{12}$/.test(cleanCard)) {
        newErrors.cardNumber = isUz
          ? "Humo karta raqami noto'g'ri (9860 bilan boshlanishi va 16 raqam bo'lishi kerak)"
          : "Invalid Humo card number (must start with 9860 and be 16 digits)";
      }
    } else if (paymentMethod === 'visa') {
      if (!/^4\d{15}$/.test(cleanCard)) {
        newErrors.cardNumber = isUz
          ? "Visa karta raqami noto'g'ri (4 bilan boshlanishi va 16 raqam bo'lishi kerak)"
          : "Invalid Visa card number (must start with 4 and be 16 digits)";
      }
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      newErrors.expiry = isUz ? "Muddat noto'g'ri (MM/YY)" : "Invalid expiry format (MM/YY)";
    } else {
      const [mStr, yStr] = expiry.split('/');
      const m = parseInt(mStr, 10);
      const y = parseInt(yStr, 10);
      if (m < 1 || m > 12) {
        newErrors.expiry = isUz ? "Oy noto'g'ri (01-12)" : "Invalid month (01-12)";
      } else {
        const now = new Date();
        const curYear = now.getFullYear() % 100;
        const curMonth = now.getMonth() + 1;
        if (y < curYear || (y === curYear && m < curMonth)) {
          newErrors.expiry = isUz ? "Karta muddati tugagan" : "Card has expired";
        }
      }
    }

    if (paymentMethod === 'visa') {
      if (!/^\d{3,4}$/.test(cvv)) {
        newErrors.cvv = isUz ? "CVV noto'g'ri (3 yoki 4 raqam)" : "Invalid CVV (3 or 4 digits)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!paymentMethod || !agreed || !cardNumber) return;
    if (!validateInputs()) return;
    setShowOverlay(true);
    setCurrentStep(0);
  };

  const price = selectedPackage?.price || 0;
  const gameIcon = selectedGame === 'freefire' ? '💎' : '🎮';
  const gameName = selectedGame === 'freefire' ? 'FREE FIRE' : 'PUBG MOBILE';

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
          <PaymentMethodCard
            method="visa"
            selected={paymentMethod === 'visa'}
            onSelect={() => setPaymentMethod('visa')}
          />
        </div>
      </div>

      {/* Card input section */}
      {paymentMethod && (
        <div className="mt-4 animate-slide-up">
          {paymentMethod === 'visa' ? (
            <>
              <Input
                label={isUz ? "Karta raqami" : "Card Number"}
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                error={errors.cardNumber}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={19}
                onChange={(e) => handleCardNumberChange(e.target.value)}
              />
              <div className="flex gap-3 mt-3">
                <Input
                  label={isUz ? "Amal qilish" : "Expiry"}
                  placeholder="MM/YY"
                  value={expiry}
                  error={errors.expiry}
                  inputMode="numeric"
                  maxLength={5}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                />
                <Input
                  label="CVV"
                  placeholder="***"
                  type="password"
                  value={cvv}
                  error={errors.cvv}
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(e) => handleCvvChange(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <Input
                label={isUz ? "Karta raqami" : "Card Number"}
                placeholder={
                  paymentMethod === 'uzcard'
                    ? '8600 0000 0000 0000'
                    : '9860 0000 0000 0000'
                }
                value={cardNumber}
                error={errors.cardNumber}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={19}
                onChange={(e) => handleCardNumberChange(e.target.value)}
              />
              <div className="mt-3">
                <Input
                  label={isUz ? "Amal qilish muddati" : "Expiry Date"}
                  placeholder="MM/YY"
                  value={expiry}
                  error={errors.expiry}
                  inputMode="numeric"
                  maxLength={5}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      )}

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
          disabled={!paymentMethod || !agreed || !cardNumber}
          onClick={handleSubmit}
          className="font-black text-sm uppercase py-3.5 tracking-wider"
        >
          {isUz ? "TO'LOV QILISH 💳" : 'PAY NOW 💳'}
        </Button>
      </div>

      {/* Loading overlay */}
      <LoadingOverlay isVisible={showOverlay} steps={overlaySteps} currentStep={currentStep} />
    </div>
  );
}
