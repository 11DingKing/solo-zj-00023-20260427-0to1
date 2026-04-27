'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Event } from '@/types';
import { apiClient } from '@/lib/api';
import { format } from 'date-fns';

export default function HomePage() {
  const [hotEvents, setHotEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHotEvents = async () => {
      try {
        const events = await apiClient.getHotEvents();
        setHotEvents(events);
      } catch (error) {
        console.error('Failed to fetch hot events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHotEvents();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          发现精彩活动
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          浏览并报名参加各种精彩线下活动
        </p>
        <Link
          href="/events"
          className="inline-block bg-primary-600 text-white hover:bg-primary-700 px-8 py-3 rounded-lg font-medium text-lg"
        >
          浏览全部活动
        </Link>
      </div>

      {!loading && hotEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">热门活动</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {event.coverImage ? (
                  <div className="h-48 bg-gray-200">
                    <img
                      src={event.coverImage}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-r from-primary-400 to-primary-600 flex items-center justify-center">
                    <span className="text-white text-xl font-medium">
                      {event.title.substring(0, 20)}
                    </span>
                  </div>
                )}
                <div className="p-4">
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded mb-2">
                    {event.category}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {event.title}
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>📍 {event.location}</p>
                    <p>
                      📅 {format(new Date(event.startTime), 'yyyy-MM-dd HH:mm')}
                    </p>
                    <p className="text-primary-600 font-medium">
                      ¥{event.ticketTypes[0]?.price || 0} 起
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
