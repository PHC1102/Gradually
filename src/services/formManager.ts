import type { Task, Subtask } from '../types';

/**
 * FormManager class to handle form-related operations
 * Encapsulates form management logic with single responsibility
 */
export class FormManager {
  private showForm: boolean = false;
  private editingTask: Task | null = null;
  private addingSubtaskTo: string | null = null;
  private editingSubtask: { task: Task; subtask: Subtask } | null = null;

  constructor() {}

  /**
   * Check if form should be shown
   */
  shouldShowForm(): boolean {
    console.log('FormManager.shouldShowForm called. Current showForm value:', this.showForm);
    return this.showForm;
  }

  /**
   * Show form
   */
  showFormDialog(): void {
    this.showForm = true;
  }

  /**
   * Hide form
   */
  hideFormDialog(): void {
    console.log('FormManager.hideFormDialog called. Setting showForm to false');
    this.showForm = false;
  }

  /**
   * Get editing task
   */
  getEditingTask(): Task | null {
    return this.editingTask;
  }

  /**
   * Set editing task
   */
  setEditingTask(task: Task | null): void {
    this.editingTask = task;
  }

  /**
   * Get parent task ID for subtask being added
   */
  getAddingSubtaskTo(): string | null {
    return this.addingSubtaskTo;
  }

  /**
   * Set parent task ID for subtask being added
   */
  setAddingSubtaskTo(taskId: string | null): void {
    this.addingSubtaskTo = taskId;
  }

  /**
   * Get editing subtask
   */
  getEditingSubtask(): { task: Task; subtask: Subtask } | null {
    return this.editingSubtask;
  }

  /**
   * Set editing subtask
   */
  setEditingSubtask(subtask: { task: Task; subtask: Subtask } | null): void {
    this.editingSubtask = subtask;
  }

  /**
   * Check if current form is for a subtask
   */
  isSubtaskForm(): boolean {
    return !!this.addingSubtaskTo || !!this.editingSubtask;
  }

  /**
   * Get task data for form
   */
  getFormTaskData(): Task | undefined {
    if (this.editingTask) {
      return this.editingTask;
    } else if (this.editingSubtask) {
      return {
        id: this.editingSubtask.subtask.id.toString(),
        title: this.editingSubtask.subtask.title,
        deadline: this.editingSubtask.subtask.deadline,
        subtasks: [],
        done: this.editingSubtask.subtask.done
      };
    }
    return undefined;
  }

  /**
   * Reset all form states
   */
  resetFormStates(): void {
    console.log('FormManager.resetFormStates called. Resetting all form states');
    this.showForm = false;
    this.editingTask = null;
    this.addingSubtaskTo = null;
    this.editingSubtask = null;
  }
}