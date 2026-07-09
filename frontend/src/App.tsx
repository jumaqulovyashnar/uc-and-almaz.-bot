import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import useStore from './store/useStore';

// Lazy loaded pages — har bir sahifa alohida chunk ga bo'linadi
const Welcome       = lazy(() => import('./pages/Welcome'));
const Home          = lazy(() => import('./pages/Home'));
const PurchasePUBG  = lazy(() => import('./pages/PurchasePUBG'));
const PurchaseFF    = lazy(() => import('./pages/PurchaseFreeFire'));
const Checkout      = lazy(() => import('./pages/Checkout'));
const OrderHistory  = lazy(() => import('./pages/OrderHistory'));
const Profile       = lazy(() => import('./pages/Profile'));
const Referrals     = lazy(() => import('./pages/Referrals'));
const AdminPanel    = lazy(() => import('./pages/AdminPanel'));

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

// Yuklanayotganda ko'rsatiladigan minimal spinner
function PageLoader() {
  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
      <div className="flex gap-2">
        <span className="w-2 h-2 rounded-full bg-cyber-purple animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-cyber-purple animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-cyber-purple animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const { setTelegramUser } = useStore();

  useEffect(() => {
    const initTelegramUser = async () => {
      try {
        const tg = (window as any)?.Telegram?.WebApp;
        const initData: string = tg?.initData ?? '';

        if (initData) {
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

        // Fallback: to'g'ridan-to'g'ri WebApp dan o'qish
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
        // jimgina o'tkazib yuboriladi
      }
    };

    initTelegramUser();
  }, [setTelegramUser]);

  return (
    <div className="min-h-screen bg-cyber-bg font-inter text-white">
      <Suspense fallback={<PageLoader />}>
        <div key={location.pathname} className="animate-fade-in">
          <Routes location={location}>
            <Route path="/"                    element={<Welcome />} />
            <Route path="/home"                element={<Home />} />
            <Route path="/purchase/pubg"       element={<PurchasePUBG />} />
            <Route path="/purchase/freefire"   element={<PurchaseFF />} />
            <Route path="/checkout"            element={<Checkout />} />
            <Route path="/orders"              element={<OrderHistory />} />
            <Route path="/profile"             element={<Profile />} />
            <Route path="/referrals"           element={<Referrals />} />
            <Route path="/admin"               element={<AdminPanel />} />
          </Routes>
        </div>
      </Suspense>
    </div>
  );
}

export default function App() {
  const { theme } = useStore();

  // Theme store da init bo'ladi, bu yerda faqat sinxronlash
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
