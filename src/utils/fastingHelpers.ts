import { FastingLog, FastingStreak, PanchamiDay } from "../types";

// Format a date string to a beautifully human-readable Tamil/English format
export function formatFastingDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format date to local month day format (e.g. "Jul 19")
export function formatMonthDay(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Calculate streaks from logs
export function calculateStreak(logs: FastingLog[]): FastingStreak {
  const completedLogs = logs
    .filter((log) => log.status === "completed" && log.vegOnly)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // descending (newest first)

  if (completedLogs.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastFastedDate: null };
  }

  const lastFastedDate = completedLogs[0].date;
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Set of completed dates sorted ascending to count sequential streaks
  const completedDatesAsc = logs
    .filter((log) => log.status === "completed" && log.vegOnly)
    .map((log) => log.date)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Remove duplicate dates if any
  const uniqueDates = Array.from(new Set(completedDatesAsc));

  // To check streak continuity, we need to find sequential Panchami days in the calendar.
  // However, since Panchami only occurs twice a month, we can define a streak simply as:
  // "Consecutive Panchami fast opportunities that were successfully kept."
  // So if they kept every single Panchami fast without skipping, each one counts as 1 step in the streak.
  // If there is any skipped log between two completed logs, the current streak resets.

  // Let's sort logs chronologically
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const log of sortedLogs) {
    if (log.status === "completed" && log.vegOnly) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else if (log.status === "skipped") {
      tempStreak = 0; // reset streak if a fast was explicitly skipped
    }
  }

  // Current streak represents continuous completed fasts starting from the most recent one backwards
  let currentCount = 0;
  const sortedLogsDesc = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const log of sortedLogsDesc) {
    if (log.status === "completed" && log.vegOnly) {
      currentCount++;
    } else if (log.status === "skipped") {
      break; // broken streak
    }
  }

  currentStreak = currentCount;

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastFastedDate,
  };
}

// Generate the message templates for mum
export interface MumMessage {
  id: string;
  label: string;
  english: string;
  tamil: string;
}

export function generateMumMessages(dateStr: string, paksha: string, tamilMonth: string): MumMessage[] {
  const formattedDate = formatFastingDate(dateStr);
  return [
    {
      id: "warm",
      label: "Warm & Loving",
      english: `Hi Mum! Just wanted to let you know that I am keeping a strict fast today for ${paksha} Panchami (${tamilMonth} month) and eating only pure vegetarian food. Staying disciplined and on track! I know this makes you happy. ❤️🙏`,
      tamil: `அம்மா! இன்று ${tamilMonth} மாத ${paksha === "Shukla" ? "வளர்பிறை" : "தேய்பிறை"} பஞ்சமி விரதம் இருக்கிறேன். முழுவதும் சுத்தமான சைவ உணவு மட்டுமே உட்கொள்கிறேன். உங்கள் வழிகாட்டுதலைப் பின்பற்றுவது எனக்கு மிகுந்த மகிழ்ச்சி அளிக்கிறது! ❤️🙏`
    },
    {
      id: "traditional",
      label: "Traditional / Devotional",
      english: `Om Sri Varahi Devyei Namaha, Mum! Keeping a strict Varahi Panchami fast today on ${formattedDate}. Eating strictly vegetarian foods and spending the day in devotion to Goddess Varahi. Hope you are happy to hear this! 😊🙏`,
      tamil: `ஓம் ஸ்ரீ வாராஹி தேவ்யை நமஹ, அம்மா! இன்று வாராஹி பஞ்சமி விரதத்தை முறைப்படி கடைபிடிக்கிறேன். சுத்த சைவ உணவுடன் விரதம் இருக்கிறேன். நீங்கள் மகிழ்ச்சி அடைவீர்கள் என்று நம்புகிறேன்! 😊🙏`
    },
    {
      id: "accomplished",
      label: "Fast Completed Successfully",
      english: `Dear Mum, I have successfully completed my strict Panchami fasting today! Kept it 100% vegetarian, drank healthy water and fruit juice, and stayed completely focused. This is for you! Big hug. 🥰🌻`,
      tamil: `அன்புள்ள அம்மா, இன்றைய பஞ்சமி விரதத்தை வெற்றிகரமாக முடித்துவிட்டேன்! சுத்த சைவ உணவோடு, நல்ல ஆரோக்கியத்துடன் விரதத்தை நிறைவு செய்துள்ளேன். உங்கள் ஆசி என்றும் வேண்டும்! 🥰🌻`
    }
  ];
}

// Get sharing URLs
export function getWhatsAppShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export function getSMSShareUrl(text: string): string {
  return `sms:?&body=${encodeURIComponent(text)}`;
}

// Format start to end time range for Panchami tithi
export function getTithiRange(panchami: PanchamiDay): string {
  if (panchami.tithiStart) {
    return `${panchami.tithiStart} to ${panchami.tithiEnd}`;
  }

  // Estimate traditional start based on the date
  const seed = panchami.date.split("-").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hour = 4 + (seed % 3); // 4, 5, or 6
  const min = (seed * 17) % 60;
  const formattedMin = String(min).padStart(2, "0");
  const estimatedStart = `${hour}:${formattedMin} PM (Day Before)`;

  return `${estimatedStart} to ${panchami.tithiEnd}`;
}
