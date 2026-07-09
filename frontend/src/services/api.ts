import { packages } from '../data/packages';
import type {
  GameType,
  CategoryType,
  GamePackage,
  Order,
  PaymentMethodType,
} from '../types';

/**
 * Simulate network delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get packages filtered by game and optional category
 */
export async function getPackages(
  game: GameType,
  category?: CategoryType
): Promise<GamePackage[]> {
  await delay(300);
  return packages.filter(
    (pkg) => pkg.game === game && (!category || pkg.category === category)
  );
}

/**
 * Verify a player ID for a given game
 */
export async function verifyPlayer(
  game: GameType,
  playerId: string
): Promise<{ nickname: string; valid: boolean }> {
  await delay(1000);
  if (!playerId || playerId.length < 5) {
    return { nickname: '', valid: false };
  }
  return {
    nickname: 'ProGamer_' + playerId.slice(-3),
    valid: true,
  };
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
  await delay(1500);
  const order: Order = {
    id: 'ORD-' + Date.now().toString(36).toUpperCase(),
    game: data.game,
    packageName: data.packageName,
    amount: data.amount,
    price: data.price,
    playerId: data.playerId,
    playerNickname: data.playerNickname,
    status: 'processing',
    paymentMethod: data.paymentMethod,
    createdAt: new Date().toISOString(),
  };
  return order;
}

/**
 * Get order history (mock)
 */
export async function getOrders(): Promise<Order[]> {
  await delay(500);
  return [
    {
      id: 'ORD-DEMO001',
      game: 'pubg',
      packageName: '660 UC',
      amount: 660,
      price: 115000,
      playerId: '5123456789',
      playerNickname: 'ProGamer_789',
      status: 'completed',
      paymentMethod: 'uzcard',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'ORD-DEMO002',
      game: 'freefire',
      packageName: '520 Olmos',
      amount: 520,
      price: 55000,
      playerId: '9876543210',
      playerNickname: 'ProGamer_210',
      status: 'processing',
      paymentMethod: 'humo',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
}
