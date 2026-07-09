import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import PurchasePUBG from './pages/PurchasePUBG';
import PurchaseFreeFire from './pages/PurchaseFreeFire';
import Checkout from './pages/Checkout';
import OrderHistory from './pages/OrderHistory';
import Profile from './pages/Profile';
import Referrals from './pages/Referrals';

function AppContent() {
  const location = useLocation();

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
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
