import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole, AuthResponse } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string, name: string, role?: UserRole) => Promise<AuthResponse>;
  logout: () => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.login({ email, password });
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false
          });
          apiClient.setToken(response.token);
          return response;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string, role?: UserRole) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.register({ email, password, name, role });
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false
          });
          apiClient.setToken(response.token);
          return response;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
        apiClient.setToken(null);
      },

      setToken: (token: string | null) => {
        if (token) {
          apiClient.setToken(token);
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
