import { TaskManager } from './taskManager';
import { ViewManager } from './viewManager';
import { FormManager } from './formManager';
import { AlertManager } from './alertManager';
import { SortManager } from './sortManager';
import type { Task, Subtask, ViewMode, SortOption, SortDirection } from '../types';

/**
 * AppController class to coordinate all managers
 * Central point of control for the application
 */
export class AppController {
  private taskManager: TaskManager;
  private viewManager: ViewManager;
  private formManager: FormManager;
  private alertManager: AlertManager;
  private sortManager: SortManager;

  constructor() {
    this.taskManager = new TaskManager();
    this.viewManager = new ViewManager();
    this.formManager = new FormManager();
    this.alertManager = new AlertManager();
    this.sortManager = new SortManager();
  }

  // Task Manager Getters
  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  // View Manager Getters and Setters
  getViewManager(): ViewManager {
    return this.viewManager;
  }

  getCurrentView(): ViewMode {
    return this.viewManager.getCurrentView();
  }

  setCurrentView(view: ViewMode): void {
    this.viewManager.setCurrentView(view);
    this.viewManager.closeSidebar();
  }

  isSidebarOpen(): boolean {
    return this.viewManager.isSidebarOpen();
  }

  toggleSidebar(): void {
    this.viewManager.toggleSidebar();
  }

  closeSidebar(): void {
    this.viewManager.closeSidebar();
  }

  // Form Manager Getters and Setters
  getFormManager(): FormManager {
    return this.formManager;
  }

  shouldShowForm(): boolean {
    return this.formManager.shouldShowForm();
  }

  showForm(): void {
    this.formManager.showFormDialog();
  }

  hideForm(): void {
    console.log('AppController.hideForm called');
    this.formManager.hideFormDialog();
  }

  resetFormStates(): void {
    console.log('AppController.resetFormStates called');
    this.formManager.resetFormStates();
  }

  /**
   * Get editing task
   */
  getEditingTask(): Task | null {
    return this.formManager.getEditingTask();
  }

  /**
   * Set editing task
   */
  setEditingTask(task: Task | null): void {
    this.formManager.setEditingTask(task);
  }

  /**
   * Get parent task ID for subtask being added
   */
  getAddingSubtaskTo(): string | null {
    return this.formManager.getAddingSubtaskTo();
  }

  /**
   * Set parent task ID for subtask being added
   */
  setAddingSubtaskTo(taskId: string | null): void {
    this.formManager.setAddingSubtaskTo(taskId);
  }

  /**
   * Get editing subtask
   */
  getEditingSubtask(): { task: Task; subtask: Subtask } | null {
    return this.formManager.getEditingSubtask();
  }

  /**
   * Set editing subtask
   */
  setEditingSubtask(subtask: { task: Task; subtask: Subtask } | null): void {
    this.formManager.setEditingSubtask(subtask);
  }

  /**
   * Check if current form is for a subtask
   */
  isSubtaskForm(): boolean {
    return this.formManager.isSubtaskForm();
  }

  /**
   * Get task data for form
   */
  getFormTaskData(): Task | undefined {
    return this.formManager.getFormTaskData();
  }

  // Alert Manager Getters and Setters
  getAlertManager(): AlertManager {
    return this.alertManager;
  }

  isOpenAlert(): boolean {
    return this.alertManager.isOpenAlert();
  }

  getAlertTitle(): string {
    return this.alertManager.getAlertTitle();
  }

  getAlertMessage(): string {
    return this.alertManager.getAlertMessage();
  }

  getOnConfirmCallback(): () => void {
    return this.alertManager.getOnConfirmCallback();
  }

  showAlert(title: string, message: string, onConfirm: () => void): void {
    this.alertManager.showAlert(title, message, onConfirm);
  }

  hideAlert(): void {
    this.alertManager.hideAlert();
  }

  // Sort Manager Getters and Setters
  getSortManager(): SortManager {
    return this.sortManager;
  }

  getSortOption(): SortOption {
    return this.sortManager.getSortOption();
  }

  getSortDirection(): SortDirection {
    return this.sortManager.getSortDirection();
  }

  handleSortChange(option: SortOption): { option: SortOption, direction: SortDirection } {
    return this.sortManager.handleSortChange(option);
  }

  getSortedTasks(tasks: any[]) {
    return this.sortManager.getSortedTasks(tasks);
  }
}