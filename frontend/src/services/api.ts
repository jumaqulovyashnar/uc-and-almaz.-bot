import type {
  GameType,
  CategoryType,
  GamePackage,
  Order,
  PaymentMethodType,
} from '../types';

const getApiBase = (): string => {
  // 1. Try to read from URL query parameters
  try {
    const params = new URLSearchParams(window.location.search);
    const urlApi = params.get('api_url');
    if (urlApi) {
      localStorage.setItem('cyberpay-api-url', urlApi);
      return urlApi;
    }
  } catch (e) {
    console.error('Failed to parse URL params:', e);
  }

  // 2. Try to read from localStorage
  try {
    const saved = localStorage.getItem('cyberpay-api-url');
    if (saved) return saved;
  } catch (e) {
    // ignore
  }

  // 3. Fallback to build-time environment variable
  const envApi = import.meta.env.VITE_API_URL as string;
  if (envApi && !envApi.includes('REPLACE_WITH_YOUR_BACKEND_DOMAIN')) {
    return envApi;
  }

  // 4. Ultimate fallback (local dev)
  return 'http://localhost:3002/api';
};

export const API_BASE = getApiBase();

const getHeaders = () => {
  const tg = (window as any)?.Telegram?.WebApp;
  return {
    'Content-Type': 'application/json',
    'x-telegram-init-data': tg?.initData ?? '',
  };
};

/**
 * Get packages filtered by game and optional category
 */
export async function getPackages(
  game: GameType,
  category?: CategoryType
): Promise<GamePackage[]> {
  try {
    const res = await fetch(`${API_BASE}/packages/${game}`);
    if (!res.ok) throw new Error('Failed to fetch packages');
    const json = await res.json();
    if (json.success && json.data.packages) {
      const pkgGroup = json.data.packages;
      const flatList: GamePackage[] = [];
      Object.keys(pkgGroup).forEach((cat) => {
        if (!category || cat === category) {
          pkgGroup[cat].forEach((p: any) => {
            flatList.push({
              id: String(p.id),
              name: p.name,
              amount: p.amount,
              price: parseFloat(p.sell_price),
              game: p.game as any,
              category: p.category as any,
              image: p.image,
              discount: p.discount,
            });
          });
        }
      });
      return flatList;
    }
    return [];
  } catch (error) {
    console.error('[API] getPackages error:', error);
    return [];
  }
}

/**
 * Verify a player ID for a given game
 */
export async function verifyPlayer(
  game: GameType,
  playerId: string
): Promise<{ nickname: string; valid: boolean; error?: string; error_code?: string }> {
  try {
    const res = await fetch(`${API_BASE}/verify-player`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ game, player_id: playerId }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      return { nickname: json.data.nickname, valid: true };
    }
    const detail = json.detail;
    let errMsg = "Xatolik yuz berdi";
    let errCode = "UNKNOWN";
    if (detail && typeof detail === 'object') {
      errCode = detail.error_code || "UNKNOWN";
      if (detail.error_code === 'CAPTCHA_TRIGGERED') {
        errMsg = "Xavfsizlik tekshiruvi (Captcha) tufayli ismni avtomatik aniqlab bo'lmadi. ID to'g'ri bo'lsa, xaridni davom ettiravering.";
      } else if (detail.error_code === 'INVALID_ID') {
        errMsg = "Ushbu ID egasi topilmadi. Iltimos, ID raqamini tekshiring.";
      } else if (detail.error_code === 'TIMEOUT') {
        errMsg = "Kutish vaqti tugadi. Qaytadan urining.";
      } else {
        errMsg = detail.message || errMsg;
      }
    } else if (typeof detail === 'string') {
      errMsg = detail;
    }
    return { nickname: '', valid: false, error: errMsg, error_code: errCode };
  } catch (error) {
    console.error('[API] verifyPlayer error:', error);
    return { nickname: '', valid: false, error: 'Tarmoq xatosi', error_code: 'NETWORK_ERROR' };
  }
}

/**
 * Create a new order
 */
export interface DynamicGame {
  key: string;
  name: string;
  image: string;
  popular: boolean;
}

export interface DynamicProduct {
  product_id: string;
  name: string;
  price_uzs: number;
}

export const DEFAULT_GAMES: DynamicGame[] = [
  { key: 'mobile-legends-ru', name: 'Mobile Legends (RU)', image: '/images/games/mobile-legends-ru.jpg', popular: true },
  { key: 'pubg-mobile-buykos', name: 'PUBG Mobile', image: '/images/games/pubg-mobile-buykos.avif', popular: true },
  { key: 'mobile-legends-global', name: 'Mobile Legends (Global)', image: '/images/games/mobile-legends-global.webp', popular: false },
  { key: 'free-fire-cis-new', name: 'Free Fire', image: '/images/games/free-fire-cis-new.webp', popular: true },
  { key: 'standoff2-buydon', name: 'Standoff 2', image: '/images/games/standoff2-buydon.jpg', popular: true },
  { key: 'blood-strike', name: 'Blood Strike', image: '/images/games/blood-strike.avif', popular: false },
  { key: 'delta-force', name: 'Delta Force', image: '/images/games/delta-force.avif', popular: false },
  { key: 'arena-breakout', name: 'Arena Breakout', image: '/images/games/arena-breakout.avif', popular: false },
  { key: 'steam', name: 'Steam', image: '/images/games/steam.jpg', popular: false },
  { key: 'capcut', name: 'CapCut', image: '/images/games/capcut.jpg', popular: false },
  { key: 'stumble-guys', name: 'Stumble Guys', image: '/images/games/stumble-guys.jpg', popular: false },
];

/**
 * Map remote image URL or gameKey directly to local static asset.
 * Guarantees 0ms instant loading from local public directory.
 */
function resolveGameImage(remoteUrl: string, gameKey: string): string {
  const keyMap: Record<string, string> = {
    'mobile-legends-ru': '/images/games/mobile-legends-ru.jpg',
    'pubg-mobile-buykos': '/images/games/pubg-mobile-buykos.avif',
    'pubg': '/images/games/pubg-mobile-buykos.avif',
    'mobile-legends-global': '/images/games/mobile-legends-global.webp',
    'free-fire-cis-new': '/images/games/free-fire-cis-new.webp',
    'freefire': '/images/games/free-fire-cis-new.webp',
    'standoff2-buydon': '/images/games/standoff2-buydon.jpg',
    'blood-strike': '/images/games/blood-strike.avif',
    'delta-force': '/images/games/delta-force.avif',
    'arena-breakout': '/images/games/arena-breakout.avif',
    'steam': '/images/games/steam.jpg',
    'capcut': '/images/games/capcut.jpg',
    'stumble-guys': '/images/games/stumble-guys.jpg',
  };
  
  if (gameKey && keyMap[gameKey]) {
    return keyMap[gameKey];
  }
  
  if (remoteUrl) {
    try {
      const filename = remoteUrl.split('/').pop()?.split('?')[0];
      if (filename) {
        return `/images/games/${filename}`;
      }
    } catch { /* ignore */ }
  }
  return remoteUrl;
}

export async function getDynamicGames(): Promise<DynamicGame[]> {
  try {
    const res = await fetch(`${API_BASE}/packages/games`);
    if (!res.ok) throw new Error('Failed to fetch dynamic games');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.games) && json.games.length > 0) {
      return json.games.map((g: any) => ({
        ...g,
        image: resolveGameImage(g.image, g.key),
      }));
    }
    return DEFAULT_GAMES;
  } catch (error) {
    console.error('[API] getDynamicGames error:', error);
    return DEFAULT_GAMES;
  }
}

export async function getDynamicProducts(gameKey: string): Promise<{
  requires_server: boolean;
  has_validator: boolean;
  id_label: string;
  products: DynamicProduct[];
} | null> {
  try {
    const res = await fetch(`${API_BASE}/packages/products/${gameKey}`);
    if (!res.ok) throw new Error('Failed to fetch dynamic products');
    const json = await res.json();
    if (json.status === 'success') {
      return {
        requires_server: json.requires_server,
        has_validator: json.has_validator,
        id_label: json.id_label || 'Player ID',
        products: json.products || []
      };
    }
    return null;
  } catch (error) {
    console.error('[API] getDynamicProducts error:', error);
    return null;
  }
}

/**
 * Create a new order
 */
export async function createOrder(data: {
  game: GameType;
  packageId: string;
  packageName: string;
  amount: number;
  price: number;
  playerId: string;
  playerNickname: string;
  paymentMethod: PaymentMethodType;
  serverId?: string;
}): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      game: data.game,
      category: 'package', // Backend expects category, can be default
      package_id: data.packageId,
      package_name: data.packageName,
      amount: data.amount,
      price: data.price,
      player_id: data.playerId,
      player_nickname: data.playerNickname,
      payment_method: data.paymentMethod,
      server_id: data.serverId
    })
  });
  
  const json = await res.json();
  if (res.ok && json.success) {
    const o = json.data.order;
    return {
      id: String(o.id),
      game: o.game as GameType,
      packageName: o.package_name,
      amount: o.amount,
      price: o.price,
      playerId: o.player_id,
      playerNickname: o.player_nickname,
      status: o.status as any,
      paymentMethod: o.payment_method as any,
      createdAt: o.created_at,
    };
  }
  throw new Error(json.detail || 'Buyurtma yaratishda xatolik');
}

/**
 * Get order history
 */
export async function getOrders(): Promise<Order[]> {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      return json.data.orders.map((o: any) => ({
        id: String(o.id),
        game: o.game as GameType,
        packageName: o.package_name,
        amount: o.amount,
        price: o.price,
        playerId: o.player_id,
        playerNickname: o.player_nickname,
        status: o.status as any,
        paymentMethod: o.payment_method as any,
        createdAt: o.created_at,
      }));
    }
    return [];
  } catch (error) {
    console.error('[API] getOrders error:', error);
    return [];
  }
}

/**
 * Get public stats for total UC and Diamonds sold
 */
export async function getPublicStats(): Promise<{ total_uc: number; total_diamonds: number }> {
  try {
    const res = await fetch(`${API_BASE}/orders/stats/public`);
    if (!res.ok) throw new Error('Failed to fetch public stats');
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    return { total_uc: 0, total_diamonds: 0 };
  } catch (error) {
    console.error('[API] getPublicStats error:', error);
    return { total_uc: 0, total_diamonds: 0 };
  }
}

export interface ReferralEarning {
  fromUser: string;
  amount: number;
  date: string;
}

export interface ReferredUser {
  id: number;
  firstName: string;
  telegramId: number;
  joinedAt: string;
}

export interface ReferralData {
  referralLink: string;
  referralsCount: number;
  referralBalance: number;
  referredUsers: ReferredUser[];
  recentEarnings: ReferralEarning[];
}

export async function getReferralData(): Promise<ReferralData | null> {
  try {
    const res = await fetch(`${API_BASE}/referrals/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch referral data');
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    return null;
  } catch (error) {
    console.error('[API] getReferralData error:', error);
    return null;
  }
}
