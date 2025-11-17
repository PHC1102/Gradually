import type { SortOption, SortDirection } from '../types';
import { taskSortingService } from './taskSortingService';

/**
 * SortManager class to handle sorting operations
 * Encapsulates sorting logic with single responsibility
 */
export class SortManager {
  private sortOption: SortOption = 'createdTime';
  private sortDirection: SortDirection = 'desc';

  constructor() {}

  /**
   * Get current sort option
   */
  getSortOption(): SortOption {
    return this.sortOption;
  }

  /**
   * Get current sort direction
   */
  getSortDirection(): SortDirection {
    return this.sortDirection;
  }

  /**
   * Set sort option
   */
  setSortOption(option: SortOption): void {
    this.sortOption = option;
  }

  /**
   * Set sort direction
   */
  setSortDirection(direction: SortDirection): void {
    this.sortDirection = direction;
  }

  /**
   * Toggle sort direction
   */
  toggleDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  }

  /**
   * Handle sort change
   */
  handleSortChange(option: SortOption): { option: SortOption, direction: SortDirection } {
    if (option === this.sortOption) {
      // Toggle direction if same option is selected
      this.toggleDirection();
    } else {
      // Change option and set to ascending
      this.setSortOption(option);
      this.setSortDirection('asc');
    }
    
    return {
      option: this.sortOption,
      direction: this.sortDirection
    };
  }

  /**
   * Get sorted tasks
   */
  getSortedTasks(tasks: any[]) {
    return taskSortingService.sortTasks(tasks, this.sortOption, this.sortDirection);
  }
}