import { create } from 'zustand';
import type {
  GameType,
  GamePackage,
  CategoryType,
  PaymentMethodType,
  Order,
} from '../types';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface StoreState {
  // Cart state
  selectedGame: GameType | null;
  selectedPackage: GamePackage | null;
  selectedCategory: CategoryType;
  playerId: string;
  playerNickname: string;
  isVerified: boolean;
  paymentMethod: PaymentMethodType | null;

  // Language & Theme state
  language: 'uz' | 'en';
  theme: 'dark' | 'light';

  // Orders
  orders: Order[];

  // Telegram user
  telegramUser: TelegramUser | null;

  // Actions
  setGame: (game: GameType | null) => void;
  setPackage: (pkg: GamePackage | null) => void;
  setCategory: (category: CategoryType) => void;
  setPlayerId: (id: string) => void;
  setNickname: (nickname: string) => void;
  setVerified: (verified: boolean) => void;
  setPaymentMethod: (method: PaymentMethodType | null) => void;
  setLanguage: (lang: 'uz' | 'en') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  addOrder: (order: Order) => void;
  clearCart: () => void;
  setTelegramUser: (user: TelegramUser) => void;
}

// Try to get Telegram WebApp user data
const getTelegramUser = (): TelegramUser | null => {
  try {
    const tg = (window as any)?.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      return tg.initDataUnsafe.user as TelegramUser;
    }
  } catch {
    // not in Telegram WebApp
  }
  return null;
};

export const useStore = create<StoreState>((set) => ({
  // Initial state
  selectedGame: null,
  selectedPackage: null,
  selectedCategory: 'almazar',
  playerId: '',
  playerNickname: '',
  isVerified: false,
  paymentMethod: null,
  language: 'uz',
  theme: 'dark',
  orders: [],
  telegramUser: getTelegramUser(),

  // Actions
  setGame: (game) =>
    set({
      selectedGame: game,
      selectedPackage: null,
      selectedCategory: 'almazar',
      playerId: '',
      playerNickname: '',
      isVerified: false,
      paymentMethod: null,
    }),

  setPackage: (pkg) => set({ selectedPackage: pkg }),

  setCategory: (category) =>
    set({ selectedCategory: category, selectedPackage: null }),

  setPlayerId: (id) =>
    set({ playerId: id, isVerified: false, playerNickname: '' }),

  setNickname: (nickname) => set({ playerNickname: nickname }),

  setVerified: (verified) => set({ isVerified: verified }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setLanguage: (lang) => set({ language: lang }),

  setTheme: (theme) => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    set({ theme });
  },

  addOrder: (order) =>
    set((state) => ({ orders: [order, ...state.orders] })),

  clearCart: () =>
    set({
      selectedPackage: null,
      playerId: '',
      playerNickname: '',
      isVerified: false,
      paymentMethod: null,
    }),

  setTelegramUser: (user) => set({ telegramUser: user }),
}));

export default useStore;
