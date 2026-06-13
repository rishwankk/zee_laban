import { create } from 'zustand';
import { User, Store, api } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  store: Store | null;
  isLoading: boolean;
  error: string | null;
  isMobileSidebarOpen: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
  changeStore: (storeId: string) => Promise<void>;
  toggleMobileSidebar: (open?: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  store: null,
  isLoading: false,
  error: null,
  isMobileSidebarOpen: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.verifyCredentials(email, password);
      if (!user) {
        set({ error: "Invalid email address. No account found.", isLoading: false });
        return null;
      }
      
      let store: Store | null = null;
      if (user.store_id) {
        const stores = await api.getStores();
        store = stores.find(s => s.id === user.store_id) || null;
      }

      set({ user, store, isLoading: false });
      return user;
    } catch (err: any) {
      set({ error: err.message || "Failed to log in", isLoading: false });
      return null;
    }
  },

  logout: () => {
    set({ user: null, store: null, error: null });
  },

  initializeAuth: async () => {
    if (typeof window === 'undefined') return;
    set({ isLoading: true });
    try {
      const email = localStorage.getItem('lbn_session_email');
      if (email) {
        const user = await api.getUserByEmail(email);
        if (user) {
          let store: Store | null = null;
          if (user.store_id) {
            const stores = await api.getStores();
            store = stores.find(s => s.id === user.store_id) || null;
          }
          set({ user, store });
        }
      }
    } catch (err) {
      console.error("Failed to restore session", err);
    } finally {
      set({ isLoading: false });
    }
  },

  changeStore: async (storeId: string) => {
    try {
      const stores = await api.getStores();
      const store = stores.find(s => s.id === storeId) || null;
      set({ store });
    } catch (err) {
      console.error("Failed to change active store", err);
    }
  },

  toggleMobileSidebar: (open) => {
    set((state) => ({
      isMobileSidebarOpen: open !== undefined ? open : !state.isMobileSidebarOpen
    }));
  }
}));
