import type { 
  Task, 
  CalendarItem, 
  CalendarDay, 
  CalendarWeek, 
  CalendarMonth, 
  DateRange
} from '../types';

/**
 * Get the color for a task based on its ID
 */
export function getTaskColor(taskId: string): string {
  const colors = [
    '#FFEAA7', // pastel yellow
    '#FADBD8', // pastel pink
    '#E8DAEF', // lavender
    '#D6EAF8', // baby blue
    '#D5F5E3', // mint green
    '#FCF3CF', // cream
    '#FDEDEC', // rose white
    '#F8C471', // soft orange
    '#ABEBC6', // light green
    '#A9CCE3'  // light sky
  ];
  
  // Convert taskId to a number for consistent color assignment
  const hash = taskId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Lighten a hex color by a percentage
 */
export function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

/**
 * Convert tasks and subtasks to calendar items
 */
export function tasksToCalendarItems(tasks: Task[]): CalendarItem[] {
  const items: CalendarItem[] = [];
  
  tasks.forEach(task => {
    const taskColor = getTaskColor(task.id);
    
    // Add main task
    items.push({
      id: task.id,
      title: task.title,
      type: 'task',
      deadline: task.deadline,
      done: task.done,
      color: taskColor
    });
    
    // Add subtasks
    task.subtasks.forEach(subtask => {
      items.push({
        id: `${task.id}-${subtask.id}`,
        title: subtask.title,
        type: 'subtask',
        deadline: subtask.deadline,
        done: subtask.done,
        parentTaskId: task.id,
        parentTaskTitle: task.title,
        color: lightenColor(taskColor, 30) // Lighter version of parent color
      });
    });
  });
  
  return items;
}

/**
 * Group calendar items by date
 */
export function groupItemsByDate(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const grouped = new Map<string, CalendarItem[]>();
  
  items.forEach(item => {
    const date = new Date(item.deadline);
    const dateKey = formatDateKey(date);
    
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(item);
  });
  
  // Sort items within each date
  grouped.forEach(items => {
    items.sort((a, b) => {
      // Tasks first, then subtasks
      if (a.type !== b.type) {
        return a.type === 'task' ? -1 : 1;
      }
      // Then by deadline time
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  });
  
  return grouped;
}

/**
 * Format date as YYYY-MM-DD for consistent keys
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDateKey(date1) === formatDateKey(date2);
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Get the start of week (Monday)
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get the start of month
 */
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the end of month
 */
export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Generate calendar days for monthly view
 */
export function generateMonthCalendar(year: number, month: number, itemsByDate: Map<string, CalendarItem[]>): CalendarMonth {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = getStartOfWeek(firstDay);
  
  const weeks: CalendarWeek[] = [];
  let currentDate = new Date(startDate);
  
  // Generate 6 weeks to ensure full month coverage
  for (let week = 0; week < 6; week++) {
    const days: CalendarDay[] = [];
    
    for (let day = 0; day < 7; day++) {
      const dateKey = formatDateKey(currentDate);
      const items = itemsByDate.get(dateKey) || [];
      
      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: isToday(currentDate),
        items
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    weeks.push({ days });
    
    // Stop if we've passed the end of the month and completed the week
    if (currentDate > lastDay && week > 0) {
      break;
    }
  }
  
  return { year, month, weeks };
}

/**
 * Generate calendar days for weekly view
 */
export function generateWeekCalendar(date: Date, itemsByDate: Map<string, CalendarItem[]>): CalendarWeek {
  const startDate = getStartOfWeek(date);
  const days: CalendarDay[] = [];
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const dateKey = formatDateKey(currentDate);
    const items = itemsByDate.get(dateKey) || [];
    
    days.push({
      date: new Date(currentDate),
      isCurrentMonth: true, // All days are relevant in weekly view
      isToday: isToday(currentDate),
      items
    });
  }
  
  return { days };
}

/**
 * Get date range for current view
 */
export function getDateRange(mode: 'monthly' | 'weekly', date: Date): DateRange {
  if (mode === 'weekly') {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  } else {
    const start = getStartOfMonth(date);
    const end = getEndOfMonth(date);
    return { start, end };
  }
}

/**
 * Navigate to previous period
 */
export function getPreviousPeriod(mode: 'monthly' | 'weekly', date: Date): Date {
  const newDate = new Date(date);
  
  if (mode === 'weekly') {
    newDate.setDate(newDate.getDate() - 7);
  } else {
    newDate.setMonth(newDate.getMonth() - 1);
  }
  
  return newDate;
}

/**
 * Navigate to next period
 */
export function getNextPeriod(mode: 'monthly' | 'weekly', date: Date): Date {
  const newDate = new Date(date);
  
  if (mode === 'weekly') {
    newDate.setDate(newDate.getDate() + 7);
  } else {
    newDate.setMonth(newDate.getMonth() + 1);
  }
  
  return newDate;
}

/**
 * Format date for display
 */
export function formatDisplayDate(date: Date, mode: 'monthly' | 'weekly'): string {
  if (mode === 'weekly') {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - Week of ${start.getDate()}`;
    } else {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`;
    }
  } else {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}

/**
 * Get weekday names
 */
export function getWeekdayNames(): string[] {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}