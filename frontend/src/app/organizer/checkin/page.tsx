'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Registration, UserRole, RegistrationStatus } from '@/types';
import { format } from 'date-fns';

export default function CheckinPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [scanning, setScanning] = useState(false);
  const [manualOrderNumber, setManualOrderNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkedRegistration, setCheckedRegistration] = useState<Registration | null>(null);
  const [history, setHistory] = useState<{ orderNumber: string; success: boolean; message: string; time: Date }[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== UserRole.ORGANIZER) {
      router.push('/');
      return;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isAuthenticated, authLoading, user]);

  const startScanning = async () => {
    setError('');
    setSuccess('');

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          await handleCheckin(decodedText);
        },
        (errorMessage) => {
          console.log('Scan error:', errorMessage);
        }
      );

      setScanning(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '无法启动摄像头';
      setError(message);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
      setScanning(false);
    }
  };

  const handleCheckin = async (orderNumber: string) => {
    setError('');
    setSuccess('');

    try {
      const registration = await apiClient.checkIn(orderNumber);
      setSuccess(`签到成功: ${registration.contactName}`);
      setCheckedRegistration(registration);
      setHistory((prev) => [
        {
          orderNumber,
          success: true,
          message: `签到成功: ${registration.contactName}`,
          time: new Date()
        },
        ...prev.slice(0, 9)
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '签到失败';
      setError(message);
      setHistory((prev) => [
        {
          orderNumber,
          success: false,
          message,
          time: new Date()
        },
        ...prev.slice(0, 9)
      ]);
    }
  };

  const handleManualCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualOrderNumber.trim()) {
      handleCheckin(manualOrderNumber.trim());
      setManualOrderNumber('');
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">签到管理</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">扫码签到</h2>

          <div
            id={scannerContainerId}
            className="w-full aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden"
          />

          {!scanning ? (
            <button
              onClick={startScanning}
              className="w-full bg-green-600 text-white hover:bg-green-700 py-3 rounded-lg font-medium"
            >
              开始扫描
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="w-full bg-red-600 text-white hover:bg-red-700 py-3 rounded-lg font-medium"
            >
              停止扫描
            </button>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">手动输入订单号</h3>
            <form onSubmit={handleManualCheckin} className="flex gap-2">
              <input
                type="text"
                value={manualOrderNumber}
                onChange={(e) => setManualOrderNumber(e.target.value)}
                placeholder="输入订单号"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                type="submit"
                className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-lg font-medium"
              >
                签到
              </button>
            </form>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {checkedRegistration && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">签到详情</h2>

              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">活动</div>
                  <div className="font-medium">{checkedRegistration.event?.title}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">订单号</div>
                  <div className="font-mono font-medium">{checkedRegistration.orderNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">联系人</div>
                  <div className="font-medium">{checkedRegistration.contactName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">联系方式</div>
                  <div>{checkedRegistration.contactPhone}</div>
                  <div className="text-sm text-gray-600">{checkedRegistration.contactEmail}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">票种</div>
                  <div>
                    {checkedRegistration.ticketType?.name} × {checkedRegistration.quantity}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">签到时间</div>
                  <div className="font-medium text-green-600">
                    {checkedRegistration.checkedInAt
                      ? format(new Date(checkedRegistration.checkedInAt), 'yyyy-MM-dd HH:mm:ss')
                      : '-'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">签到历史</h2>

            {history.length === 0 ? (
              <div className="text-center text-gray-500 py-8">暂无签到记录</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      item.success ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div>
                      <div
                        className={`font-medium ${
                          item.success ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {item.message}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {item.orderNumber}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(item.time, 'HH:mm:ss')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
