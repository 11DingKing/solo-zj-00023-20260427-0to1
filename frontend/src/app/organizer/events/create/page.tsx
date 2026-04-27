'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { CreateEventData, CreateTicketTypeData, UserRole } from '@/types';
import { format } from 'date-fns';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

const CATEGORIES = ['会议', '培训', '展览', '演出', '体育赛事', '其他'];

export default function CreateEventPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(100);
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [ticketTypes, setTicketTypes] = useState<CreateTicketTypeData[]>([
    { name: '普通票', description: '', price: 0, quantity: 100 }
  ]);

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  const addTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
      { name: '新票种', description: '', price: 0, quantity: 100 }
    ]);
  };

  const removeTicketType = (index: number) => {
    if (ticketTypes.length > 1) {
      setTicketTypes(ticketTypes.filter((_, i) => i !== index));
    }
  };

  const updateTicketType = (index: number, field: keyof CreateTicketTypeData, value: string | number) => {
    const newTicketTypes = [...ticketTypes];
    if (field === 'price' || field === 'quantity') {
      newTicketTypes[index][field] = Number(value);
    } else {
      newTicketTypes[index][field] = value as string;
    }
    setTicketTypes(newTicketTypes);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const eventData: CreateEventData = {
        title,
        description,
        startTime,
        endTime,
        location,
        maxCapacity,
        registrationDeadline,
        coverImage: coverImage || undefined,
        category,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        ticketTypes
      };

      const event = await apiClient.createEvent(eventData);
      
      await apiClient.publishEvent(event.id);
      
      router.push('/organizer/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '创建活动失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== UserRole.ORGANIZER) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-gray-500 mb-4">您没有权限访问此页面</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">创建活动</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setStep(1)}
          className={`px-4 py-2 rounded ${
            step === 1
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          基本信息
        </button>
        <button
          onClick={() => setStep(2)}
          className={`px-4 py-2 rounded ${
            step === 2
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          票种设置
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                活动标题 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="请输入活动标题"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标签 (用逗号分隔)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="例如: 技术, 艺术, 音乐"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                活动描述 *
              </label>
              <ReactQuill
                theme="snow"
                value={description}
                onChange={setDescription}
                modules={modules}
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  开始时间 *
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束时间 *
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                活动地点 *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="请输入活动地点"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                报名截止时间 *
              </label>
              <input
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                人数上限
              </label>
              <input
                type="number"
                min="1"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                封面图片 URL
              </label>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="bg-primary-600 text-white hover:bg-primary-700 px-6 py-2 rounded-lg font-medium"
              >
                下一步: 票种设置
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">票种设置</h2>
              <button
                onClick={addTicketType}
                className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                + 添加票种
              </button>
            </div>

            {ticketTypes.map((ticketType, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">票种 {index + 1}</span>
                  {ticketTypes.length > 1 && (
                    <button
                      onClick={() => removeTicketType(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      删除
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      名称 *
                    </label>
                    <input
                      type="text"
                      value={ticketType.name}
                      onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="例如: 普通票"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      价格 (元)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ticketType.price}
                      onChange={(e) => updateTicketType(index, 'price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      数量 *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ticketType.quantity}
                      onChange={(e) => updateTicketType(index, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <input
                      type="text"
                      value={ticketType.description || ''}
                      onChange={(e) => updateTicketType(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="票种描述"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-6 py-2 rounded-lg font-medium"
              >
                返回
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-primary-600 text-white hover:bg-primary-700 px-6 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? '创建中...' : '创建并发布活动'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
