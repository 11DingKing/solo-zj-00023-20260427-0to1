'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import { ToastContainer, toast, setAuthErrorHandler } from '@/components/Toast';
import { useAuthStore } from '@/store/authStore';
import { setAuthErrorHandler as setApiAuthErrorHandler } from '@/lib/api';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { token, setToken, logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (token) {
      setToken(token);
    }
  }, [token, setToken]);

  useEffect(() => {
    setApiAuthErrorHandler(() => {
      if (isAuthenticated) {
        toast.error('登录已过期，请重新登录');
        logout();
      }
    });

    setAuthErrorHandler(() => {
      if (isAuthenticated) {
        toast.error('登录已过期，请重新登录');
        logout();
      }
    });
  }, [isAuthenticated, logout]);

  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen bg-gray-50">{children}</main>
        <ToastContainer />
      </body>
    </html>
  );
}
