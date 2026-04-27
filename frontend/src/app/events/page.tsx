'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Event } from '@/types';
import { apiClient } from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type ViewMode = 'card' | 'calendar';

const CATEGORIES = ['全部', '会议', '培训', '展览', '演出', '体育赛事', '其他'];
const TAGS_OPTIONS = ['技术', '艺术', '音乐', '运动', '教育', '商务', '娱乐'];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [category, setCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'startTime' | 'createdAt'>('startTime');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, [category, selectedTags, keyword, sortBy, sortOrder]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        sortBy,
        sortOrder
      };

      if (category && category !== '全部') {
        params.category = category;
      }
      if (selectedTags.length > 0) {
        params.tags = selectedTags;
      }
      if (keyword) {
        params.keyword = keyword;
      }

      const result = await apiClient.getEvents(params);
      setEvents(result.events);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
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
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                {event.category}
              </span>
              {event.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
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
  );

  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    const getEventsForDay = (day: Date) => {
      return events.filter((event) => isSameDay(new Date(event.startTime), day));
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))
            }
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            ←
          </button>
          <h3 className="text-lg font-semibold">
            {format(currentMonth, 'yyyy年 MM月', { locale: zhCN })}
          </h3>
          <button
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))
            }
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div key={day} className="text-center font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div
                key={idx}
                className="min-h-24 border rounded p-1 hover:bg-gray-50"
              >
                <div className="text-sm text-gray-500 mb-1">
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="block text-xs bg-primary-100 text-primary-800 rounded px-1 py-0.5 truncate"
                      title={event.title}
                    >
                      {event.title}
                    </Link>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayEvents.length - 2} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">活动列表</h1>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 mb-4">
            <input
              type="text"
              placeholder="搜索活动..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 min-w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat === '全部' ? '' : cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'startTime' | 'createdAt')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="startTime">按时间排序</option>
              <option value="createdAt">按发布时间排序</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="ASC">升序</option>
              <option value="DESC">降序</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-gray-600">标签:</span>
            {TAGS_OPTIONS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 text-sm rounded-full ${
                  selectedTags.includes(tag)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              共 {events.length} 个活动
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('card')}
                className={`px-4 py-2 rounded ${
                  viewMode === 'card'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                卡片视图
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded ${
                  viewMode === 'calendar'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                日历视图
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">暂无活动</div>
          </div>
        ) : viewMode === 'card' ? (
          renderCardView()
        ) : (
          renderCalendarView()
        )}
      </div>
    </div>
  );
}
