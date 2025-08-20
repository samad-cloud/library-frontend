export type CalendarView = "day" | "week" | "month" | "year";

export type StyleType = 
  | 'Lifestyle no subject'
  | 'Lifestyle + Subject'
  | 'Emotionally driven'
  | 'Studio Style'
  | 'Close-up shot'
  | 'White background'

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  color?: string; // Tailwind color token name
  allDay?: boolean;
  number_of_variations?: number;
  styles?: StyleType[];
  databaseEvent?: any; // Optional database event data for modals
};

export const COLORS = [
  { key: "sky", className: "bg-sky-500", dot: "bg-sky-500" },
  { key: "violet", className: "bg-violet-500", dot: "bg-violet-500" },
  { key: "emerald", className: "bg-emerald-500", dot: "bg-emerald-500" },
  { key: "rose", className: "bg-rose-500", dot: "bg-rose-500" },
  { key: "amber", className: "bg-amber-500", dot: "bg-amber-500" },
];

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
