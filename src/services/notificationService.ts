import type { Notification, Task, Subtask } from '../types';
import { DateUtils } from '../utils/dateUtils';

const NOTIFICATIONS_KEY = 'todoNotifications';

/**
 * Service for managing notifications in localStorage
 * Uses OOP-style pattern for better organization
 */
export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Save notifications to localStorage
   */
  private saveNotifications(notifications: Notification[]): void {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }

  /**
   * Load notifications from localStorage
   */
  loadNotifications(): Notification[] {
    try {
      const savedNotifications = localStorage.getItem(NOTIFICATIONS_KEY);
      return savedNotifications ? JSON.parse(savedNotifications) : [];
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
      return [];
    }
  }

  /**
   * Create notification for overdue task
   */
  createTaskOverdueNotification(task: Task): Notification {
    return {
      id: `task_overdue_${task.id}_${Date.now()}`,
      type: 'task_overdue',
      taskId: task.id,
      taskName: task.title,
      message: `Task ${task.title} is overdue`,
      createdAt: Date.now(),
      read: false
    };
  }

  /**
   * Create notification for overdue subtask
   */
  createSubtaskOverdueNotification(task: Task, subtask: Subtask): Notification {
    return {
      id: `subtask_overdue_${task.id}_${subtask.id}_${Date.now()}`,
      type: 'subtask_overdue',
      taskId: task.id,
      taskName: task.title,
      subtaskId: subtask.id,
      subtaskName: subtask.title,
      message: `You’re falling behind your pace on task ${task.title} because subtask ${subtask.title} is incomplete.`,
      createdAt: Date.now(),
      read: false
    };
  }

  /**
   * Add notification if it doesn't already exist
   */
  addNotification(notification: Notification): void {
    const notifications = this.loadNotifications();
    
    // Check if similar notification already exists (same type, task, and subtask)
    const exists = notifications.some(n => 
      n.type === notification.type && 
      n.taskId === notification.taskId && 
      n.subtaskId === notification.subtaskId
    );

    if (!exists) {
      notifications.push(notification);
      this.saveNotifications(notifications);
    }
  }

  /**
   * Remove notifications for a specific task
   */
  removeNotificationsForTask(taskId: string): void {
    const notifications = this.loadNotifications();
    const filteredNotifications = notifications.filter(n => n.taskId !== taskId);
    this.saveNotifications(filteredNotifications);
  }

  /**
   * Remove notifications for a specific subtask
   */
  removeNotificationsForSubtask(taskId: string, subtaskId: number): void {
    const notifications = this.loadNotifications();
    const filteredNotifications = notifications.filter(n => 
      !(n.taskId === taskId && n.subtaskId === subtaskId)
    );
    this.saveNotifications(filteredNotifications);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notifications = this.loadNotifications();
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    this.saveNotifications(updated);
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    const notifications = this.loadNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    this.saveNotifications(updated);
  }

  /**
   * Get unread notifications count
   */
  getUnreadCount(): number {
    const notifications = this.loadNotifications();
    return notifications.filter(n => !n.read).length;
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    try {
      localStorage.removeItem(NOTIFICATIONS_KEY);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Check tasks and subtasks for overdue status and create notifications
   */
  checkAndCreateOverdueNotifications(tasks: Task[]): void {
    tasks.forEach(task => {
      // Skip completed tasks
      if (task.done) return;

      // Check main task
      if (DateUtils.isOverdue(task.deadline)) {
        const notification = this.createTaskOverdueNotification(task);
        this.addNotification(notification);
      }

      // Check subtasks
      task.subtasks.forEach(subtask => {
        if (!subtask.done && DateUtils.isOverdue(subtask.deadline)) {
          const notification = this.createSubtaskOverdueNotification(task, subtask);
          this.addNotification(notification);
        }
      });
    });
  }

  /**
   * Clean up notifications for completed tasks/subtasks
   */
  cleanupNotifications(tasks: Task[]): void {
    const notifications = this.loadNotifications();
    const validNotifications = notifications.filter(notification => {
      const task = tasks.find(t => t.id === notification.taskId);
      
      if (!task) {
        // Task doesn't exist anymore, remove notification
        return false;
      }

      if (notification.type === 'task_overdue') {
        // Remove if task is completed or no longer overdue
        return !task.done && DateUtils.isOverdue(task.deadline);
      }

      if (notification.type === 'subtask_overdue' && notification.subtaskId) {
        const subtask = task.subtasks.find(st => st.id === notification.subtaskId);
        if (!subtask) {
          // Subtask doesn't exist anymore, remove notification
          return false;
        }
        // Remove if subtask is completed or no longer overdue
        return !subtask.done && DateUtils.isOverdue(subtask.deadline);
      }

      return true;
    });

    if (validNotifications.length !== notifications.length) {
      this.saveNotifications(validNotifications);
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();