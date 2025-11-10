/**
 * Utility functions for date calculations and task deadline validation
 */

export const DeadlineStatus = {
  NORMAL: 'normal',
  WARNING: 'warning', // Within 6 hours
  OVERDUE: 'overdue'  // Past deadline
} as const;

export type DeadlineStatusType = typeof DeadlineStatus[keyof typeof DeadlineStatus];

export class DateUtils {
  /**
   * Get the deadline status based on current time and task deadline
   */
  static getDeadlineStatus(deadline: string): DeadlineStatusType {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - now.getTime();
    
    // If deadline has passed
    if (timeDiff < 0) {
      return DeadlineStatus.OVERDUE;
    }
    
    // If deadline is within 6 hours (6 * 60 * 60 * 1000 ms)
    const sixHoursInMs = 6 * 60 * 60 * 1000;
    if (timeDiff <= sixHoursInMs) {
      return DeadlineStatus.WARNING;
    }
    
    return DeadlineStatus.NORMAL;
  }

  /**
   * Check if a deadline is overdue
   */
  static isOverdue(deadline: string): boolean {
    return this.getDeadlineStatus(deadline) === DeadlineStatus.OVERDUE;
  }

  /**
   * Check if a deadline is within warning period (6 hours)
   */
  static isWarning(deadline: string): boolean {
    return this.getDeadlineStatus(deadline) === DeadlineStatus.WARNING;
  }

  /**
   * Get CSS class based on deadline status
   */
  static getDeadlineClass(deadline: string): string {
    const status = this.getDeadlineStatus(deadline);
    switch (status) {
      case DeadlineStatus.OVERDUE:
        return 'deadline-overdue';
      case DeadlineStatus.WARNING:
        return 'deadline-warning';
      default:
        return '';
    }
  }

  /**
   * Format deadline for display
   */
  static formatDeadline(deadline: string): string {
    return new Date(deadline).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Format completed date for display
   */
  static formatCompletedDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Get time until deadline in hours
   */
  static getHoursUntilDeadline(deadline: string): number {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - now.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60));
  }
}