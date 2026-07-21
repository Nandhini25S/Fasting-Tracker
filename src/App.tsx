import React, { useState, useEffect } from "react";
import { PanchamiDay, FastingLog, FastingStreak, NotificationSettings } from "./types";
import { formatFastingDate, calculateStreak } from "./utils/fastingHelpers";
import PanchamiCalendar from "./components/PanchamiCalendar";
import AutomatedReminderHub from "./components/AutomatedReminderHub";
import {Flame, CheckCircle2, RefreshCw, Utensils, Sparkles, Info, ShieldCheck, MapPin, Compass} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const DAILY_MANTRAS = [
  {
    quote: "Om Sreem Hreem Kleem Varahi Devyei Namaha",
    label: "Goddess Varahi Beeja Mantra"
  },
  {
    quote: "Purity of food leads to purity of mind; purity of mind leads to steadfast devotion.",
    label: "Vedic Wisdom on Satvik Diet"
  },
  {
    quote: "Varahi Devi is the symbol of ultimate protection, strength, and righteous action.",
    label: "Varahi Purana Sacred Truth"
  },
  {
    quote: "By maintaining a strict satvik diet, we cleanse our temple to invite Varahi's divine grace.",
    label: "Spiritual Fasting Wisdom"
  },
  {
    quote: "Om Aim Hreem Shreem Gili Gili Varahi Deviye Namaha",
    label: "Maha Varahi Moolam"
  },
  {
    quote: "He who controls the palate, cleanses the soul and stays securely devoted.",
    label: "Traditional Fasting Maxim"
  }
];

export default function App() {
  const [panchamiDays, setPanchamiDays] = useState<PanchamiDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [viewedMonth, setViewedMonth] = useState<string>("");
  const [fastingLogs, setFastingLogs] = useState<FastingLog[]>([]);
  const [streakInfo, setStreakInfo] = useState<FastingStreak>({ currentStreak: 0, longestStreak: 0, lastFastedDate: null });
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, activeToday: false });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Browser notification settings
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    browserNotificationsEnabled: false,
    notifyOnDay: true,
    notifyEveningBefore: true,
    reminderHour: 8
  });

  // Current selected day's checklists
  const [vegOnly, setVegOnly] = useState(true);
  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);
  
  // Geolocation and hotel finder states
  const [hotelsList, setHotelsList] = useState<any[]>([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [hotelSearchError, setHotelSearchError] = useState("");

  // Load initial data
  useEffect(() => {
    // Set default selected date as today
    const todayStr = new Date().toISOString().split("T")[0];
    setSelectedDate(todayStr);
    setViewedMonth(todayStr.substring(0, 7));

    // Fetch Panchami days from API
    fetchPanchamiDays();

    // One-time reset to zero if desired, or let's clear the old logs once
    const hasResetLogs = localStorage.getItem("panchami_fasting_logs_reset_v3");
    if (!hasResetLogs) {
      localStorage.removeItem("panchami_fasting_logs");
      localStorage.setItem("panchami_fasting_logs_reset_v3", "true");
    }

    // Load logs and notification settings from local storage
    const savedLogs = localStorage.getItem("panchami_fasting_logs");
    if (savedLogs) {
      try {
        const parsedLogs = JSON.parse(savedLogs);
        setFastingLogs(parsedLogs);
        setStreakInfo(calculateStreak(parsedLogs));
      } catch (e) {
        console.error("Failed to load logs from localStorage", e);
      }
    }

    const savedSettings = localStorage.getItem("panchami_notification_settings");
    if (savedSettings) {
      try {
        setNotifSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }

    // Check browser notification permission state
    if ("Notification" in window) {
      setNotifSettings(prev => ({
        ...prev,
        browserNotificationsEnabled: Notification.permission === "granted"
      }));
    }
  }, []);

  // Update real-time clock and countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate countdown to next Panchami tithi
  useEffect(() => {
    if (panchamiDays.length === 0) return;

    const calculateCountdown = () => {
      const now = currentTime.getTime();
      const todayStr = currentTime.toISOString().split("T")[0];

      // Check if today is a Panchami day
      const todayPanchami = panchamiDays.find(d => d.date === todayStr);

      if (todayPanchami) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, activeToday: true });
        return;
      }

      // Find future Panchami days
      const futurePanchamis = panchamiDays
        .filter(d => new Date(d.date).getTime() > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (futurePanchamis.length === 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, activeToday: false });
        return;
      }

      const nextPanchami = futurePanchamis[0];
      // Target time is 00:00:00 on the day of the next Panchami
      const targetTime = new Date(nextPanchami.date + "T00:00:00").getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, activeToday: true });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeRemaining({ days, hours, minutes, seconds, activeToday: false });
      }
    };

    calculateCountdown();
  }, [panchamiDays, currentTime]);

  // Load checklist status whenever selectedDate changes
  useEffect(() => {
    const existingLog = fastingLogs.find(l => l.date === selectedDate);
    if (existingLog) {
      setVegOnly(existingLog.vegOnly);
      setCheckedTasks(existingLog.checkedTasks || []);
    } else {
      // Default state for non-logged day
      setVegOnly(true);
      setCheckedTasks([]);
    }
  }, [selectedDate, fastingLogs]);

  // Sync viewedMonth when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setViewedMonth(selectedDate.substring(0, 7));
    }
  }, [selectedDate]);

  const fetchPanchamiDays = async () => {
    try {
      const response = await fetch("/api/panchami");
      const data = await response.json();
      if (data.success) {
        setPanchamiDays(data.panchamiDays);
      }
    } catch (err) {
      console.error("Failed to load Panchami calendar", err);
      setError("Unable to connect to the backend calendar API.");
    }
  };

  // Sync calendar live using local astronomical computation (no external API)
  const handleLiveSync = async () => {
    setSyncing(true);
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch("/api/panchami/sync", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        setPanchamiDays(data.panchamiDays);
        setSuccessMsg("Panchangam updated live from astronomical sources!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setError(data.error || "Unable to sync with live astronomical data.");
      }
    } catch (err) {
      console.error("Live sync failed", err);
      setError("An error occurred while recomputing the calendar.");
    } finally {
      setSyncing(false);
    }
  };

  // Toggle checklist tasks
  const handleToggleTask = (taskId: string) => {
    if (selectedDate !== todayStr) {
      return;
    }
    const isChecked = checkedTasks.includes(taskId);
    let updatedTasks: string[];
    if (isChecked) {
      updatedTasks = checkedTasks.filter(id => id !== taskId);
    } else {
      updatedTasks = [...checkedTasks, taskId];
    }
    setCheckedTasks(updatedTasks);
    
    // Auto-save log
    saveFastingLog(selectedDate, "completed", vegOnly, updatedTasks);
  };

  // Toggle strict veg status
  const handleToggleVeg = () => {
    if (selectedDate !== todayStr) {
      return;
    }
    const nextVeg = !vegOnly;
    setVegOnly(nextVeg);
    saveFastingLog(selectedDate, nextVeg ? "completed" : "skipped", nextVeg, checkedTasks);
  };

  // Save/Update fasting log
  const saveFastingLog = (
    dateStr: string,
    status: "completed" | "skipped" | "partial",
    isVeg: boolean,
    tasks: string[]
  ) => {
    const updatedLogs = [...fastingLogs];
    const index = updatedLogs.findIndex(l => l.date === dateStr);

    const logPayload: FastingLog = {
      date: dateStr,
      status: isVeg ? "completed" : "skipped",
      vegOnly: isVeg,
      checkedTasks: tasks,
      notifiedMum: false,
      timestamp: Date.now()
    };

    if (index >= 0) {
      updatedLogs[index] = logPayload;
    } else {
      updatedLogs.push(logPayload);
    }

    setFastingLogs(updatedLogs);
    localStorage.setItem("panchami_fasting_logs", JSON.stringify(updatedLogs));
    setStreakInfo(calculateStreak(updatedLogs));

    // Show a success state
    if (isVeg && status === "completed") {
      setSuccessMsg("Fasting log saved! Keeping your promises strictly. 😊");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // Update log status directly from Calendar quick actions
  const handleAddQuickLog = (dateStr: string, status: "completed" | "skipped") => {
    const isVeg = status === "completed";
    saveFastingLog(dateStr, status, isVeg, isVeg ? ["veg", "water"] : []);
  };

  // Enable web push browser notifications
  const handleRequestNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const updated = { ...notifSettings, browserNotificationsEnabled: true };
        setNotifSettings(updated);
        localStorage.setItem("panchami_notification_settings", JSON.stringify(updated));
        
        new Notification("🔔 Tamil Panchami Fasting Tracker", {
          body: "Timely fasting notifications are now active! We will remind you to stay strictly veg.",
          icon: "/favicon.ico"
        });
      } else {
        alert("Notification permission denied. Please enable them in browser settings.");
      }
    } catch (e) {
      console.error("Notification permission request failed", e);
    }
  };

  // Duolingo style fast verification handler
  const handleVerifyFast = (dateStr: string, wasSuccessful: boolean) => {
    const todayStr = currentTime.toISOString().split("T")[0];
    
    saveFastingLog(
      dateStr,
      wasSuccessful ? "completed" : "skipped",
      wasSuccessful,
      wasSuccessful ? ["veg", "water", "prayers", "no-onion"] : []
    );
    
    if (wasSuccessful) {
      setSuccessMsg("Excellent! Vow verified. Your fasting streak lives on! Keep it up! 🥦🔥");
    } else {
      setError("Fasting broken! Your streak has been reset to 0, just like in Duolingo. Stay determined next time! 💪");
    }
    setTimeout(() => {
      setSuccessMsg("");
      setError("");
    }, 5000);
  };

  // Geolocation restaurant finder
  const handleFindWeekendHotels = () => {
    if (!navigator.geolocation) {
      setHotelSearchError("Geolocation is not supported by your browser.");
      return;
    }

    setFetchingLocation(true);
    setHotelSearchError("");
    setHotelsList([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          const response = await fetch("/api/panchami/hotels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
          });
          const data = await response.json();
          if (data.success) {
            setHotelsList(data.hotels);
          } else {
            setHotelSearchError(data.error || "Failed to search for nearby pure veg hotels.");
          }
        } catch (err) {
          console.error(err);
          setHotelSearchError("Could not connect to the restaurant finder service.");
        } finally {
          setFetchingLocation(false);
        }
      },
      (error) => {
        console.error(error);
        setFetchingLocation(false);
        setHotelSearchError("Permission to access location was denied. Showing Hyderabad fallback recommendations instead.");
        fallbackFetchHotels();
      },
      { timeout: 10000 }
    );
  };

  const fallbackFetchHotels = async () => {
    try {
      const response = await fetch("/api/panchami/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: 17.3850, lng: 78.4867 }), // Default Hyderabad coords for fallback
      });
      const data = await response.json();
      if (data.success) {
        setHotelsList(data.hotels);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Find if today is an unlogged Panchami fasting day
  const getTodayUnloggedPanchami = () => {
    const todayStr = currentTime.toISOString().split("T")[0];
    const todayPanchami = panchamiDays.find(d => d.date === todayStr);
    if (todayPanchami && !fastingLogs.some(log => log.date === todayStr)) {
      return todayPanchami;
    }
    return null;
  };

  const pendingVerify = getTodayUnloggedPanchami();

  // Check if tomorrow is a Panchami fasting day
  const getTomorrowPanchami = () => {
    const tomorrow = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    return panchamiDays.find(d => d.date === tomorrowStr);
  };
  const tomorrowPanchami = getTomorrowPanchami();

  // Identify next upcoming Panchami details
  const getNextPanchamiDetail = () => {
    const now = currentTime.getTime();
    const sorted = [...panchamiDays]
      .filter(d => new Date(d.date + "T00:00:00").getTime() >= new Date(currentTime.toISOString().split("T")[0]).getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted[0];
  };

  const nextPanchami = getNextPanchamiDetail();
  const todayStr = currentTime.toISOString().split("T")[0];
  const selectedDayPanchami = panchamiDays.find(d => d.date === selectedDate);
  const isSelectedToday = selectedDate === todayStr;
  const selectedDayLog = fastingLogs.find(l => l.date === selectedDate);

  // Check if selected date falls on a weekend
  const isSelectedWeekend = () => {
    if (!selectedDate) return false;
    const d = new Date(selectedDate + "T00:00:00");
    const day = d.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  // Calculate monthly stats for the viewed calendar month
  const activeMonth = viewedMonth || (selectedDate ? selectedDate.substring(0, 7) : "");
  const monthlyPanchamis = panchamiDays.filter(d => d.date.startsWith(activeMonth));
  const completedMonthlyPanchamis = monthlyPanchamis.filter(d => {
    const log = fastingLogs.find(l => l.date === d.date);
    return log && log.status === "completed" && log.vegOnly;
  });
  const totalMonthlyCount = monthlyPanchamis.length;
  const completedMonthlyCount = completedMonthlyPanchamis.length;
  const monthlyPercentage = totalMonthlyCount > 0 
    ? Math.round((completedMonthlyCount / totalMonthlyCount) * 100) 
    : 0;

  const currentMonthStr = currentTime.toISOString().split("T")[0].substring(0, 7);
  const isFutureMonth = activeMonth > currentMonthStr;

  const getSelectedMonthName = () => {
    const targetMonth = viewedMonth || (selectedDate ? selectedDate.substring(0, 7) : "");
    if (!targetMonth) return "";
    try {
      const [y, m] = targetMonth.split("-");
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      return d.toLocaleString("en-US", { month: "long", year: "numeric" });
    } catch {
      return "";
    }
  };

  // Find occurrence of the selected Panchami or next Panchami in its calendar year
  const getPanchamiOccurrenceNumber = () => {
    const targetPanchami = selectedDayPanchami || nextPanchami;
    if (!targetPanchami) return "05";
    const year = targetPanchami.date.split("-")[0];
    const yearPanchamis = panchamiDays
      .filter(d => d.date.startsWith(year))
      .sort((a, b) => a.date.localeCompare(b.date));
    const idx = yearPanchamis.findIndex(d => d.date === targetPanchami.date);
    if (idx === -1) return "05";
    const occurrence = idx + 1;
    return occurrence < 10 ? `0${occurrence}` : `${occurrence}`;
  };

  const occurrenceNumber = getPanchamiOccurrenceNumber();

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2D241E] flex flex-col font-sans transition-all selection:bg-orange-150" id="app-root">
      
      {/* Top Header Navigation - Designed strictly in Bento style */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end py-8 px-6 md:px-12 max-w-7xl w-full mx-auto" id="app-header">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#A68A64] mb-1">
            Goddess Varahi Devi Spiritual Vows & Alarms
          </span>
          <h1 className="text-4xl font-serif font-black italic text-[#4A3728]">
            Varahi <span className="text-[#C05621]">Sankalpa Panchami</span>
          </h1>
        </div>
        
        <div className="text-left md:text-right mt-4 md:mt-0 flex flex-col items-start md:items-end gap-1">
          <p className="text-lg font-serif italic text-[#4A3728]">
            {nextPanchami ? `${nextPanchami.tamilMonth} Month` : "Fasting Year"} • Panchangam
          </p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-[#8C7B65] font-mono">
              📅 {currentTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <button
              onClick={handleLiveSync}
              disabled={syncing}
              className="px-3 py-1 bg-[#F3EFE9] border border-[#EBE3D5] text-[#8C7B65] hover:bg-orange-50 hover:text-[#C05621] rounded-full text-[11px] font-bold tracking-tight active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              id="sync-btn"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Live"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard in a highly optimized Bento Grid */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-8" id="app-main">

        {/* Dynamic Tomorrow Panchami Fasting Reminder */}
        {tomorrowPanchami && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-amber-600 to-[#C05621] text-white p-5 rounded-[24px] shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#C05621]"
            id="tomorrow-fast-banner"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-orange-200">Fast Approaching</p>
                <p className="text-sm font-bold font-sans">
                  Hey, it's {tomorrowPanchami.paksha} Panchami tomorrow ({tomorrowPanchami.tamilMonth} Month)! Remember to prepare and keep your fast strictly vegetarian.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById("self-reminder-card");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-[#4A3728] hover:bg-[#34271c] text-[#FAF7F2] font-bold text-xs py-2 px-4 rounded-xl active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              id="scroll-to-reminder-btn"
            >
              Set Reminder Now
            </button>
          </motion.div>
        )}

        {/* Streak Guardian Verification Prompt */}
        <AnimatePresence>
          {pendingVerify && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 bg-[#4A3728] border-2 border-[#C05621] rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden shadow-xl"
              id="verify-card"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <Sparkles className="w-36 h-36 text-[#C05621]" />
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6 z-10 relative">
                <div className="flex-1 text-center md:text-left">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-orange-300 font-black block mb-1">
                    Vow Guardian
                  </span>
                  <h3 className="text-xl md:text-2xl font-serif font-black">
                    Did you really fast on {pendingVerify.tamilMonth} Month Panchami?
                  </h3>
                  <p className="text-xs text-orange-100/85 mt-1">
                    Fasting Date: {formatFastingDate(pendingVerify.date)} • Your current streak of <strong className="text-orange-300 font-black font-mono">{streakInfo.currentStreak}</strong> depends on this verification!
                  </p>
                </div>
                <div className="flex gap-3 shrink-0 w-full md:w-auto mt-4 md:mt-0">
                  <button
                    onClick={() => handleVerifyFast(pendingVerify.date, true)}
                    className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 px-6 rounded-2xl active:scale-95 transition-all cursor-pointer shadow-md"
                    id="verify-yes-btn"
                  >
                    Yes, kept it pure! 🥦
                  </button>
                  <button
                    onClick={() => handleVerifyFast(pendingVerify.date, false)}
                    className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3.5 px-6 rounded-2xl active:scale-95 transition-all cursor-pointer shadow-md"
                    id="verify-no-btn"
                  >
                    No, I missed it 😢
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error/Success Alert banners */}
        <AnimatePresence>
          {(error || successMsg) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
              id="alert-banners"
            >
              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 flex gap-3 text-rose-800 text-xs font-semibold">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">System Status: </span>
                    {error}
                  </div>
                </div>
              )}
              {successMsg && (
                <div className="bg-[#FAF7F2] border-2 border-emerald-600/30 rounded-3xl p-4 flex gap-3 text-emerald-800 text-xs font-semibold shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>{successMsg}</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* BENTO GRID STRUCTURE */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch" id="bento-grid">
          
          {/* Box 1: PRIMARY TARGET BOX - Active Tithi / Next Panchami (Col span 8) */}
          <div className="md:col-span-8 bg-white rounded-[32px] p-8 md:p-10 border border-[#EBE3D5] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[340px]" id="countdown-card">
            
            {/* Elegant Background Backdrop element representing the current Panchami's occurrence */}
            <div className="z-0 text-[100px] md:text-[120px] font-serif leading-none font-black text-[#C05621] opacity-5 absolute -top-4 -right-4 select-none pointer-events-none flex flex-col items-end">
              <span>{occurrenceNumber}</span>
              <span className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold -mt-3">Panchami of Year</span>
            </div>

            <div className="z-10">
              <span className="bg-[#F3EFE9] text-[#8C7B65] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest inline-block border border-[#EBE3D5]/40" id="fast-today-tag">
                {selectedDayPanchami 
                  ? (isSelectedToday ? "✨ FAST ACTIVE TODAY" : selectedDate < todayStr ? "📜 PAST FASTING DAY" : "📅 UPCOMING FASTING DAY")
                  : "🌙 PREPARATION MODE"
                }
              </span>
              
              {selectedDayPanchami ? (
                <div id="fasting-active-layout" className="mt-4">
                  <h2 className="text-4xl md:text-5xl font-serif font-black tracking-tight text-[#4A3728]">
                    {isSelectedToday ? "Today is Fasting Day!" : selectedDate < todayStr ? "Panchami Fast Day (Past)" : "Panchami Fast Day (Future)"}
                  </h2>
                  <p className="text-lg text-[#8C7B65] font-serif italic mt-2">
                    {selectedDayPanchami.paksha} Paksha • {selectedDayPanchami.tamilMonth} Month
                  </p>
                  <p className="text-sm text-[#4A3728] mt-3 max-w-xl leading-relaxed">
                    {isSelectedToday ? (
                      "Eat strictly vegetarian meals today. We've compiled fresh recipes & mindful tips on your right-hand dashboard to keep your fast pure and simple."
                    ) : selectedDate < todayStr ? (
                      selectedDayLog && selectedDayLog.status === "completed" && selectedDayLog.vegOnly ? (
                        "Splendid! You observed this fast purely with strict vegetarian meals and holy focus."
                      ) : (
                        "This fasting tithi has passed. Keep your spiritual dedication alive for future Panchamis."
                      )
                    ) : (
                      "This is an upcoming fasting day. Mentally prepare yourself to abstain from heavy or non-vegetarian foods and maintain holy focus."
                    )}
                  </p>
                </div>
              ) : (
                <div id="countdown-timer-layout" className="mt-4">
                  <h2 className="text-4xl md:text-5xl font-serif font-black tracking-tight text-[#4A3728]">
                    {isSelectedToday ? "Next Panchami" : selectedDate < todayStr ? "Standard Vegetarian Day" : "Future Preparation Day"}
                  </h2>
                  <p className="text-lg text-[#8C7B65] font-serif italic mt-2">
                    {isSelectedToday && nextPanchami ? (
                      `${nextPanchami.paksha} Paksha • ${nextPanchami.tamilMonth} Month`
                    ) : (
                      "Spiritual Cleanliness & Devotion"
                    )}
                  </p>
                  <p className="text-sm text-[#4A3728] mt-3 max-w-xl leading-relaxed">
                    {isSelectedToday ? (
                      nextPanchami ? `Starts on ${formatFastingDate(nextPanchami.date)}. Focus on simple vegetarian preparation as the holy tithi approaches.` : "Calculating next Panchami..."
                    ) : selectedDate < todayStr ? (
                      "A non-fasting date in the past. Adhering to daily pure vegetarian principles preserves physical and spiritual purity between fasts."
                    ) : (
                      "A non-fasting preparation date in the future. Keep eating clean, satvik vegetarian meals to build internal discipline."
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Countdown or Active state footer */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mt-8 z-10 pt-6 border-t border-dashed border-[#EBE3D5]" id="bento-card-footer">
              {!selectedDayPanchami && isSelectedToday && nextPanchami ? (
                <div className="flex items-center gap-6" id="countdown-nums-box">
                  <div className="flex flex-col">
                    <span className="text-4xl font-bold font-sans tracking-tight text-[#4A3728] tabular-nums">{timeRemaining.days}</span>
                    <span className="text-[10px] uppercase tracking-widest text-[#8C7B65] font-semibold mt-1">Days</span>
                  </div>
                  <div className="text-3xl text-[#EBE3D5] font-light">/</div>
                  <div className="flex flex-col">
                    <span className="text-4xl font-bold font-sans tracking-tight text-[#4A3728] tabular-nums">{timeRemaining.hours}</span>
                    <span className="text-[10px] uppercase tracking-widest text-[#8C7B65] font-semibold mt-1">Hours</span>
                  </div>
                  <div className="text-3xl text-[#EBE3D5] font-light">/</div>
                  <div className="flex flex-col">
                    <span className="text-4xl font-bold font-sans tracking-tight text-[#4A3728] tabular-nums">{timeRemaining.minutes}</span>
                    <span className="text-[10px] uppercase tracking-widest text-[#8C7B65] font-semibold mt-1">Mins</span>
                  </div>
                </div>
              ) : selectedDayPanchami ? (
                <div className="flex items-center gap-2 text-emerald-800 font-sans font-semibold text-sm" id="active-purity-label">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  {isSelectedToday 
                    ? "Your strict vegetarian fast is active for today." 
                    : selectedDate < todayStr 
                      ? "Panchami record preserved." 
                      : "Prepare for upcoming fasting tithi."}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[#8C7B65] font-sans font-semibold text-sm" id="prep-purity-label">
                  <ShieldCheck className="w-5 h-5 text-[#8C7B65]" />
                  Pure Vegetarian Diet Active.
                </div>
              )}

              {selectedDayPanchami ? (
                <div className="bg-[#2F855A] text-[#FAF7F2] px-6 py-4 rounded-2xl flex flex-col items-start shadow-sm" id="fast-timing-badge">
                  <span className="text-[10px] uppercase tracking-wider opacity-85 mb-0.5">Tithi Ends At</span>
                  <span className="text-md font-sans font-bold">{selectedDayPanchami.tithiEnd}</span>
                </div>
              ) : (
                nextPanchami && (
                  <div className="bg-[#4a584e] text-[#FAF7F2] px-6 py-4 rounded-2xl flex flex-col items-start shadow-sm" id="fast-timing-badge">
                    <span className="text-[10px] uppercase tracking-wider opacity-85 mb-0.5">Next Fast Starts</span>
                    <span className="text-md font-sans font-bold">{formatFastingDate(nextPanchami.date)}</span>
                  </div>
                )
              )}
            </div>

          </div>

          {/* Box 3: DISCIPLINE PROGRESS METER (Col span 4) */}
          <div className="md:col-span-4 bg-[#F3EFE9] rounded-[32px] p-8 flex flex-col justify-between border border-[#EBE3D5] min-h-[340px]" id="discipline-progress-card">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#8C7B65] font-bold block">
                Fasting Vows
              </span>
              <h3 className="text-2xl font-serif font-black text-[#4A3728] mt-1">
                Monthly Score
              </h3>
              <p className="text-xs text-[#8C7B65] font-mono mt-0.5">
                {getSelectedMonthName()}
              </p>
            </div>

            <div className="flex flex-col gap-3 my-4">
              <div className="flex justify-between items-end">
                <span className="text-md font-serif italic text-[#8C7B65]">Sankalpa Power</span>
                <span className="text-lg font-bold text-[#C05621] font-mono">{monthlyPercentage}%</span>
              </div>
              <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-[#EBE3D5]/50">
                <div 
                  className="h-full bg-[#C05621] transition-all duration-500 rounded-full"
                  style={{ width: `${monthlyPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2" id="streak-indicator-footer">
              <Flame className="w-4 h-4 text-[#C05621] fill-[#C05621]" />
              <p className="text-xs text-[#8C7B65] font-sans">
                {isFutureMonth ? (
                  <>
                    To be on fast: <span className="font-bold text-[#4A3728]">{totalMonthlyCount}</span> Panchamis scheduled this month!
                  </>
                ) : (
                  <>
                    Fasted on <span className="font-bold text-[#4A3728]">{completedMonthlyCount}</span> of <span className="font-bold text-[#4A3728]">{totalMonthlyCount}</span> Panchamis this month!
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Box 4: DIET MODE / PURE VEG INDICATOR (Col span 6) */}
          <div 
            className={`md:col-span-6 rounded-[32px] p-8 text-white flex flex-col justify-between shadow-lg min-h-[260px] transition-all duration-500 ${
              selectedDayPanchami 
                ? "bg-[#2F855A] shadow-[0_4px_20px_rgba(47,133,90,0.15)]" 
                : "bg-[#4a584e]"
            }`} 
            id="diet-mode-card"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] animate-pulse ${
                  selectedDayPanchami ? "bg-[#9AE6B4] text-[#9AE6B4]" : "bg-neutral-400 text-neutral-400"
                }`}></div>
                <span className="text-[10px] uppercase tracking-widest opacity-80 font-bold">
                  {selectedDayPanchami ? "Diet Mode: Strict Satvic Fast" : "Diet Mode: Standard Diet"}
                </span>
              </div>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white font-mono uppercase font-bold tracking-wider">
                {selectedDayPanchami ? "Active Fast" : "No Active Fast"}
              </span>
            </div>

            <div className="my-4">
              <h3 className="text-3xl font-serif font-bold italic mb-1 font-black">
                {selectedDayPanchami ? "Strict Satvic Food Only" : "Standard Diet"}
              </h3>
              <p className="text-xs opacity-80 leading-relaxed">
                {selectedDayPanchami 
                  ? "Today is a sacred Varahi Panchami. Maintain 100% pure vegetarian preparation. strictly no meat, fish, eggs, onion, or garlic."
                  : "No fasting tithi is active today. You are free to follow your regular dietary choices. The strict satvik vow is only observed on sacred Panchami days."
                }
              </p>
            </div>
          </div>

          {/* Box 5: DECORATIVE PHILOSOPHICAL QUOTE (Col span 6 or 12 depending on checklist existence) */}
          <div 
            className={`${
              selectedDayPanchami ? "md:col-span-6" : "md:col-span-12"
            } bg-[#FDF6EC] border border-[#C05621] border-dashed rounded-[32px] p-8 flex items-center justify-center text-center min-h-[260px] transition-all duration-500`} 
            id="quote-card"
          >
            <div className="flex flex-col items-center">
              <div className="text-[#C05621] mb-3">
                <Utensils className="w-10 h-10" />
              </div>
              <p className="text-md italic font-serif text-[#4A3728] leading-relaxed max-w-md">
                "{DAILY_MANTRAS[new Date().getDate() % DAILY_MANTRAS.length].quote}"
              </p>
              <span className="text-[10px] text-[#A68A64] font-mono uppercase tracking-widest mt-3 block font-bold">
                {DAILY_MANTRAS[new Date().getDate() % DAILY_MANTRAS.length].label}
              </span>
            </div>
          </div>

          {/* Box 6: ACTIVE DAY CHECKLIST (Only shown on Panchami days) */}
          {selectedDayPanchami && (
            <div 
              className={`md:col-span-6 bg-white rounded-[32px] p-8 border border-[#EBE3D5] shadow-sm transition-all duration-300 ${
                !isSelectedToday ? "opacity-60" : ""
              }`} 
              id="checklist-card"
            >
              <div className="flex justify-between items-center mb-6" id="checklist-header">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#8C7B65] font-bold block">
                    {isSelectedToday ? "Companion" : "Fasting Day"}
                  </span>
                  <h3 className="text-xl font-serif font-black text-[#4A3728] mt-0.5">
                    Fasting Checklist
                  </h3>
                </div>
                {isSelectedToday && (
                  <span className="bg-[#FDF6EC] text-[#C05621] text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg">
                    TODAY
                  </span>
                )}
              </div>

              <div className="space-y-3" id="checklist-items">
                {[
                  { id: "water", label: "Hydration Check", desc: "Drink pure healthy water or cool tender coconut" },
                  { id: "prayers", label: "Devotional Prayers", desc: "Spend 5 minutes in pure silent meditation" },
                  { id: "no-onion", label: "No Onion & Garlic", desc: "Avoid stimulating foods (Optional Satvik vow)" }
                ].map((task) => {
                  const isCompleted = checkedTasks.includes(task.id);
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`w-full flex items-center justify-between p-4 hover:bg-[#FAF7F2]/50 rounded-2xl border border-[#EBE3D5]/50 transition-all text-left group ${
                        !isSelectedToday ? "cursor-not-allowed" : "cursor-pointer"
                      }`}
                      id={`task-btn-${task.id}`}
                    >
                      <div>
                        <span className={`text-xs font-semibold block transition-all ${isCompleted ? "text-neutral-400 line-through" : "text-[#4A3728]"}`}>
                          {task.label}
                        </span>
                        <span className="text-[10px] text-[#8C7B65] block mt-0.5">{task.desc}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
                        isCompleted 
                          ? "bg-[#C05621] border-[#C05621] text-white" 
                          : "border-[#EBE3D5] group-hover:border-[#C05621]/40"
                      }`}>
                        {isCompleted && <span className="text-xs font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Box 7: MONTHLY INTERACTIVE CALENDAR (Col span 6) */}
          <div className="md:col-span-6 flex flex-col justify-between" id="bento-calendar-wrapper">
            <PanchamiCalendar
              panchamiDays={panchamiDays}
              fastingLogs={fastingLogs}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onAddLog={handleAddQuickLog}
              onMonthChange={(year, month) => {
                const monthStr = String(month + 1).padStart(2, "0");
                setViewedMonth(`${year}-${monthStr}`);
              }}
            />
          </div>

          {/* Box 8: AUTOMATED REMINDERS COMPONENT (Col span 12) */}
          <div className="md:col-span-12 flex flex-col justify-between" id="bento-sharing-wrapper">
            <AutomatedReminderHub
              activeDate={selectedDate}
              paksha={selectedDayPanchami?.paksha || "Shukla"}
              tamilMonth={selectedDayPanchami?.tamilMonth || "Thai"}
              panchamiDays={panchamiDays}
            />
          </div>

          {/* Box 10: WEEKEND PURE VEG DINER & GEOLOCATION HOTEL FINDER (Col span 12 - Appears dynamically only on weekends) */}
          {selectedDayPanchami && isSelectedWeekend() && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-12 bg-gradient-to-r from-[#FDF6EC] to-white border-2 border-[#C05621]/20 rounded-[32px] p-6 md:p-8 shadow-sm relative overflow-hidden"
              id="weekend-dining-card"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Compass className="w-56 h-56 text-[#C05621]" />
              </div>

              <div className="flex flex-col lg:flex-row items-stretch gap-8 z-10 relative">
                {/* Intro Section */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#C05621] font-black block mb-1">
                      Weekend Satvik Dining Planner
                    </span>
                    <h3 className="text-2xl md:text-3xl font-serif font-black text-[#4A3728] leading-tight">
                      Enjoy a Pure Veg Meal this Weekend!
                    </h3>
                    <p className="text-xs text-[#8C7B65] mt-2 leading-relaxed">
                      This Panchami falls on a weekend! Take a break from cooking. Fetch your exact location to find highly recommended 100% pure vegetarian restaurants and curated dishes nearby.
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      onClick={handleFindWeekendHotels}
                      disabled={fetchingLocation}
                      className="bg-[#C05621] hover:bg-[#ab4919] active:scale-95 text-white font-bold text-xs py-3.5 px-6 rounded-2xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
                      id="find-location-hotels-btn"
                    >
                      <MapPin className="w-4 h-4 fill-white text-[#C05621]" />
                      {fetchingLocation ? "Locating & Searching..." : "📍 Find Pure Veg Restaurants Nearby"}
                    </button>
                  </div>

                  {hotelSearchError && (
                    <p className="text-[11px] text-amber-700 font-semibold mt-3 bg-amber-50 border border-amber-200/50 rounded-xl px-3 py-2">
                      {hotelSearchError}
                    </p>
                  )}
                </div>

                {/* Recommendations List */}
                <div className="flex-1 bg-[#FAF7F2] border border-[#EBE3D5] rounded-2xl p-5 md:p-6 flex flex-col justify-center min-h-[220px]">
                  {hotelsList.length > 0 ? (
                    <div className="space-y-5" id="hotels-list-results">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-[#C05621]" />
                        <span className="text-[10px] font-mono font-bold text-[#8C7B65] tracking-wider uppercase">SATVIK OPTIONS FOUND NEAR YOU</span>
                      </div>
                      {hotelsList.map((hotel, index) => (
                        <div key={index} className="border-b border-[#EBE3D5]/60 last:border-0 pb-4 last:pb-0" id={`hotel-item-${index}`}>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-sm font-serif font-black text-[#4A3728]">
                              {hotel.name}
                            </h4>
                            <span className="text-[9px] font-mono font-bold bg-[#FAF7F2] border border-[#EBE3D5] text-[#8C7B65] px-2 py-0.5 rounded-md">
                              {hotel.distanceHint}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8C7B65] mt-1 leading-relaxed">
                            {hotel.reason}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {hotel.dishes.map((dish: string, dIdx: number) => (
                              <span key={dIdx} className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-lg">
                                🥦 {dish}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 flex flex-col items-center justify-center gap-3">
                      <Utensils className="w-8 h-8 text-[#A68A64] opacity-40" />
                      <p className="text-xs text-[#8C7B65] font-sans font-medium max-w-xs">
                        Click the location button above to fetch real-time vegetarian dining recommendations customized to where you are right now!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </div>

      </main>

      {/* Beautiful Bento-themed Footer */}
      <footer className="bg-white border-t border-[#EBE3D5] mt-16 py-12 px-6 text-center text-[#8C7B65]" id="app-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-sans font-medium">
             Sankalpa Panchami Fasting Tracker • Devoted to healthy living & family happiness.
          </p>
          <div className="flex gap-6 text-xs font-mono" id="footer-links">
            <span className="text-[#C05621] font-bold">Pure Satvik Protocol</span>
            <span>Astro-Engine Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

