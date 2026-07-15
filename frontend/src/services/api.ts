import type {
  GameType,
  CategoryType,
  GamePackage,
  Order,
  PaymentMethodType,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

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
): Promise<{ nickname: string; valid: boolean; error?: string }> {
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
    if (detail && typeof detail === 'object') {
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
    return { nickname: '', valid: false, error: errMsg };
  } catch (error) {
    console.error('[API] verifyPlayer error:', error);
    return { nickname: '', valid: false, error: 'Tarmoq xatosi' };
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
}): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      game: data.game,
      category: 'package', // Backend expects category, can be default
      package_id: parseInt(data.packageId),
      package_name: data.packageName,
      amount: data.amount,
      price: data.price,
      player_id: data.playerId,
      player_nickname: data.playerNickname,
      payment_method: data.paymentMethod
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
