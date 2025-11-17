import type { Task, TaskFormData, Subtask, CompletedTask } from '../types';
import { notificationService } from './notificationService';
import { 
  addTaskToFirebase, 
  getTasksFromFirebase, 
  getCompletedTasksFromFirebase,
  updateTaskInFirebase,
  updateCompletedTaskInFirebase,
  addCompletedTaskToFirebase
} from './firebaseTaskService';
import { getCurrentUser } from './authService';

/**
 * TaskManager class to handle all task-related operations
 * Encapsulates business logic for task management with single responsibility
 */
export class TaskManager {
  private tasks: Task[] = [];
  private completedTasks: CompletedTask[] = [];
  
  constructor() {
    // Initialize without loading tasks
    // Loading is handled by the App component
  }

  /**
   * Load tasks from Firebase
   */
  async loadTasks(): Promise<void> {
    const user = getCurrentUser();
    console.log('Loading tasks for user:', user?.uid);
    
    // Initialize with empty arrays
    this.tasks = [];
    this.completedTasks = [];
    console.log('Initialized with empty arrays');
    
    // If user is logged in, try to load from Firebase
    if (user) {
      try {
        console.log('Loading active tasks for user:', user.uid);
        const tasksResult = await getTasksFromFirebase(user.uid);
        console.log('Active tasks result:', tasksResult);
        
        if (tasksResult.success) {
          this.tasks = tasksResult.tasks || [];
        } else {
          console.error('Failed to load tasks:', tasksResult.error);
        }
        
        // Load completed tasks
        console.log('Loading completed tasks for user:', user.uid);
        const completedTasksResult = await getCompletedTasksFromFirebase(user.uid);
        console.log('Completed tasks result:', completedTasksResult);
        
        if (completedTasksResult.success) {
          this.completedTasks = completedTasksResult.tasks || [];
        } else {
          console.error('Failed to load completed tasks:', completedTasksResult.error);
        }
      } catch (error) {
        console.error('Error loading tasks from Firebase:', error);
      }
    }
    
    console.log('Tasks loaded - Active:', this.tasks.length, 'Completed:', this.completedTasks.length);
  }

  /**
   * Save tasks to Firebase
   */
  async saveTasks(): Promise<void> {
    // Update notifications when tasks change
    notificationService.checkAndCreateOverdueNotifications(this.tasks);
    notificationService.cleanupNotifications(this.tasks);
    
    const user = getCurrentUser();
    if (!user) return;
    
    // Save each task to Firebase
    try {
      // First, get existing tasks from Firebase to compare
      const existingTasksResult = await getTasksFromFirebase(user.uid);
      const existingTasks = existingTasksResult.success ? existingTasksResult.tasks || [] : [];
      
      // For each local task, either add it or update it in Firebase
      for (const task of this.tasks) {
        const existingTask = existingTasks.find(t => t.id === task.id);
        
        if (existingTask) {
          // Update existing task
          try {
            await updateTaskInFirebase(task.id, task);
            console.log('Updated task in Firebase:', task.id);
          } catch (error) {
            console.error('Error updating task in Firebase:', error);
          }
        } else {
          // Add new task
          try {
            // Remove the id property before saving (Firebase will generate a new one)
            const { id, ...taskWithoutId } = task;
            const result = await addTaskToFirebase(taskWithoutId);
            if (result.success) {
              console.log('Added task to Firebase with ID:', result.id);
            } else {
              console.error('Failed to add task to Firebase:', result.error);
            }
          } catch (error) {
            console.error('Error adding task to Firebase:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error saving tasks to Firebase:', error);
    }
  }

  /**
   * Save completed tasks to Firebase
   */
  async saveCompletedTasks(): Promise<void> {
    const user = getCurrentUser();
    if (!user) return;
    
    // Save each completed task to Firebase
    try {
      // First, get existing completed tasks from Firebase to compare
      const existingTasksResult = await getCompletedTasksFromFirebase(user.uid);
      const existingTasks = existingTasksResult.success ? existingTasksResult.tasks || [] : [];
      
      // For each local completed task, either add it or update it in Firebase
      for (const task of this.completedTasks) {
        const existingTask = existingTasks.find(t => t.id === task.id);
        
        if (existingTask) {
          // Update existing completed task
          try {
            await updateCompletedTaskInFirebase(task.id, task);
            console.log('Updated completed task in Firebase:', task.id);
          } catch (error) {
            console.error('Error updating completed task in Firebase:', error);
          }
        } else {
          // Add new completed task
          try {
            // Remove the id property before saving (Firebase will generate a new one)
            const { id, ...taskWithoutId } = task;
            const result = await addCompletedTaskToFirebase(taskWithoutId);
            if (result.success) {
              console.log('Added completed task to Firebase with ID:', result.id);
            } else {
              console.error('Failed to add completed task to Firebase:', result.error);
            }
          } catch (error) {
            console.error('Error adding completed task to Firebase:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error saving completed tasks to Firebase:', error);
    }
  }

  /**
   * Get all active tasks
   */
  getTasks(): Task[] {
    return [...this.tasks];
  }

  /**
   * Get all completed tasks
   */
  getCompletedTasks(): CompletedTask[] {
    return [...this.completedTasks];
  }

  /**
   * Add new task
   */
  addTask(taskData: TaskFormData): void {
    console.log('TaskManager.addTask called with:', taskData);
    const user = getCurrentUser();
    console.log('Current user:', user);
    
    if (!user) {
      console.error('No user logged in - cannot add task');
      throw new Error('You must be logged in to add a task');
    }
    
    // Create a task with all required fields including userId
    const newTask: Task = {
      id: Date.now().toString(), // Temporary ID, will be replaced by Firebase ID
      title: taskData.title,
      deadline: taskData.deadline,
      subtasks: taskData.subtasks || [],
      done: false,
      createdAt: Date.now(),
      userId: user.uid // CRITICAL: Include user ID for Firebase queries
    };
    
    console.log('Creating new task:', newTask);
    
    // Add task to local state immediately for instant UI feedback
    this.tasks = [...this.tasks, newTask];
    console.log('Task added to local state. New tasks array length:', this.tasks.length);
    
    // Save to Firebase in the background (don't wait for it)
    // This prevents blocking the UI while Firebase responds
    // IMPORTANT: Keep task in local state even if Firebase fails
    // The task is already visible to user, Firebase will sync when it works
    addTaskToFirebase(newTask).then(result => {
      console.log('Firebase save result:', result);
      
      if (result.success && result.id) {
        // Update the task ID with the one from Firebase
        this.tasks = this.tasks.map(task => 
          task.id === newTask.id ? { ...task, id: result.id! } : task
        );
        console.log('✅ Task saved to Firebase with ID:', result.id);
      } else {
        console.error('❌ Failed to save task to Firebase:', result.error);
        // KEEP task in local state - don't remove it
        // User can see it locally, will retry on next sync
        console.warn(`⚠️ Task created locally but Firebase save failed: ${result.error}`);
      }
    }).catch(error => {
      console.error('❌ Error saving task to Firebase:', error);
      // KEEP task in local state - don't remove it
      // User can see it locally, will retry on next sync
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ Task created locally but Firebase save failed: ${errorMsg}`);
    });
    
    console.log('TaskManager.addTask completed. Current tasks:', this.tasks);
  }

  /**
   * Edit existing task
   */
  editTask(taskId: string, taskData: TaskFormData): void {
    this.tasks = this.tasks.map(task => 
      task.id === taskId 
        ? { ...task, title: taskData.title, deadline: taskData.deadline, subtasks: taskData.subtasks || task.subtasks }
        : task
    );
    this.saveTasks();
  }

  /**
   * Delete task
   */
  deleteTask(taskId: string, isInCompletedView: boolean = false): void {
    if (isInCompletedView) {
      // For completed tasks, just remove from completed tasks
      this.completedTasks = this.completedTasks.filter(task => task.id !== taskId);
      this.saveCompletedTasks();
    } else {
      // For active tasks, remove from active tasks
      this.tasks = this.tasks.filter(task => task.id !== taskId);
      this.saveTasks();
    }
    
    // Remove notifications for this task
    notificationService.removeNotificationsForTask(taskId);
  }

  /**
   * Toggle task completion status
   */
  toggleTaskCompletion(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.done) {
      // Mark task as done and immediately move to completed
      const taskToComplete = { ...task, done: true };
      
      // Update state immediately without reloading from Firebase
      const now = Date.now();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const completedTask = {
        ...taskToComplete,
        completedAt: now,
        expiresAt: now + thirtyDaysInMs
      };
      
      this.completedTasks = [...this.completedTasks, completedTask];
      
      // Remove from active tasks
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      
      // Remove notifications for completed task
      notificationService.removeNotificationsForTask(taskId);
      
      // Save both collections
      this.saveTasks();
      this.saveCompletedTasks();
    } else {
      // This case shouldn't happen in normal flow since completed tasks are moved
      // But keeping it for safety
      this.tasks = this.tasks.map(t => 
        t.id === taskId ? { ...t, done: false } : t
      );
      this.saveTasks();
    }
  }

  /**
   * Add subtask to existing task
   */
  addSubtask(parentTaskId: string, taskData: TaskFormData): void {
    const newSubtask: Subtask = {
      id: Date.now(),
      title: taskData.title,
      deadline: taskData.deadline,
      done: false
    };
    
    this.tasks = this.tasks.map(task => 
      task.id === parentTaskId 
        ? { ...task, subtasks: [...task.subtasks, newSubtask] }
        : task
    );
    this.saveTasks();
  }

  /**
   * Edit existing subtask
   */
  editSubtask(parentTaskId: string, subtaskId: number, taskData: TaskFormData): void {
    this.tasks = this.tasks.map(task => {
      if (task.id === parentTaskId) {
        return {
          ...task,
          subtasks: task.subtasks.map(subtask => 
            subtask.id === subtaskId 
              ? { ...subtask, title: taskData.title, deadline: taskData.deadline }
              : subtask
          )
        };
      }
      return task;
    });
    this.saveTasks();
  }

  /**
   * Update subtask properties
   */
  updateSubtask(parentTaskId: string, subtaskId: number, updates: Partial<Subtask>): void {
    this.tasks = this.tasks.map(task => {
      if (task.id === parentTaskId) {
        const updatedSubtasks = task.subtasks.map(subtask => 
          subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
        );
        
        return {
          ...task,
          subtasks: updatedSubtasks
        };
      }
      return task;
    });
    this.saveTasks();
  }

  /**
   * Delete subtask
   */
  deleteSubtask(parentTaskId: string, subtaskId: number): void {
    this.tasks = this.tasks.map(task => 
      task.id === parentTaskId 
        ? { ...task, subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId) }
        : task
    );
    
    // Remove notifications for this subtask
    notificationService.removeNotificationsForSubtask(parentTaskId, subtaskId);
    
    this.saveTasks();
  }

  /**
   * Get task by ID
   */
  getTaskById(taskId: string): Task | undefined {
    return this.tasks.find(task => task.id === taskId);
  }

  /**
   * Get completed task by ID
   */
  getCompletedTaskById(taskId: string): CompletedTask | undefined {
    return this.completedTasks.find(task => task.id === taskId);
  }
}