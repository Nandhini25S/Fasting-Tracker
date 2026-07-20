import React, { useState } from "react";
import { PanchamiDay, FastingLog } from "../types";
import { formatMonthDay, formatFastingDate, getTithiRange } from "../utils/fastingHelpers";
import { ChevronLeft, ChevronRight, CalendarCheck, Sparkles, LogIn } from "lucide-react";
import { motion } from "motion/react";

interface PanchamiCalendarProps {
  panchamiDays: PanchamiDay[];
  fastingLogs: FastingLog[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onAddLog: (dateStr: string, status: "completed" | "skipped") => void;
  onMonthChange?: (year: number, month: number) => void;
}

export default function PanchamiCalendar({
  panchamiDays,
  fastingLogs,
  selectedDate,
  onSelectDate,
  onAddLog,
  onMonthChange,
}: PanchamiCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Sync currentDate if selectedDate changes from outside (or when initialized)
  React.useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate + "T00:00:00");
      if (!isNaN(d.getTime())) {
        setCurrentDate(d);
      }
    }
  }, [selectedDate]);

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const monthsEnglish = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper to change month
  const prevMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
    if (onMonthChange) {
      onMonthChange(newDate.getFullYear(), newDate.getMonth());
    }
  };

  const nextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    setCurrentDate(newDate);
    if (onMonthChange) {
      onMonthChange(newDate.getFullYear(), newDate.getMonth());
    }
  };

  // Check if a specific date is a Panchami day
  const getPanchamiForDate = (dateStr: string): PanchamiDay | undefined => {
    return panchamiDays.find((d) => d.date === dateStr);
  };

  // Check if a fasting log exists for a date
  const getLogForDate = (dateStr: string): FastingLog | undefined => {
    return fastingLogs.find((l) => l.date === dateStr);
  };

  // Calendar grid preparation
  const daysArray = [];
  // Empty slots for previous month offset
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const selectedDayPanchami = getPanchamiForDate(selectedDate);
  const selectedDayLog = getLogForDate(selectedDate);

  return (
    <div className="bg-white border border-[#EBE3D5] rounded-[32px] p-6 shadow-sm overflow-hidden" id="calendar-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif font-black text-[#4A3728] tracking-tight" id="calendar-title">
            {monthsEnglish[month]} {year}
          </h2>
          <p className="text-xs text-[#C05621] font-mono mt-0.5" id="calendar-subtitle">
            Tamil Lunar Calendar Tracker
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-[#F3EFE9] active:scale-95 border border-[#EBE3D5] rounded-xl text-[#4A3728] transition-all cursor-pointer"
            id="prev-month-btn"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-[#F3EFE9] active:scale-95 border border-[#EBE3D5] rounded-xl text-[#4A3728] transition-all cursor-pointer"
            id="next-month-btn"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2" id="weekdays-grid">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, i) => (
          <div
            key={i}
            className={`text-xs font-bold py-1.5 ${
              i === 0 || i === 6 ? "text-[#C05621]" : "text-[#8C7B65]"
            }`}
            id={`weekday-${day}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center" id="calendar-days-grid">
        {daysArray.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = selectedDate === dayStr;
          const panchami = getPanchamiForDate(dayStr);
          const log = getLogForDate(dayStr);

          let bgClass = "hover:bg-[#F3EFE9] text-[#2D241E]";
          let borderClass = "border border-transparent";

          if (panchami) {
            if (panchami.paksha === "Shukla") {
              bgClass = "bg-[#FDF6EC] text-[#C05621] font-bold";
              borderClass = "border border-[#C05621]";
            } else {
              bgClass = "bg-[#F3EFE9] text-[#4A3728] font-bold";
              borderClass = "border border-[#8C7B65]";
            }
          }

          if (isSelected) {
            bgClass = panchami
              ? panchami.paksha === "Shukla"
                ? "bg-[#C05621] text-white font-bold"
                : "bg-[#4A3728] text-white font-bold"
              : "bg-[#2D241E] text-white font-medium";
            borderClass = "border-2 border-orange-300 ring-2 ring-orange-100/50";
          }

          // Decide what status icon to overlay
          let iconOverlay = null;
          if (log) {
            if (log.status === "completed") {
              iconOverlay = (
                <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-[#2F855A] rounded-full border border-white" />
              );
            } else if (log.status === "skipped") {
              iconOverlay = (
                <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white" />
              );
            }
          }

          return (
            <button
              key={day}
              onClick={() => onSelectDate(dayStr)}
              className={`aspect-square relative rounded-xl flex flex-col items-center justify-center text-sm transition-all duration-200 active:scale-95 cursor-pointer ${bgClass} ${borderClass}`}
              id={`day-${dayStr}`}
            >
              <span>{day}</span>
              {panchami && !isSelected && (
                <span className={`text-[7px] mt-0.5 px-1 py-0.1 rounded font-mono ${
                  panchami.paksha === "Shukla" 
                    ? "bg-[#FAF7F2] text-[#C05621] font-bold" 
                    : "bg-white text-[#8C7B65] font-bold"
                }`}>
                  Varahi
                </span>
              )}
              {iconOverlay}
            </button>
          );
        })}
      </div>

      {/* Selected Day details */}
      <div className="mt-6 pt-5 border-t border-dashed border-[#EBE3D5]" id="selected-day-details">
        {selectedDayPanchami ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#FDF6EC] border border-[#C05621]/30 rounded-2xl p-4"
            id="panchami-detail-card"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  selectedDayPanchami.paksha === "Shukla"
                    ? "bg-[#F3EFE9] text-[#C05621] border border-[#C05621]/20"
                    : "bg-[#F3EFE9] text-[#4A3728] border border-[#8C7B65]/20"
                }`}>
                  <Sparkles className="w-3 h-3" />
                  Varahi {selectedDayPanchami.paksha} Panchami
                </span>
                <h3 className="font-serif font-black text-[#4A3728] mt-3 text-lg leading-tight">
                  🌸 Varahi Devi {selectedDayPanchami.tamilMonth} Month Fasting Day
                </h3>
                <p className="text-xs text-[#8C7B65] mt-1 font-sans">
                  📅 {formatFastingDate(selectedDate)}
                </p>
                <p className="text-xs text-[#8C7B65] mt-1 font-mono">
                  ⏱️ Tithi: <span className="text-[#C05621] font-bold">{getTithiRange(selectedDayPanchami)}</span>
                </p>
                {selectedDayPanchami.festivals && (
                  <p className="text-xs text-[#C05621] mt-2.5 bg-white/90 border border-dashed border-[#C05621]/30 px-3 py-1 rounded-lg inline-block font-sans font-medium">
                     🌟 {selectedDayPanchami.festivals}
                  </p>
                )}
              </div>
            </div>

            {/* Log Quick Action */}
            {selectedDate === new Date().toISOString().split("T")[0] && (
              <div className="mt-4 flex gap-2 pt-3 border-t border-[#EBE3D5]/50" id="quick-log-actions">
                {!selectedDayLog ? (
                  <>
                    <button
                      onClick={() => onAddLog(selectedDate, "completed")}
                      className="flex-1 bg-[#2F855A] hover:bg-[#256a47] active:scale-95 text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      id="log-completed-btn"
                    >
                      <CalendarCheck className="w-4 h-4" />
                      Log as Completed Fast
                    </button>
                    <button
                      onClick={() => onAddLog(selectedDate, "skipped")}
                      className="bg-[#F3EFE9] hover:bg-[#EBE3D5] text-[#4A3728] active:scale-95 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border border-[#EBE3D5]"
                      id="log-skipped-btn"
                    >
                      Skip
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 w-full justify-between" id="logged-status-text">
                    <div className="text-xs text-[#4A3728] font-sans font-medium">
                      Status:{" "}
                      <span className={`font-black ${
                        selectedDayLog.status === "completed" ? "text-[#2F855A]" : "text-rose-600"
                      }`}>
                        {selectedDayLog.status === "completed" ? "Completed Fast 🎉" : "Skipped Fast ⭕"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-6 text-[#8C7B65]" id="no-panchami-text">
            <p className="text-sm font-serif italic">📅 {formatFastingDate(selectedDate)}</p>
            <p className="text-xs mt-1 font-sans">This is a standard calendar day. Keep eating healthy!</p>
          </div>
        )}
      </div>
    </div>
  );
}
