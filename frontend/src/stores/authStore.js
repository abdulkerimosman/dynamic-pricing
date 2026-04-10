import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token:     null,
      kullanici: null,

      login: (token, kullanici) => set({ token, kullanici }),

      logout: () => set({ token: null, kullanici: null }),
    }),
    {
      name: 'sporthink-auth', // localStorage key
      partialize: (state) => ({ token: state.token, kullanici: state.kullanici }),
    }
  )
);
