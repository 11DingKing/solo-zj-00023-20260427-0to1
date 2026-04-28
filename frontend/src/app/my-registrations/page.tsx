"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Registration } from "@/types";
import { apiClient, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/Toast";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

const generateTicketImage = async (
  registration: Registration,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }

    canvas.width = 600;
    canvas.height = 800;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#3b82f6");
    gradient.addColorStop(1, "#1d4ed8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("电子票", canvas.width / 2, 60);

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(30, 90);
    ctx.lineTo(canvas.width - 30, 90);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "left";
    const title = registration.event?.title || "活动";
    const truncatedTitle =
      title.length > 25 ? title.substring(0, 25) + "..." : title;
    ctx.fillText(truncatedTitle, 40, 130);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#6b7280";

    const details = [
      {
        label: "活动时间:",
        value: registration.event
          ? format(new Date(registration.event.startTime), "yyyy-MM-dd HH:mm")
          : "",
      },
      { label: "活动地点:", value: registration.event?.location || "" },
      {
        label: "票种:",
        value: `${registration.ticketType?.name} × ${registration.quantity}`,
      },
      { label: "单价:", value: `¥${registration.ticketType?.price || 0}` },
      { label: "总价:", value: `¥${registration.totalPrice}` },
      { label: "联系人:", value: registration.contactName },
      { label: "电话:", value: registration.contactPhone },
      { label: "订单号:", value: registration.orderNumber },
    ];

    let yPos = 160;
    details.forEach(({ label, value }) => {
      ctx.fillStyle = "#6b7280";
      ctx.fillText(label, 40, yPos);
      ctx.fillStyle = "#1f2937";
      ctx.font = "14px sans-serif";
      ctx.fillText(value || "-", 120, yPos);
      yPos += 30;
    });

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(30, 400);
    ctx.lineTo(canvas.width - 30, 400);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = "center";
    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("签到二维码", canvas.width / 2, 430);

    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    qrImg.onload = () => {
      const qrSize = 200;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 450;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      ctx.textAlign = "center";
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px sans-serif";
      ctx.fillText("请出示此二维码供工作人员扫描签到", canvas.width / 2, 700);

      ctx.fillStyle = "#374151";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(
        `活动平台 ${format(new Date(), "yyyy-MM-dd")}`,
        canvas.width / 2,
        750,
      );

      resolve(canvas.toDataURL("image/png"));
    };

    qrImg.onerror = () => {
      ctx.textAlign = "center";
      ctx.fillStyle = "#ef4444";
      ctx.font = "14px sans-serif";
      ctx.fillText("二维码加载失败", canvas.width / 2, 550);
      resolve(canvas.toDataURL("image/png"));
    };

    if (registration.qrCodeData) {
      qrImg.src = registration.qrCodeData;
    } else {
      ctx.textAlign = "center";
      ctx.fillStyle = "#ef4444";
      ctx.font = "14px sans-serif";
      ctx.fillText("暂无二维码", canvas.width / 2, 550);
      resolve(canvas.toDataURL("image/png"));
    }
  });
};

const downloadTicket = async (registration: Registration) => {
  try {
    toast.info("正在生成电子票...");
    const imageData = await generateTicketImage(registration);
    const link = document.createElement("a");
    link.download = `电子票-${registration.orderNumber}.png`;
    link.href = imageData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("电子票已下载");
  } catch (error) {
    console.error("Failed to download ticket:", error);
    toast.error("下载电子票失败");
  }
};

const getFetchErrorMessage = (err: unknown): string => {
  if (err && typeof err === 'object' && 'message' in err) {
    const error = err as ApiError;
    if (error.isAuthError || error.message.includes("Authentication") || error.message.includes("token")) {
      return "登录已过期，请重新登录";
    }
    return error.message;
  }
  return err instanceof Error ? err.message : "获取报名列表失败";
};

export default function MyRegistrationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRegistration, setSelectedRegistration] =
    useState<Registration | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      toast.info("请先登录");
      router.push("/login");
      return;
    }

    fetchRegistrations();
  }, [isAuthenticated, authLoading, router]);

  const fetchRegistrations = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiClient.getMyRegistrations();
      setRegistrations(data);
    } catch (err) {
      const message = getFetchErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "checked_in":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "已确认";
      case "checked_in":
        return "已签到";
      case "cancelled":
        return "已取消";
      default:
        return status;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">我的报名</h1>

      {error ? (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg inline-block">
            <p className="mb-4">{error}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={fetchRegistrations}
                className="bg-primary-600 text-white hover:bg-primary-700 px-6 py-2 rounded-lg"
              >
                重新加载
              </button>
              <Link
                href="/events"
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-6 py-2 rounded-lg"
              >
                浏览活动
              </Link>
            </div>
          </div>
        </div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <div className="text-gray-500 mb-4">暂无报名记录</div>
          <Link
            href="/events"
            className="inline-block bg-primary-600 text-white hover:bg-primary-700 px-6 py-2 rounded-lg transition-colors"
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
                      selectedRegistration?.id === registration.id
                        ? "bg-blue-50"
                        : ""
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
                              registration.status,
                            )}`}
                          >
                            {getStatusText(registration.status)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            📅{" "}
                            {registration.event
                              ? format(
                                  new Date(registration.event.startTime),
                                  "yyyy-MM-dd HH:mm",
                                )
                              : ""}
                          </p>
                          <p>📍 {registration.event?.location}</p>
                          <p>
                            票种: {registration.ticketType?.name} ×{" "}
                            {registration.quantity}
                          </p>
                          <p>订单号: <span className="font-mono">{registration.orderNumber}</span></p>
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
                  {selectedRegistration.qrCodeData ? (
                    <img
                      src={selectedRegistration.qrCodeData}
                      alt="二维码"
                      className="w-48 h-48 mx-auto border-4 border-gray-100 rounded-lg"
                    />
                  ) : (
                    <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400">暂无二维码</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <div className="text-sm text-gray-500">活动名称</div>
                    <div className="font-medium">
                      {selectedRegistration.event?.title}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">票种</div>
                    <div className="font-medium">
                      {selectedRegistration.ticketType?.name} ×{" "}
                      {selectedRegistration.quantity}
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
                    <div className="font-medium">
                      {selectedRegistration.contactName}
                    </div>
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
                        selectedRegistration.status,
                      )}`}
                    >
                      {getStatusText(selectedRegistration.status)}
                    </span>
                  </div>
                </div>

                {selectedRegistration.checkedInAt && (
                  <div className="text-sm text-gray-500 bg-green-50 px-3 py-2 rounded">
                    ✅ 签到时间:{" "}
                    {format(
                      new Date(selectedRegistration.checkedInAt),
                      "yyyy-MM-dd HH:mm",
                    )}
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={() => downloadTicket(selectedRegistration)}
                    className="w-full bg-primary-600 text-white hover:bg-primary-700 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    下载电子票
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                <div className="text-center text-gray-500 py-8">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
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
