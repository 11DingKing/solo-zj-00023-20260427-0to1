"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { apiClient, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Registration, UserRole, RegistrationStatus } from "@/types";
import { toast } from "@/components/Toast";
import { format } from "date-fns";

const playBeep = (
  frequency: number = 1000,
  duration: number = 150,
  type: OscillatorType = "sine",
) => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration / 1000,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);

    setTimeout(() => {
      audioContext.close().catch(() => {});
    }, duration + 100);
  } catch (error) {
    console.error("Failed to play beep:", error);
  }
};

const playSuccessBeep = () => {
  playBeep(1000, 150, "sine");
  setTimeout(() => playBeep(1200, 150, "sine"), 100);
};

const playErrorBeep = () => {
  playBeep(300, 300, "square");
};

const getCheckinErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "message" in err) {
    const error = err as ApiError;
    const msg = error.message;

    if (msg === "Registration not found") {
      return "订单不存在，请检查订单号是否正确";
    }
    if (msg === "Already checked in") {
      return "已签到，请勿重复签到";
    }
    if (msg === "Registration is not confirmed") {
      return "报名未确认，无法签到";
    }
    if (msg === "Registration is cancelled") {
      return "报名已取消，无法签到";
    }
    if (msg === "Event has not started") {
      return "活动尚未开始，无法签到";
    }
    if (msg === "Event has ended") {
      return "活动已结束，无法签到";
    }
    if (msg.includes("Authentication") || msg.includes("token")) {
      return "登录已过期，请重新登录";
    }

    return msg;
  }
  return err instanceof Error ? err.message : "签到失败，请稍后重试";
};

const getFriendlyCheckinMessage = (message: string): string => {
  if (message === "Registration not found") {
    return "订单不存在";
  }
  if (message === "Already checked in") {
    return "已签到";
  }
  if (message === "Registration is not confirmed") {
    return "报名未确认";
  }
  if (message === "Registration is cancelled") {
    return "报名已取消";
  }
  if (message === "Event has not started") {
    return "活动未开始";
  }
  if (message === "Event has ended") {
    return "活动已结束";
  }
  if (message.includes("Authentication") || message.includes("token")) {
    return "登录已过期";
  }
  if (message.includes("签到成功")) {
    return message;
  }
  return "签到失败";
};

export default function CheckinPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [scanning, setScanning] = useState(false);
  const [manualOrderNumber, setManualOrderNumber] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkedRegistration, setCheckedRegistration] =
    useState<Registration | null>(null);
  const [history, setHistory] = useState<
    { orderNumber: string; success: boolean; message: string; time: Date }[]
  >([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader";

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      toast.info("请先登录");
      router.push("/login");
      return;
    }

    if (user?.role !== UserRole.ORGANIZER) {
      toast.warning("您没有权限访问此页面");
      router.push("/");
      return;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isAuthenticated, authLoading, user, router]);

  const startScanning = async () => {
    setError("");
    setSuccess("");

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await handleCheckin(decodedText);
        },
        (errorMessage) => {
          console.log("Scan error:", errorMessage);
        },
      );

      setScanning(true);
      toast.info("摄像头已启动，将二维码放入框内");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "无法启动摄像头";
      setError(message);
      toast.error("无法启动摄像头，请检查权限设置");
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        toast.info("扫描已停止");
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
      setScanning(false);
    }
  };

  const handleCheckin = async (orderNumber: string) => {
    setError("");
    setSuccess("");

    try {
      const registration = await apiClient.checkIn(orderNumber);
      const successMsg = `签到成功: ${registration.contactName}`;
      setSuccess(successMsg);
      setCheckedRegistration(registration);

      setHistory((prev) => [
        {
          orderNumber,
          success: true,
          message: successMsg,
          time: new Date(),
        },
        ...prev.slice(0, 9),
      ]);

      toast.success(successMsg);
      playSuccessBeep();
    } catch (err: unknown) {
      const friendlyMessage = getCheckinErrorMessage(err);
      const historyMessage = getFriendlyCheckinMessage(
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : friendlyMessage,
      );

      setError(friendlyMessage);

      setHistory((prev) => [
        {
          orderNumber,
          success: false,
          message: historyMessage,
          time: new Date(),
        },
        ...prev.slice(0, 9),
      ]);

      toast.error(friendlyMessage);
      playErrorBeep();
    }
  };

  const handleManualCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualOrderNumber.trim()) {
      handleCheckin(manualOrderNumber.trim());
      setManualOrderNumber("");
    } else {
      toast.warning("请输入订单号");
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
            className="w-full aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden flex items-center justify-center"
          >
            {!scanning && (
              <div className="text-center text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                <p>点击下方按钮开始扫描</p>
              </div>
            )}
          </div>

          {!scanning ? (
            <button
              onClick={startScanning}
              className="w-full bg-green-600 text-white hover:bg-green-700 py-3 rounded-lg font-medium transition-colors"
            >
              开始扫描
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="w-full bg-red-600 text-white hover:bg-red-700 py-3 rounded-lg font-medium transition-colors"
            >
              停止扫描
            </button>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              手动输入订单号
            </h3>
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
                className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-lg font-medium transition-colors"
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
                  <div className="font-medium">
                    {checkedRegistration.event?.title}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">订单号</div>
                  <div className="font-mono font-medium">
                    {checkedRegistration.orderNumber}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">联系人</div>
                  <div className="font-medium">
                    {checkedRegistration.contactName}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">联系方式</div>
                  <div>{checkedRegistration.contactPhone}</div>
                  <div className="text-sm text-gray-600">
                    {checkedRegistration.contactEmail}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">票种</div>
                  <div>
                    {checkedRegistration.ticketType?.name} ×{" "}
                    {checkedRegistration.quantity}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">签到时间</div>
                  <div className="font-medium text-green-600">
                    {checkedRegistration.checkedInAt
                      ? format(
                          new Date(checkedRegistration.checkedInAt),
                          "yyyy-MM-dd HH:mm:ss",
                        )
                      : "-"}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">签到历史</h2>

            {history.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <svg
                  className="w-12 h-12 mx-auto mb-2 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                暂无签到记录
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      item.success ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.success ? "bg-green-100" : "bg-red-100"
                        }`}
                      >
                        {item.success ? (
                          <svg
                            className="w-5 h-5 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div
                          className={`font-medium ${
                            item.success ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {item.message}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {item.orderNumber}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(item.time, "HH:mm:ss")}
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
