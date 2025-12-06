import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string) => {
        // Simple mock login - in production, this would call an API
        // For demo purposes, any email/password works
        await new Promise((resolve) => setTimeout(resolve, 500));

        const user: User = {
          id: '1',
          email,
          name: email.split('@')[0],
        };

        set({ user, isAuthenticated: true });
        return true;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
        // Also clear from localStorage to ensure clean logout
        localStorage.removeItem('robosim-auth');
      },
    }),
    {
      name: 'robosim-auth',
    }
  )
);
