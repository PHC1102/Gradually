import type { Task } from './types';

const STORAGE_KEY = 'todoTasks';
const COMPLETED_TASKS_KEY = 'completedTasks';

export interface CompletedTask extends Task {
  completedAt: number; // timestamp when task was marked as completed
  expiresAt: number;   // timestamp when task should be auto-deleted (30 days)
}

class LocalStorageService {
  // Save active tasks
  saveTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to localStorage:', error);
    }
  }

  // Load active tasks
  loadTasks(): Task[] {
    try {
      const savedTasks = localStorage.getItem(STORAGE_KEY);
      const tasks = savedTasks ? JSON.parse(savedTasks) : [];
      
      // Ensure createdAt field exists for all tasks
      return tasks.map((task: any) => ({
        ...task,
        createdAt: task.createdAt || parseInt(task.id) || Date.now()
      }));
    } catch (error) {
      console.error('Error loading tasks from localStorage:', error);
      return [];
    }
  }

  // Save completed tasks
  saveCompletedTasks(completedTasks: CompletedTask[]): void {
    try {
      localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(completedTasks));
    } catch (error) {
      console.error('Error saving completed tasks to localStorage:', error);
    }
  }

  // Load completed tasks and auto-cleanup expired ones
  loadCompletedTasks(): CompletedTask[] {
    try {
      const savedCompletedTasks = localStorage.getItem(COMPLETED_TASKS_KEY);
      if (!savedCompletedTasks) return [];

      const completedTasks: CompletedTask[] = JSON.parse(savedCompletedTasks);
      const now = Date.now();
      
      // Filter out expired tasks (older than 30 days)
      const validCompletedTasks = completedTasks.filter(task => task.expiresAt > now);
      
      // Save back the filtered list if any tasks were removed
      if (validCompletedTasks.length !== completedTasks.length) {
        this.saveCompletedTasks(validCompletedTasks);
      }
      
      return validCompletedTasks;
    } catch (error) {
      console.error('Error loading completed tasks from localStorage:', error);
      return [];
    }
  }

  // Move task to completed
  moveTaskToCompleted(task: Task): void {
    const completedTasks = this.loadCompletedTasks();
    
    // Check if task already exists in completed tasks to prevent duplicates
    const taskExists = completedTasks.some(completedTask => completedTask.id === task.id);
    if (taskExists) {
      console.warn(`Task ${task.id} already exists in completed tasks`);
      return;
    }
    
    const now = Date.now();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    const completedTask: CompletedTask = {
      ...task,
      done: true,
      completedAt: now,
      expiresAt: now + thirtyDaysInMs
    };

    completedTasks.push(completedTask);
    this.saveCompletedTasks(completedTasks);
  }

  // Remove task from completed (for permanent deletion)
  removeFromCompleted(taskId: string): void {
    const completedTasks = this.loadCompletedTasks();
    const updatedCompletedTasks = completedTasks.filter(task => task.id !== taskId);
    this.saveCompletedTasks(updatedCompletedTasks);
  }

  // Clear all data (for testing/reset purposes)
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(COMPLETED_TASKS_KEY);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // Get storage stats (for debugging)
  getStorageStats(): { activeTasks: number; completedTasks: number } {
    return {
      activeTasks: this.loadTasks().length,
      completedTasks: this.loadCompletedTasks().length
    };
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService();