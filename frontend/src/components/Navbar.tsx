'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-primary-600">
              活动平台
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/events"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              活动列表
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  href="/my-registrations"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  我的报名
                </Link>

                {user?.role === UserRole.ORGANIZER && (
                  <>
                    <Link
                      href="/organizer/dashboard"
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      组织者后台
                    </Link>
                    <Link
                      href="/organizer/events/create"
                      className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      创建活动
                    </Link>
                  </>
                )}

                <div className="flex items-center space-x-3">
                  <span className="text-gray-700 text-sm">
                    欢迎, {user?.name}
                  </span>
                  <button
                    onClick={logout}
                    className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    退出登录
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
