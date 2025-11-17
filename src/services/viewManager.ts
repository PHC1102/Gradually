import type { ViewMode } from '../types';

/**
 * ViewManager class to handle view-related operations
 * Encapsulates view management logic with single responsibility
 */
export class ViewManager {
  private currentView: ViewMode = 'active';
  private sidebarOpen: boolean = false;

  constructor() {}

  /**
   * Get current view
   */
  getCurrentView(): ViewMode {
    return this.currentView;
  }

  /**
   * Set current view
   */
  setCurrentView(view: ViewMode): void {
    this.currentView = view;
  }

  /**
   * Check if sidebar is open
   */
  isSidebarOpen(): boolean {
    return this.sidebarOpen;
  }

  /**
   * Toggle sidebar state
   */
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  /**
   * Close sidebar
   */
  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  /**
   * Open sidebar
   */
  openSidebar(): void {
    this.sidebarOpen = true;
  }
}