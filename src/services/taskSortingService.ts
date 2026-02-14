import type { Task, SortOption, SortDirection } from '../types';

/**
 * Service for handling task sorting operations
 * Uses OOP-style pattern for better organization
 */
export class TaskSortingService {
  private static instance: TaskSortingService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): TaskSortingService {
    if (!TaskSortingService.instance) {
      TaskSortingService.instance = new TaskSortingService();
    }
    return TaskSortingService.instance;
  }

  /**
   * Sort tasks by creation time
   */
  private sortByCreatedTime(tasks: Task[], direction: SortDirection): Task[] {
    return [...tasks].sort((a, b) => {
      // Use id as fallback since it contains timestamp
      const aTime = a.createdAt || parseInt(a.id);
      const bTime = b.createdAt || parseInt(b.id);
      
      return direction === 'asc' ? aTime - bTime : bTime - aTime;
    });
  }

  /**
   * Sort tasks by deadline
   */
  private sortByDeadline(tasks: Task[], direction: SortDirection): Task[] {
    return [...tasks].sort((a, b) => {
      const aDeadline = new Date(a.deadline).getTime();
      const bDeadline = new Date(b.deadline).getTime();
      
      return direction === 'asc' ? aDeadline - bDeadline : bDeadline - aDeadline;
    });
  }

  /**
   * Sort tasks by priority
   */
  private sortByPriority(tasks: Task[], direction: SortDirection): Task[] {
    const priorityOrder: Record<string, number> = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1,
    };
    
    return [...tasks].sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      
      return direction === 'asc' ? aPriority - bPriority : bPriority - aPriority;
    });
  }

  /**
   * Sort tasks based on the given option and direction
   */
  sortTasks(tasks: Task[], option: SortOption, direction: SortDirection): Task[] {
    switch (option) {
      case 'createdTime':
        return this.sortByCreatedTime(tasks, direction);
      case 'deadline':
        return this.sortByDeadline(tasks, direction);
      case 'priority':
        return this.sortByPriority(tasks, direction);
      default:
        return tasks;
    }
  }

  /**
   * Get sort display text
   */
  getSortDisplayText(option: SortOption, direction: SortDirection): string {
    let optionText = 'Created Time';
    if (option === 'deadline') optionText = 'Deadline';
    else if (option === 'priority') optionText = 'Priority';
    
    const directionText = direction === 'asc' ? '↑' : '↓';
    return `${optionText} ${directionText}`;
  }

  /**
   * Get next sort direction (toggle between asc and desc)
   */
  toggleDirection(currentDirection: SortDirection): SortDirection {
    return currentDirection === 'asc' ? 'desc' : 'asc';
  }
}

// Export singleton instance
export const taskSortingService = TaskSortingService.getInstance();