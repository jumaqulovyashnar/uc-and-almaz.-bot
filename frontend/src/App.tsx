import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import useStore from './store/useStore';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import PurchasePUBG from './pages/PurchasePUBG';
import PurchaseFreeFire from './pages/PurchaseFreeFire';
import Checkout from './pages/Checkout';
import OrderHistory from './pages/OrderHistory';
import Profile from './pages/Profile';
import Referrals from './pages/Referrals';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function AppContent() {
  const location = useLocation();
  const { setTelegramUser } = useStore();

  useEffect(() => {
    const initTelegramUser = async () => {
      try {
        // 1. Try Telegram WebApp initData first
        const tg = (window as any)?.Telegram?.WebApp;
        const initData: string = tg?.initData ?? '';

        if (initData) {
          // Send to backend to validate + upsert user
          const res = await fetch(`${API_BASE}/auth/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
          });
          if (res.ok) {
            const json = await res.json();
            const user = json?.data?.user;
            if (user) {
              setTelegramUser({
                id: user.telegram_id ?? user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
              });
              return;
            }
          }
        }

        // 2. Fallback: read directly from Telegram WebApp (no backend call)
        if (tg?.initDataUnsafe?.user) {
          const u = tg.initDataUnsafe.user;
          setTelegramUser({
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            username: u.username,
          });
        }
      } catch {
        // silently ignore — "Mehmon" fallback will show
      }
    };

    initTelegramUser();
  }, [setTelegramUser]);

  return (
    <div className="min-h-screen bg-cyber-bg font-inter text-white">
      <div
        key={location.pathname}
        className="animate-fade-in"
      >
        <Routes location={location}>
          <Route path="/" element={<Welcome />} />
          <Route path="/home" element={<Home />} />
          <Route path="/purchase/pubg" element={<PurchasePUBG />} />
          <Route path="/purchase/freefire" element={<PurchaseFreeFire />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/referrals" element={<Referrals />} />
        </Routes>
      </div>
    </div>
  );
}


export default function App() {
  const { theme } = useStore();

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

