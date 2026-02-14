import type { Task, TaskFormData, Subtask, CompletedTask } from '../types';
import { notificationService } from './notificationService';
import { 
  addTaskToFirebase, 
  getTasksFromFirebase, 
  getCompletedTasksFromFirebase,
  updateTaskInFirebase,
  updateCompletedTaskInFirebase,
  addCompletedTaskToFirebase,
  // Project tasks (NEW)
  addProjectTask,
  updateProjectTask,
  deleteProjectTask,
  deleteField
} from './firebaseTaskService';
import { getCurrentUser } from './authService';

/**
 * TaskManager class to handle all task-related operations
 * Encapsulates business logic for task management with single responsibility
 */
export class TaskManager {
  private tasks: Task[] = [];
  private completedTasks: CompletedTask[] = [];
  // Track locally-created task IDs that are pending a Firebase write
  private pendingLocalIds: Set<string | number> = new Set();
  private currentOrgId: string | null = null;
  private currentProjectId: string | null = null;
  
  constructor() {
    // Initialize without loading tasks
    // Loading is handled by the App component
  }

  setContext(orgId: string | null, projectId: string | null) {
    this.currentOrgId = orgId;
    this.currentProjectId = projectId;
  }

  /**
   * Set tasks directly (for real-time updates)
   */
  setTasks(tasks: Task[]) {
    this.tasks = tasks;
  }

  /**
   * Set completed tasks directly (for real-time updates)
   */
  setCompletedTasks(tasks: CompletedTask[]) {
    this.completedTasks = tasks;
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
          const projectId = this.currentProjectId;
          this.tasks = (tasksResult.tasks || []).filter((task) =>
            projectId ? task.projectId === projectId : true
          );
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
        // Skip tasks that are currently pending an initial add to avoid duplicates
        if (this.pendingLocalIds.has(task.id)) {
          console.log('Skipping pending local task during save:', task.id);
          continue;
        }

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
          // Add new task (remove local id before sending)
          try {
            const { id, ...taskWithoutId } = task as any;
            const result = await addTaskToFirebase(taskWithoutId);
            if (result.success) {
              console.log('Added task to Firebase with ID:', result.id);
              // Update local task id to server id
              this.tasks = this.tasks.map(t => t.id === id ? { ...t, id: result.id! } : t);
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

    if (!this.currentOrgId || !this.currentProjectId) {
      console.error('No org/project context - cannot add task');
      throw new Error('Please select an organization and project first');
    }
    
    const newTask: Omit<Task, 'id'> = {
      title: taskData.title,
      deadline: taskData.deadline,
      subtasks: taskData.subtasks || [],
      done: false,
      createdAt: Date.now(),
      userId: user.uid,
      orgId: this.currentOrgId,
      projectId: this.currentProjectId,
      reporterId: user.uid,
      assigneeId: taskData.assigneeId ?? user.uid,
      priority: taskData.priority ?? 'medium',
      status: taskData.status ?? 'todo',
      description: taskData.description ?? '',
    };
    
    console.log('Creating new project task:', newTask);
    
    // Save to Firebase - real-time listener will update local state automatically
    addProjectTask(this.currentOrgId, this.currentProjectId, newTask).then(result => {
      console.log('Firebase save result:', result);

      if (result.success && result.id) {
        console.log('✅ Task saved to Firebase with ID:', result.id);
      } else {
        console.error('❌ Failed to save task to Firebase:', result.error);
        // KEEP task in local state - don't remove it
        // User can see it locally, will retry on next sync
        console.warn(`⚠️ Task created locally but Firebase save failed: ${result.error}`);
      }
    }).catch(error => {
      console.error('❌ Error saving task to Firebase:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ Task created locally but Firebase save failed: ${errorMsg}`);
    });
    
    console.log('TaskManager.addTask completed. Current tasks:', this.tasks);
  }

  /**
   * Edit existing task - Uses project path for proper update
   */
  editTask(taskId: string, taskData: TaskFormData): void {
    if (!this.currentOrgId || !this.currentProjectId) {
      console.error('Cannot edit task: no org/project context');
      return;
    }

    const updates = {
      title: taskData.title,
      deadline: taskData.deadline,
      subtasks: taskData.subtasks,
      description: taskData.description,
      assigneeId: taskData.assigneeId,
      status: taskData.status,
      priority: taskData.priority,
    };

    // Update in Firebase - real-time listener will update local state
    updateProjectTask(this.currentOrgId, this.currentProjectId, taskId, updates)
      .then(res => {
        if (res.success) {
          console.log('✅ Updated task in Firebase:', taskId);
        } else {
          console.warn('❌ Failed to update task in Firebase:', res.error);
        }
      })
      .catch(err => {
        console.error('❌ Error updating task in Firebase:', err);
      });
  }

  /**
   * Delete task - Uses project path for proper deletion
   */
  deleteTask(taskId: string, isInCompletedView: boolean = false): void {
    if (!this.currentOrgId || !this.currentProjectId) {
      console.error('Cannot delete task: no org/project context');
      return;
    }

    if (isInCompletedView) {
      // For completed tasks, remove from local state
      this.completedTasks = this.completedTasks.filter(task => task.id !== taskId);
      
      // Delete from project tasks collection
      deleteProjectTask(this.currentOrgId, this.currentProjectId, taskId).then(res => {
        if (res.success) {
          console.log('✅ Deleted completed task from Firebase:', taskId);
        } else {
          console.warn('❌ Failed to delete completed task from Firebase:', res.error);
        }
      }).catch(err => {
        console.error('❌ Error deleting completed task from Firebase:', err);
      });
    } else {
      // For active tasks, remove from local state
      this.tasks = this.tasks.filter(task => task.id !== taskId);
      
      // Delete from project tasks collection
      deleteProjectTask(this.currentOrgId, this.currentProjectId, taskId).then(res => {
        if (res.success) {
          console.log('✅ Deleted task from Firebase:', taskId);
        } else {
          console.warn('❌ Failed to delete task from Firebase:', res.error);
        }
      }).catch(err => {
        console.error('❌ Error deleting task from Firebase:', err);
      });
    }
    
    // Remove notifications for this task
    notificationService.removeNotificationsForTask(taskId);
  }

  /**
   * Toggle task completion status
   */
  async toggleTaskCompletion(taskId: string): Promise<void> {
    // Find task in either active or completed list
    const task = this.tasks.find(t => t.id === taskId) || this.completedTasks.find(t => t.id === taskId);
    if (!task) {
      console.error('❌ Task not found:', taskId);
      return;
    }

    if (!task.done) {
      // Mark task as done and update in Firebase
      const now = Date.now();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      
      const updates = {
        done: true,
        completedAt: now,
        expiresAt: now + thirtyDaysInMs
      };
      
      // Update in Firebase immediately
      if (this.currentOrgId && this.currentProjectId) {
        try {
          await updateProjectTask(this.currentOrgId, this.currentProjectId, taskId, updates);
          console.log('✅ Task marked as complete in Firebase:', taskId);
          
          // Remove notifications for completed task
          notificationService.removeNotificationsForTask(taskId);
          
          // Note: Real-time listener will automatically update local state
          // No need to manually update this.tasks or this.completedTasks
        } catch (error) {
          console.error('❌ Failed to mark task as complete:', error);
        }
      } else {
        console.error('❌ Cannot complete task: No org/project context');
      }
    } else {
      // Uncomplete task - mark as not done and remove completion timestamps
      const updates: any = {
        done: false,
        completedAt: deleteField(),
        expiresAt: deleteField()
      };
      
      if (this.currentOrgId && this.currentProjectId) {
        try {
          await updateProjectTask(this.currentOrgId, this.currentProjectId, taskId, updates);
          console.log('✅ Task marked as incomplete in Firebase:', taskId);
          
          // Note: Real-time listener will automatically update local state
        } catch (error) {
          console.error('❌ Failed to mark task as incomplete:', error);
        }
      }
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