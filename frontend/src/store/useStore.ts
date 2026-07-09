import { create } from 'zustand';
import type {
  GameType,
  GamePackage,
  CategoryType,
  PaymentMethodType,
  Order,
} from '../types';

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
}

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
    // Optionally update document class for styling
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
}));

export default useStore;
