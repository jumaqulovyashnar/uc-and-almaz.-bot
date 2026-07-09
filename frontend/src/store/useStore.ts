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

