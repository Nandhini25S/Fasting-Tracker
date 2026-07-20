export interface PanchamiDay {
  date: string; // YYYY-MM-DD
  paksha: "Shukla" | "Krishna";
  tamilMonth: string;
  tithiStart?: string;
  tithiEnd: string;
  fastDay: boolean;
  festivals?: string;
}

export interface FastingLog {
  date: string; // YYYY-MM-DD
  status: "completed" | "skipped" | "partial";
  vegOnly: boolean;
  checkedTasks: string[]; // e.g. ["veg", "water", "prayers", "no-onion-garlic"]
  notifiedMum: boolean;
  notes?: string;
  timestamp: number;
}

export interface FastingStreak {
  currentStreak: number;
  longestStreak: number;
  lastFastedDate: string | null;
}

export interface NotificationSettings {
  browserNotificationsEnabled: boolean;
  notifyOnDay: boolean; // Notify morning of fast
  notifyEveningBefore: boolean; // Notify evening before (to prepare food)
  reminderHour: number; // 24-hour format
}
