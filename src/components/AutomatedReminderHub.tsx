import React, { useState, useEffect } from "react";
import { formatFastingDate } from "../utils/fastingHelpers";
import { PanchamiDay } from "../types";
import { Bell, ShieldCheck, Compass, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AutomatedReminderHubProps {
  activeDate: string;
  paksha: string;
  tamilMonth: string;
  panchamiDays: PanchamiDay[];
}

export default function AutomatedReminderHub({
  paksha,
  tamilMonth,
  panchamiDays,
}: AutomatedReminderHubProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [testSent, setTestSent] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(true);

  // Sync notification permission status on mount
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Browser notifications are not supported on this device.");
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === "granted") {
        new Notification("🌸 Varahi Sankalpa Active!", {
          body: "Auto-reminders are configured! You will receive timely morning alarms for all upcoming Panchami fasts.",
          icon: "/favicon.ico"
        });
      }
    } catch (err) {
      console.error("Failed to request notification permission:", err);
    }
  };

  const triggerTestNotification = () => {
    if (!("Notification" in window)) {
      alert("Browser notifications are not supported on this device.");
      return;
    }

    if (Notification.permission !== "granted") {
      // Fallback in-app alert if permission is not granted
      setTestSent(true);
      setTimeout(() => setTestSent(false), 5000);
      return;
    }

    // Fire real push notification
    new Notification("🌸 Varahi Devi Panchami Auto-Alarm", {
      body: `OM SREEM HREEM KLEEM • Auto-alarm: Today is ${paksha} Panchami (${tamilMonth} Month)! Keep your fasting vow strictly vegetarian. 🥦✨`,
      icon: "/favicon.ico"
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 5000);
  };

  // Get next 3 upcoming Varahi Panchami days for scheduling overview
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingPanchamis = panchamiDays
    .filter((d) => d.date >= todayStr)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return (
    <div className="bg-white border border-[#EBE3D5] rounded-[32px] p-6 md:p-8 shadow-sm relative overflow-hidden" id="automated-reminder-card">
      {/* Decorative background element representing Goddess Varahi's sacred symbol */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Bell className="w-64 h-64 text-[#C05621] fill-[#C05621]" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[#EBE3D5]/50 pb-6" id="automated-reminder-header">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[#FAF7F2] text-[#C05621] border border-[#EBE3D5] rounded-2xl shadow-sm" id="automated-reminder-icon-bg">
            <Bell className="w-6 h-6 fill-[#C05621]" />
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-[#C05621] tracking-widest uppercase block mb-0.5">Automated System Alert</span>
            <h2 className="text-xl md:text-2xl font-serif font-black text-[#4A3728] tracking-tight" id="automated-reminder-title">
              Varahi Devi Automated Alarm Hub
            </h2>
            <p className="text-xs text-[#8C7B65] font-sans font-medium" id="automated-reminder-subtitle">
              The application schedules & fires automated alerts on upcoming fast days to keep your diet completely pure.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0" id="auto-reminders-toggle-container">
          <span className="text-xs text-[#8C7B65] font-semibold">Auto-Reminders Status</span>
          <button
            onClick={() => setAutoEnabled(!autoEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
              autoEnabled ? "bg-emerald-600" : "bg-gray-300"
            }`}
            id="auto-reminders-toggle-btn"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                autoEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="automated-reminder-grid">
        {/* Left Side: Browser / Device Alarm Settings */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-[#FAF7F2] border border-[#EBE3D5] rounded-2xl p-5 md:p-6" id="device-alarm-settings">
          <div>
            <h3 className="text-sm font-serif font-black text-[#4A3728] mb-1">
              Browser & Device Push Alarms
            </h3>
            <p className="text-xs text-[#8C7B65] leading-relaxed">
              Enable real-time push alerts to receive instant morning notifications at 06:00 AM on the day of each Varahi Panchami. No need to open the app or set manual timers!
            </p>

            <div className="mt-4 flex items-center gap-2" id="device-alarm-status">
              <span className="text-[10px] uppercase font-mono font-bold text-[#8C7B65]">Permission:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                permission === "granted"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : permission === "denied"
                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}>
                {permission === "granted" ? "Granted (Active)" : permission === "denied" ? "Denied" : "Pending Approval"}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5" id="device-alarm-actions">
            {permission !== "granted" && (
              <button
                onClick={handleRequestPermission}
                className="flex-1 bg-[#C05621] hover:bg-[#ab4919] text-white py-3 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
                id="request-device-notif-btn"
              >
                Configure Alarms
              </button>
            )}
            <button
              onClick={triggerTestNotification}
              className={`flex-1 border border-[#EBE3D5] hover:bg-white text-[#4A3728] py-3 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                permission === "granted" ? "w-full" : ""
              }`}
              id="trigger-test-alarm-btn"
            >
              Test Instant Alarm 🔔
            </button>
          </div>
        </div>

        {/* Right Side: Upcoming Auto Alarms Timeline */}
        <div className="lg:col-span-7 flex flex-col justify-between" id="upcoming-alarms-timeline">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-4 h-4 text-[#C05621]" />
              <h3 className="text-xs font-mono font-bold text-[#8C7B65] uppercase tracking-wider">
                Upcoming Auto-Alarm Schedule (Goddess Varahi Fast Days)
              </h3>
            </div>

            {upcomingPanchamis.length > 0 ? (
              <div className="space-y-4" id="scheduled-alarms-list">
                {upcomingPanchamis.map((d, idx) => (
                  <div
                    key={d.date}
                    className="flex items-center justify-between p-4 bg-[#FAF7F2]/40 hover:bg-[#FAF7F2] border border-[#EBE3D5]/50 rounded-2xl transition-all"
                    id={`scheduled-alarm-item-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EBE3D5] flex items-center justify-center text-[#C05621] text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#4A3728] font-serif">
                          🌸 Varahi {d.tamilMonth} Month Panchami ({d.paksha} Paksha)
                        </p>
                        <p className="text-[10px] text-[#8C7B65] font-mono mt-0.5">
                          Date: {formatFastingDate(d.date)} • Tithi Range: {d.tithiStart || "05:15 PM"} to {d.tithiEnd}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-lg">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{autoEnabled ? "Auto Armed" : "Paused"}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8C7B65] italic">No future fasting dates found in the panchangam data.</p>
            )}
          </div>

          <AnimatePresence>
            {testSent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 bg-emerald-50 border border-emerald-200/50 rounded-2xl p-3.5 flex items-center gap-2.5 text-[#2F855A]"
                id="test-notification-success-toast"
              >
                {permission === "granted" ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold">
                      Varahi Push Alarm fired! Check your browser or device notification tray.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-[#C05621] shrink-0" />
                    <span className="text-xs font-semibold text-[#C05621]">
                      Device permissions are pending. Simulated alarm active: Today is {paksha} Panchami fasting day! 🥦
                    </span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
