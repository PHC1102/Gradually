export type OrgRole = 'owner' | 'admin' | 'member';
export type ProjectRole = 'admin' | 'contributor' | 'viewer';
export type TaskStatus = 'todo' | 'inProgress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Subtask {
  id: number;
  title: string;
  deadline: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  deadline: string;
  subtasks: Subtask[];
  done: boolean;
  createdAt?: number;
  userId?: string;
  orgId?: string;
  projectId?: string;
  reporterId?: string;
  assigneeId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  description?: string;
  completedAt?: number;  // timestamp when task was marked as completed
  expiresAt?: number;    // timestamp when task should be auto-deleted (30 days)
}

export interface TaskFormData {
  title: string;
  deadline: string;
  subtasks?: Subtask[];
  description?: string;
  assigneeId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export interface CompletedTask extends Task {
  completedAt: number; // timestamp when task was marked as completed
  expiresAt: number;   // timestamp when task should be auto-deleted (30 days)
}

export type ViewMode = 'active' | 'board' | 'completed' | 'calendar' | 'analysis' | 'org-settings' | 'project-settings';

// Notification types
export interface Notification {
  id: string;
  type: 'task_overdue' | 'subtask_overdue';
  taskId: string;
  taskName: string;
  subtaskId?: number;
  subtaskName?: string;
  message: string;
  createdAt: number;
  read: boolean;
}

// Sorting types
export type SortOption = 'createdTime' | 'deadline' | 'priority';
export type SortDirection = 'asc' | 'desc';

// Calendar utility types
export interface DateRange {
  start: Date;
  end: Date;
}

export interface SortConfig {
  option: SortOption;
  direction: SortDirection;
}

// Calendar types
export type CalendarMode = 'monthly' | 'weekly';

export interface CalendarItem {
  id: string;
  title: string;
  type: 'task' | 'subtask';
  deadline: string;
  done: boolean;
  parentTaskId?: string;
  parentTaskTitle?: string;
  color: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
}

export interface CalendarWeek {
  days: CalendarDay[];
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-based (0 = January)
  weeks: CalendarWeek[];
}

export interface CalendarState {
  mode: CalendarMode;
  currentDate: Date;
  selectedDate?: Date;
}

// Color palette for tasks
export const TASK_COLORS = [
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
] as const;

export type TaskColor = typeof TASK_COLORS[number];

// Analysis types
export interface SubtaskMetrics {
  onPace: number;
  behind: number;
  total: number;
  streak: number;
  onPaceTasks: Task[];
  behindTasks: Task[];
}

export interface TaskMetrics {
  completionRate: number;
  onTime: number;
  overdue: number;
  total: number;
}

export interface AnalysisData {
  subtaskMetrics: SubtaskMetrics;
  taskMetrics: TaskMetrics;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  createdAt?: number;
  updatedAt?: number;
}

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  displayName?: string;
  email?: string;
}