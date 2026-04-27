'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Event, TicketType } from '@/types';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicketType, setSelectedTicketType] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  const eventId = params.id as string;

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const data = await apiClient.getEvent(eventId);
      setEvent(data);
      if (data.ticketTypes.length > 0) {
        setSelectedTicketType(data.ticketTypes[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      const registration = await apiClient.registerForEvent(eventId, {
        ticketTypeId: selectedTicketType,
        quantity,
        contactName,
        contactPhone,
        contactEmail
      });
      router.push(`/my-registrations`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '报名失败';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailableQuantity = (ticketType: TicketType) => {
    return ticketType.quantity - ticketType.sold;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">活动不存在</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {event.coverImage ? (
            <div className="h-64 bg-gray-200 rounded-lg overflow-hidden mb-6">
              <img
                src={event.coverImage}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-64 bg-gradient-to-r from-primary-400 to-primary-600 rounded-lg flex items-center justify-center mb-6">
              <h1 className="text-3xl font-bold text-white">{event.title}</h1>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {event.title}
            </h1>

            <div className="flex flex-wrap gap-2 mb-6">
              <span className="inline-block px-3 py-1 text-sm font-medium bg-primary-100 text-primary-800 rounded-full">
                {event.category}
              </span>
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-3 py-1 text-sm font-medium bg-gray-100 text-gray-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <div className="text-sm text-gray-500">开始时间</div>
                  <div className="font-medium">
                    {format(new Date(event.startTime), 'yyyy-MM-dd HH:mm')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <div className="text-sm text-gray-500">活动地点</div>
                  <div className="font-medium">{event.location}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <div className="text-sm text-gray-500">报名截止</div>
                  <div className="font-medium">
                    {format(new Date(event.registrationDeadline), 'yyyy-MM-dd HH:mm')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <div className="text-sm text-gray-500">人数限制</div>
                  <div className="font-medium">{event.maxCapacity} 人</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">活动详情</h2>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">报名活动</h2>

            {!showRegisterForm ? (
              <div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择票种
                  </label>
                  <div className="space-y-2">
                    {event.ticketTypes.map((ticketType) => {
                      const available = getAvailableQuantity(ticketType);
                      return (
                        <label
                          key={ticketType.id}
                          className={`block p-3 border rounded-lg cursor-pointer ${
                            selectedTicketType === ticketType.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-primary-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="ticketType"
                            value={ticketType.id}
                            checked={selectedTicketType === ticketType.id}
                            onChange={(e) => setSelectedTicketType(e.target.value)}
                            className="sr-only"
                          />
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{ticketType.name}</div>
                              {ticketType.description && (
                                <div className="text-sm text-gray-500">
                                  {ticketType.description}
                                </div>
                              )}
                              <div className="text-sm text-gray-500">
                                剩余 {available} 张
                              </div>
                            </div>
                            <div className="text-xl font-bold text-primary-600">
                              ¥{ticketType.price}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setShowRegisterForm(true)}
                  className="w-full bg-primary-600 text-white hover:bg-primary-700 py-3 rounded-lg font-medium"
                >
                  立即报名
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister}>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数量
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={
                      event.ticketTypes.find((t) => t.id === selectedTicketType)
                        ?.quantity || 1
                    }
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    联系人姓名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    联系电话 *
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    联系邮箱 *
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 py-3 rounded-lg font-medium"
                  >
                    返回
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-primary-600 text-white hover:bg-primary-700 py-3 rounded-lg font-medium disabled:opacity-50"
                  >
                    {submitting ? '提交中...' : '确认报名'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
