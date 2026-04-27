'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Registration } from '@/types';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function MyRegistrationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchRegistrations();
    }
  }, [isAuthenticated, authLoading]);

  const fetchRegistrations = async () => {
    try {
      const data = await apiClient.getMyRegistrations();
      setRegistrations(data);
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '已确认';
      case 'checked_in':
        return '已签到';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">我的报名</h1>

      {registrations.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">暂无报名记录</div>
          <Link
            href="/events"
            className="inline-block bg-primary-600 text-white hover:bg-primary-700 px-6 py-2 rounded-lg"
          >
            浏览活动
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="divide-y">
                {registrations.map((registration) => (
                  <div
                    key={registration.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedRegistration?.id === registration.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedRegistration(registration)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {registration.event?.title}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
                              registration.status
                            )}`}
                          >
                            {getStatusText(registration.status)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            📅 {registration.event
                              ? format(new Date(registration.event.startTime), 'yyyy-MM-dd HH:mm')
                              : ''}
                          </p>
                          <p>📍 {registration.event?.location}</p>
                          <p>
                            票种: {registration.ticketType?.name} × {registration.quantity}
                          </p>
                          <p>订单号: {registration.orderNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary-600">
                          ¥{registration.totalPrice}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            {selectedRegistration ? (
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">电子票</h2>

                <div className="text-center mb-4">
                  {selectedRegistration.qrCodeData && (
                    <img
                      src={selectedRegistration.qrCodeData}
                      alt="二维码"
                      className="w-48 h-48 mx-auto"
                    />
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <div className="text-sm text-gray-500">活动名称</div>
                    <div className="font-medium">{selectedRegistration.event?.title}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">票种</div>
                    <div className="font-medium">
                      {selectedRegistration.ticketType?.name} × {selectedRegistration.quantity}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">订单号</div>
                    <div className="font-medium font-mono text-sm">
                      {selectedRegistration.orderNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">联系人</div>
                    <div className="font-medium">{selectedRegistration.contactName}</div>
                    <div className="text-sm text-gray-600">
                      {selectedRegistration.contactPhone}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedRegistration.contactEmail}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">状态</div>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
                        selectedRegistration.status
                      )}`}
                    >
                      {getStatusText(selectedRegistration.status)}
                    </span>
                  </div>
                </div>

                {selectedRegistration.checkedInAt && (
                  <div className="text-sm text-gray-500">
                    签到时间: {format(new Date(selectedRegistration.checkedInAt), 'yyyy-MM-dd HH:mm')}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                <div className="text-center text-gray-500">
                  点击左侧报名记录查看电子票详情
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
