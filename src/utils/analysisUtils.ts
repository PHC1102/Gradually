import type { Task, SubtaskMetrics, TaskMetrics, AnalysisData } from '../types';

/**
 * Calculate if a task/subtask is on pace based on deadline proximity
 */
export function isOnPace(deadline: string, completed: boolean): boolean {
  if (completed) return true;
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const timeLeft = deadlineDate.getTime() - now.getTime();
  const daysLeft = timeLeft / (1000 * 60 * 60 * 24);
  
  // Consider "on pace" if more than 1 day left or already completed
  return daysLeft > 1;
}

/**
 * Calculate if a task was completed on time
 */
export function isCompletedOnTime(deadline: string, completedAt?: number): boolean {
  if (!completedAt) return false;
  
  const deadlineDate = new Date(deadline);
  const completionDate = new Date(completedAt);
  
  return completionDate <= deadlineDate;
}

/**
 * Calculate task-level pace metrics (renamed from subtask metrics)
 * A task is "on pace" if it's incomplete but has no overdue subtasks
 * A task is "behind" if it has any overdue subtasks
 */
export function calculateSubtaskMetrics(tasks: Task[]): SubtaskMetrics {
  let onPace = 0;
  let behind = 0;
  let total = 0;
  
  const onPaceTasks: Task[] = [];
  const behindTasks: Task[] = [];
  
  tasks.forEach(task => {
    if (!task.done) {
      total++;
      
      // Check if any subtask is overdue
      const now = new Date();
      const hasOverdueSubtask = task.subtasks.some(subtask => {
        if (subtask.done) return false;
        const deadline = new Date(subtask.deadline);
        return now > deadline;
      });
      
      if (hasOverdueSubtask) {
        behind++;
        behindTasks.push(task);
      } else {
        onPace++;
        onPaceTasks.push(task);
      }
    }
  });
  
  // Calculate anti-cram streak (consecutive days of staying on pace)
  const streak = calculateAntiCramStreak(tasks);
  
  return { onPace, behind, total, streak, onPaceTasks, behindTasks };
}

/**
 * Calculate task-level metrics for overall outcome analysis
 */
export function calculateTaskMetrics(tasks: Task[], completedTasks: any[] = []): TaskMetrics {
  const totalTasks = tasks.length + completedTasks.length;
  const completedCount = completedTasks.length;
  const completionRate = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  
  let onTime = 0;
  let overdue = 0;
  
  // Check completed tasks
  completedTasks.forEach(task => {
    if (isCompletedOnTime(task.deadline, task.completedAt)) {
      onTime++;
    } else {
      overdue++;
    }
  });
  
  // Check active tasks that are overdue
  const now = new Date();
  tasks.forEach(task => {
    if (!task.done && new Date(task.deadline) < now) {
      overdue++;
    }
  });
  
  return {
    completionRate,
    onTime,
    overdue,
    total: totalTasks
  };
}

/**
 * Calculate anti-cram streak (simplified version)
 * In a real implementation, this would track daily completion patterns
 */
export function calculateAntiCramStreak(tasks: Task[]): number {
  // Simplified calculation: count consecutive days where user completed subtasks on time
  // For demo purposes, we'll calculate based on recent subtask completion patterns
  
  const recentSubtasks = tasks
    .flatMap(task => task.subtasks)
    .filter(subtask => subtask.done)
    .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime())
    .slice(0, 10); // Look at last 10 completed subtasks
  
  let streak = 0;
  const now = new Date();
  
  for (const subtask of recentSubtasks) {
    const deadline = new Date(subtask.deadline);
    const daysDiff = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7 && subtask.done) { // Completed within the week
      streak++;
    } else {
      break;
    }
  }
  
  return Math.min(streak, 30); // Cap at 30 days for display purposes
}

/**
 * Generate analysis data for the Analysis View
 */
export function generateAnalysisData(tasks: Task[], completedTasks: any[] = []): AnalysisData {
  return {
    subtaskMetrics: calculateSubtaskMetrics(tasks),
    taskMetrics: calculateTaskMetrics(tasks, completedTasks)
  };
}

/**
 * Get color based on metric performance
 */
export function getMetricColor(value: number, isGood: boolean = true): string {
  if (isGood) {
    return value > 75 ? '#00FF7F' : value > 50 ? '#1E90FF' : '#FF6B6B';
  } else {
    return value < 25 ? '#00FF7F' : value < 50 ? '#1E90FF' : '#FF6B6B';
  }
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format streak display
 */
export function formatStreak(days: number): string {
  if (days === 0) return 'No streak';
  if (days === 1) return '1 day';
  return `${days} days`;
}