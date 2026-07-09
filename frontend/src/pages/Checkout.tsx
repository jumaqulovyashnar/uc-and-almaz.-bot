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
    setPaymentMethod,
    addOrder,
    clearCart,
  } = useStore();

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const overlaySteps = [
    'To\'lov tekshirilmoqda...',
    'Buyurtma yaratilmoqda...',
    'Muvaffaqiyatli! ✅',
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

  const handleSubmit = () => {
    if (!paymentMethod || !agreed || !cardNumber) return;
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
        <span className="text-sm">Ortga</span>
      </button>

      {/* Title */}
      <h1 className="text-xl font-bold text-white mt-2">Buyurtma</h1>

      {/* Order summary */}
      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{gameIcon}</span>
          <span className="text-white font-semibold">{gameName}</span>
        </div>

        <div className="h-px bg-cyber-border my-3" />

        <div className="flex justify-between text-sm py-1.5">
          <span className="text-gray-400">Paket:</span>
          <span className="text-white">{selectedPackage?.name || '—'}</span>
        </div>
        <div className="flex justify-between text-sm py-1.5">
          <span className="text-gray-400">O'yinchi ID:</span>
          <span className="text-white">{playerId || '—'}</span>
        </div>
        <div className="flex justify-between text-sm py-1.5">
          <span className="text-gray-400">Nickname:</span>
          <span className="text-white">{playerNickname || '—'}</span>
        </div>
        <div className="flex justify-between text-sm py-1.5">
          <span className="text-gray-400">Narxi:</span>
          <span className="text-cyber-cyan font-semibold">
            {formatPrice(price)} so'm
          </span>
        </div>
      </Card>

      {/* Payment method selection */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-white mb-3">
          To'lov usulini tanlang
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
                label="Karta raqami"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
              <div className="flex gap-3 mt-3">
                <Input
                  label="Amal qilish"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
                <Input
                  label="CVV"
                  placeholder="***"
                  type="password"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <Input
                label="Karta raqami"
                placeholder={
                  paymentMethod === 'uzcard'
                    ? '8600 0000 0000 0000'
                    : '9860 0000 0000 0000'
                }
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
              <div className="mt-3">
                <Input
                  label="Amal qilish muddati"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Terms checkbox */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setAgreed(!agreed)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            agreed
              ? 'bg-cyber-purple border-cyber-purple'
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
        <span className="text-sm text-gray-400">
          Xizmat shartlariga roziman
        </span>
      </div>

      {/* Total */}
      <div className="mt-6 flex justify-between items-center">
        <span className="text-gray-400">Jami:</span>
        <span className="text-2xl font-bold bg-gradient-to-r from-cyber-purple to-cyber-cyan bg-clip-text text-transparent">
          {formatPrice(price)} so'm
        </span>
      </div>

      {/* Submit button */}
      <div className="mt-4">
        <Button
          variant="primary"
          fullWidth
          size="lg"
          disabled={!paymentMethod || !agreed || !cardNumber}
          onClick={handleSubmit}
        >
          TO'LOV QILISH 💳
        </Button>
      </div>

      {/* Loading overlay */}
      <LoadingOverlay isVisible={showOverlay} steps={overlaySteps} currentStep={currentStep} />

    </div>
  );
}
