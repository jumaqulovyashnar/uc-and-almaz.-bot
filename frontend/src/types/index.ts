export type GameType = 'pubg' | 'freefire';
export type CategoryType = 'almazar' | 'propuski' | 'levelup';
export type PaymentMethodType = 'uzcard' | 'humo' | 'visa';
export type OrderStatusType = 'pending' | 'processing' | 'completed' | 'failed';

export interface GamePackage {
  id: string;
  name: string;
  amount: number;
  price: number;
  game: GameType;
  category: CategoryType;
  discount?: number;
}

export interface Game {
  id: GameType;
  name: string;
  description: string;
  packagesCount: number;
  gradient: string;
}

export interface Order {
  id: string;
  game: GameType;
  packageName: string;
  amount: number;
  price: number;
  playerId: string;
  playerNickname: string;
  status: OrderStatusType;
  paymentMethod: PaymentMethodType;
  createdAt: string;
  errorMessage?: string;
}


export interface User {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
}

export interface CartState {
  selectedGame: GameType | null;
  selectedPackage: GamePackage | null;
  selectedCategory: CategoryType;
  playerId: string;
  playerNickname: string;
  isVerified: boolean;
  paymentMethod: PaymentMethodType | null;
}
