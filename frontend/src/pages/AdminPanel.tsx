import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import Button from '../components/ui/Button';
import { Gamepad2, Flame, Ban, BarChart3, ClipboardList, Settings, AlertTriangle, Frown, CheckCircle2, XCircle, RotateCw, Search } from 'lucide-react';

import { API_BASE } from '../services/api';
const ADMIN_ID = 6709001451;

// ─── Types ───────────────────────────────────────────────────────────────────
interface Stats {
  total_revenue: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  failed_orders: number;
  total_users: number;
  today_revenue: number;
  today_orders: number;
}

interface Order {
  id: number;
  game: string;
  package_name: string;
  amount: number;
  price: string;
  player_id: string;
  player_nickname: string | null;
  status: string;
  payment_method: string | null;
  created_at: string;
  screenshot_url?: string | null;
  error_message?: string | null;
}

interface BotStatus {
  status: string;
  database: string;
  redis: string;
  uptime: number;
  timestamp: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => n?.toLocaleString('uz-UZ') ?? '0';

const statusColor = (s: string) => {
  switch (s) {
    case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'pending':   return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'processing':return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'failed':    return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'awaiting_admin_review': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    default:          return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case 'completed':  return "Bajarildi";
    case 'pending':    return "Kutilmoqda";
    case 'processing': return "Jarayonda";
    case 'failed':     return "Xato";
    case 'awaiting_admin_review': return "Tekshiruv";
    default:           return s;
  }
};

const gameIcon = (g: string) => g === 'pubg' ? <Gamepad2 className="w-4 h-4 text-orange-500 inline-block" /> : <Flame className="w-4 h-4 text-orange-500 inline-block" />;

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}s ${m}d`;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string }> = ({
  label, value, sub, color = 'text-white'
}) => (
  <div className="bg-[#1a1a2e] border border-white/10 rounded-none p-4">
    <p className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold">{label}</p>
    <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
    {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { telegramUser, language } = useStore();

  const [tab, setTab] = useState<'stats' | 'orders' | 'system'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [retryingId, setRetryingId] = useState<number | null>(null);

  // Admin tekshiruv
  const isAdmin = telegramUser?.id === ADMIN_ID;
  const isUz = language === 'uz';

  const getHeaders = useCallback(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    return {
      'Content-Type': 'application/json',
      'x-telegram-init-data': tg?.initData ?? '',
    };
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) setStats(json.data.stats);
      else setError(json.error ?? 'Xato');
    } catch {
      setError("Server bilan bog'lanib bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '30', offset: '0' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API_BASE}/admin/orders?${params}`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) setOrders(json.data.orders);
      else setError(json.error ?? 'Xato');
    } catch {
      setError("Server bilan bog'lanib bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, [getHeaders, statusFilter]);

  const loadBotStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/bot-status`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) setBotStatus(json.data);
      else setError(json.error ?? 'Xato');
    } catch {
      setError("Server bilan bog'lanib bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const retryOrder = async (orderId: number) => {
    setRetryingId(orderId);
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/retry`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) await loadOrders();
      else setError(json.error ?? 'Retry xato');
    } catch {
      setError('Retry amalga oshmadi');
    } finally {
      setRetryingId(null);
    }
  };

  const approveOrder = async (orderId: number) => {
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/approve`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) await loadOrders();
      else setError(json.error ?? 'Approve xato');
    } catch {
      setError('Approve amalga oshmadi');
    }
  };

  const rejectOrder = async (orderId: number) => {
    const reason = window.prompt("Rad etish sababini kiriting:");
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason })
      });
      const json = await res.json();
      if (json.success) await loadOrders();
      else setError(json.error ?? 'Reject xato');
    } catch {
      setError('Reject amalga oshmadi');
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'stats')  loadStats();
    if (tab === 'orders') loadOrders();
    if (tab === 'system') loadBotStatus();
  }, [tab, isAdmin, loadStats, loadOrders, loadBotStatus]);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
  }, [statusFilter]);

  // ── Admin emas ──
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center px-6 text-center">
        <Ban className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-black text-white mb-2">Ruxsat yo'q</h2>
        <p className="text-sm text-gray-400 mb-6">Bu sahifaga faqat admin kirishi mumkin</p>
        <Button
          onClick={() => navigate('/home')}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-cyber-cyan rounded-none text-white font-bold text-sm"
        >
          Bosh sahifaga qaytish
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0d0d1a]/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="none"
          onClick={() => navigate('/home')}
          className="w-8 h-8 flex items-center justify-center rounded-none bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div>
          <h1 className="text-base font-black text-white tracking-wide">Admin Panel</h1>
          <p className="text-[10px] text-gray-500">ID: {telegramUser?.id}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400 font-semibold">ADMIN</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 mt-4 bg-white/5 mx-4 rounded-none p-1">
        {(['stats', 'orders', 'system'] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'primary' : 'ghost'}
            size="none"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-none text-xs font-black tracking-wide transition-all duration-200 ${
              tab !== t
                ? 'text-gray-400 hover:text-white'
                : ''
            }`}
          >
            {t === 'stats'  && <span className="flex items-center justify-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Stats</span>}
            {t === 'orders' && <span className="flex items-center justify-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Buyurtmalar</span>}
            {t === 'system' && <span className="flex items-center justify-center gap-1.5"><Settings className="w-3.5 h-3.5" /> Tizim</span>}
          </Button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-none px-4 py-3 mb-4 text-red-400 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="flex gap-2">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* ── STATS TAB ── */}
        {!loading && tab === 'stats' && stats && (
          <div className="space-y-3">
            {/* Today */}
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Bugungi</p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Bugungi daromad" value={`${fmt(stats.today_revenue)} so'm`} color="text-green-400" />
              <StatCard label="Bugungi buyurtma" value={stats.today_orders} color="text-blue-400" />
            </div>

            {/* Total */}
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-2">Jami</p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Jami daromad" value={`${fmt(stats.total_revenue)} so'm`} color="text-cyber-cyan" />
              <StatCard label="Jami buyurtmalar" value={stats.total_orders} />
              <StatCard label="Foydalanuvchilar" value={stats.total_users} color="text-orange-500" />
              <StatCard label="Kutilayotgan" value={stats.pending_orders} color="text-yellow-400" />
            </div>

            {/* Order status breakdown */}
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-2">Holat bo'yicha</p>
            <div className="bg-[#1a1a2e] border border-white/10 rounded-none p-4 space-y-3">
              {[
                { label: 'Bajarildi', val: stats.completed_orders, color: 'bg-green-400' },
                { label: 'Kutilmoqda', val: stats.pending_orders, color: 'bg-yellow-400' },
                { label: 'Xato', val: stats.failed_orders, color: 'bg-red-400' },
              ].map(({ label, val, color }) => {
                const pct = stats.total_orders > 0 ? Math.round((val / stats.total_orders) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-white font-bold">{val} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-none overflow-hidden">
                      <div className={`h-full ${color} rounded-none transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="none"
              onClick={loadStats}
              icon={<RotateCw className="w-3.5 h-3.5" />}
              className="w-full py-2.5 rounded-none border border-white/10 text-gray-400 text-xs font-bold hover:text-white hover:border-white/20 transition-all"
            >
              Yangilash
            </Button>
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {!loading && tab === 'orders' && (
          <div className="space-y-3">
            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {['', 'awaiting_admin_review', 'pending', 'processing', 'completed', 'failed'].map((s) => (
                <Button
                  key={s || 'all'}
                  variant={statusFilter === s ? 'primary' : 'ghost'}
                  size="none"
                  onClick={() => setStatusFilter(s)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-none text-[11px] font-bold border transition-all ${
                    statusFilter === s
                      ? 'border-orange-500 text-white'
                      : 'border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {s === '' && <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Barchasi</span>}
                  {s === 'awaiting_admin_review' && <span className="flex items-center gap-1"><Search className="w-3 h-3 text-orange-400" /> Tekshiruv</span>}
                  {s === 'pending' && <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-yellow-400" /> Kutilmoqda</span>}
                  {s === 'processing' && <span className="flex items-center gap-1"><RotateCw className="w-3 h-3 text-blue-400 animate-spin" /> Jarayonda</span>}
                  {s === 'completed' && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" /> Bajarildi</span>}
                  {s === 'failed' && <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> Xato</span>}
                </Button>
              ))}
            </div>

            {orders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Frown className="w-10 h-10 text-gray-500 mb-3" />
                <span className="text-gray-500 text-sm font-medium">
                  {isUz ? 'Buyurtmalar topilmadi' : 'No orders found'}
                </span>
              </div>
            )}

            {orders.map((order) => (
              <div key={order.id} className="bg-[#1a1a2e] border border-white/10 rounded-none p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{gameIcon(order.game)}</span>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{order.package_name}</p>
                      <p className="text-[10px] text-gray-500">#{order.id} · {order.game.toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-none border flex-shrink-0 ${statusColor(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div><span className="text-gray-500">Player ID:</span> <span className="text-white font-semibold">{order.player_id}</span></div>
                  <div><span className="text-gray-500">Narx:</span> <span className="text-cyber-cyan font-bold">{fmt(parseFloat(order.price))} so'm</span></div>
                  <div><span className="text-gray-500">Nickname:</span> <span className="text-white">{order.player_nickname ?? '—'}</span></div>
                  <div><span className="text-gray-500">To'lov:</span> <span className="text-white uppercase">{order.payment_method ?? '—'}</span></div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <p className="text-[10px] text-gray-600">
                    {new Date(order.created_at).toLocaleString('uz-UZ')}
                  </p>
                  <div className="flex gap-2">
                    {order.status === 'awaiting_admin_review' && (
                      <>
                        <Button
                          variant="ghost"
                          size="none"
                          onClick={() => approveOrder(order.id)}
                          icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                          className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 text-[11px] font-bold rounded-none hover:bg-green-500/30 transition-all"
                        >
                          Tasdiqlash
                        </Button>
                        <Button
                          variant="ghost"
                          size="none"
                          onClick={() => rejectOrder(order.id)}
                          icon={<XCircle className="w-3.5 h-3.5 text-red-400" />}
                          className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-bold rounded-none hover:bg-red-500/30 transition-all"
                        >
                          Rad etish
                        </Button>
                      </>
                    )}
                    {order.status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="none"
                        onClick={() => retryOrder(order.id)}
                        disabled={retryingId === order.id}
                        className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-bold rounded-none hover:bg-red-500/30 transition-all disabled:opacity-50"
                      >
                        {retryingId === order.id ? '...' : <span className="flex items-center gap-1"><RotateCw className="w-3 h-3" /> Retry</span>}
                      </Button>
                    )}
                  </div>
                </div>

                {order.screenshot_url && (
                  <div className="mt-3">
                    <p className="text-[10px] text-gray-500 mb-1">Skrinshot:</p>
                    <a href={`${API_BASE.replace('/api', '')}/screenshots/${order.screenshot_url.split('/').pop()}`} target="_blank" rel="noreferrer">
                      <img src={`${API_BASE.replace('/api', '')}/screenshots/${order.screenshot_url.split('/').pop()}`} alt="Screenshot" className="h-32 object-cover rounded-none border border-white/10" />
                    </a>
                  </div>
                )}
                {order.error_message && (
                  <p className="mt-2 text-[10px] text-red-400 bg-red-500/10 p-2 rounded-none border border-red-500/20">
                    {order.error_message}
                  </p>
                )}
              </div>
            ))}

            <Button
              variant="ghost"
              size="none"
              onClick={loadOrders}
              icon={<RotateCw className="w-3.5 h-3.5" />}
              className="w-full py-2.5 rounded-none border border-white/10 text-gray-400 text-xs font-bold hover:text-white hover:border-white/20 transition-all"
            >
              Yangilash
            </Button>
          </div>
        )}

        {/* ── SYSTEM TAB ── */}
        {!loading && tab === 'system' && botStatus && (
          <div className="space-y-3">
            {/* Status cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1a1a2e] border border-white/10 rounded-none p-4">
                <p className="text-[11px] text-gray-500 uppercase tracking-widest">Bot</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${botStatus.status === 'running' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className={`text-sm font-black ${botStatus.status === 'running' ? 'text-green-400' : 'text-red-400'}`}>
                    {botStatus.status === 'running' ? 'Ishlayapti' : 'To\'xtagan'}
                  </span>
                </div>
              </div>

              <div className="bg-[#1a1a2e] border border-white/10 rounded-none p-4">
                <p className="text-[11px] text-gray-500 uppercase tracking-widest">Uptime</p>
                <p className="text-sm font-black text-white mt-2">{formatUptime(botStatus.uptime)}</p>
              </div>

              <div className="bg-[#1a1a2e] border border-white/10 rounded-none p-4">
                <p className="text-[11px] text-gray-500 uppercase tracking-widest">Database</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${botStatus.database === 'healthy' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className={`text-sm font-black ${botStatus.database === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                    {botStatus.database === 'healthy' ? 'Yaxshi' : 'Muammo'}
                  </span>
                </div>
              </div>

              <div className="bg-[#1a1a2e] border border-white/10 rounded-none p-4">
                <p className="text-[11px] text-gray-500 uppercase tracking-widest">Redis</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${botStatus.redis === 'healthy' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className={`text-sm font-black ${botStatus.redis === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                    {botStatus.redis === 'healthy' ? 'Yaxshi' : 'Muammo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#1a1a2e] border border-white/10 rounded-none p-4">
              <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2">So'nggi tekshiruv</p>
              <p className="text-xs text-white font-mono">{new Date(botStatus.timestamp).toLocaleString('uz-UZ')}</p>
            </div>

            <Button
              variant="ghost"
              size="none"
              onClick={loadBotStatus}
              icon={<RotateCw className="w-3.5 h-3.5" />}
              className="w-full py-2.5 rounded-none border border-white/10 text-gray-400 text-xs font-bold hover:text-white hover:border-white/20 transition-all"
            >
              Yangilash
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
