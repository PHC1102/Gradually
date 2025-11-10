import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import './App.css';
import type { Task, TaskFormData, Subtask, ViewMode, CompletedTask, SortOption, SortDirection } from './types';
import { TaskForm } from './TaskForm';
import { TaskItem } from './TaskItem';
import { Notification } from './components/Notification.tsx';
import { CalendarView } from './components/CalendarView';
import { AnalysisView } from './components/AnalysisView';
import { Alert } from './components/Alert';
import { localStorageService } from './localStorageService';
import { taskSortingService } from './services/taskSortingService';
import { notificationService } from './services/notificationService';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<{ task: Task; subtask: Subtask } | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('active');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>('createdTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const loadedTasks = localStorageService.loadTasks();
    const loadedCompletedTasks = localStorageService.loadCompletedTasks();
    
    setTasks(loadedTasks);
    setCompletedTasks(loadedCompletedTasks);
    setIsInitialLoad(false); // Mark initial load as complete
  }, []);

  // Save tasks to localStorage whenever tasks change (but not on initial load)
  useEffect(() => {
    if (!isInitialLoad) {
      localStorageService.saveTasks(tasks);
      // Update notifications when tasks change
      notificationService.checkAndCreateOverdueNotifications(tasks);
      notificationService.cleanupNotifications(tasks);
    }
  }, [tasks, isInitialLoad]);

  // Save completed tasks to localStorage whenever they change (but not on initial load)
  useEffect(() => {
    if (!isInitialLoad) {
      localStorageService.saveCompletedTasks(completedTasks);
    }
  }, [completedTasks, isInitialLoad]);



  // Periodic check for overdue notifications (every minute)
  useEffect(() => {
    const checkOverdueInterval = setInterval(() => {
      if (tasks.length > 0) {
        notificationService.checkAndCreateOverdueNotifications(tasks);
        notificationService.cleanupNotifications(tasks);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkOverdueInterval);
  }, [tasks]);

  // CREATE: Add new task
  const handleAddTask = (taskData: TaskFormData) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskData.title,
      deadline: taskData.deadline,
      subtasks: taskData.subtasks || [],
      done: false,
      createdAt: Date.now()
    };
    setTasks([...tasks, newTask]);
    setShowForm(false);
  };

  // UPDATE: Edit existing task
  const handleEditTask = (taskData: TaskFormData) => {
    if (editingTask) {
      setTasks(tasks.map(task => 
        task.id === editingTask.id 
          ? { ...task, title: taskData.title, deadline: taskData.deadline, subtasks: taskData.subtasks || task.subtasks }
          : task
      ));
      setEditingTask(null);
    }
  };

  // DELETE: Remove task immediately from both active and completed
  const handleDeleteTask = (taskId: string) => {
    // Check if we're in completed view - no confirmation needed
    const isInCompletedView = currentView === 'completed';
    
    const performDelete = () => {
      if (isInCompletedView) {
        // For completed tasks, just remove from completed tasks
        localStorageService.removeFromCompleted(taskId);
        setCompletedTasks(prev => prev.filter(task => task.id !== taskId));
      } else {
        // For active tasks, remove from active tasks
        setTasks(prev => prev.filter(task => task.id !== taskId));
      }
      
      // Remove notifications for this task
      notificationService.removeNotificationsForTask(taskId);
    };
    
    if (isInCompletedView) {
      // No confirmation needed for completed tasks - delete immediately
      performDelete();
    } else {
      // Show custom alert for main view
      setAlertState({
        isOpen: true,
        title: 'Delete Task',
        message: 'Are you sure you want to delete this task? This action cannot be undone.',
        onConfirm: () => {
          performDelete();
          setAlertState(prev => ({ ...prev, isOpen: false }));
        }
      });
    }
  };

  // Toggle task completion - immediate completion without countdown
  const handleToggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.done) {
      // Mark task as done and immediately move to completed
      const taskToComplete = { ...task, done: true };
      
      // Add to completed tasks using localStorageService
      localStorageService.moveTaskToCompleted(taskToComplete);
      
      // Update state immediately without reloading from localStorage
      const now = Date.now();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const completedTask = {
        ...taskToComplete,
        completedAt: now,
        expiresAt: now + thirtyDaysInMs
      };
      
      setCompletedTasks(prev => [...prev, completedTask]);
      
      // Remove from active tasks
      setTasks(prev => prev.filter(t => t.id !== taskId));
      
      // Remove notifications for completed task
      notificationService.removeNotificationsForTask(taskId);
    } else {
      // This case shouldn't happen in normal flow since completed tasks are moved
      // But keeping it for safety
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, done: false } : t
      ));
    }
  };

  // Add subtask to existing task
  const handleAddSubtask = (taskData: TaskFormData) => {
    if (addingSubtaskTo) {
      const newSubtask: Subtask = {
        id: Date.now(),
        title: taskData.title,
        deadline: taskData.deadline,
        done: false
      };
      
      setTasks(tasks.map(task => 
        task.id === addingSubtaskTo 
          ? { ...task, subtasks: [...task.subtasks, newSubtask] }
          : task
      ));
      setAddingSubtaskTo(null);
    }
  };

  // Edit existing subtask
  const handleEditSubtask = (taskData: TaskFormData) => {
    if (editingSubtask) {
      setTasks(tasks.map(task => {
        if (task.id === editingSubtask.task.id) {
          return {
            ...task,
            subtasks: task.subtasks.map(subtask => 
              subtask.id === editingSubtask.subtask.id 
                ? { ...subtask, title: taskData.title, deadline: taskData.deadline }
                : subtask
            )
          };
        }
        return task;
      }));
      setEditingSubtask(null);
    }
  };

  // Update subtask - DO NOT auto-complete parent task
  const handleUpdateSubtask = (taskId: string, subtaskId: number, updates: Partial<Subtask>) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map(subtask => 
          subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
        );
        
        return {
          ...task,
          subtasks: updatedSubtasks
          // Note: NOT auto-completing parent task anymore
        };
      }
      return task;
    }));
  };

  // Delete subtask
  const handleDeleteSubtask = (taskId: string, subtaskId: number) => {
    const performDelete = () => {
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId) }
          : task
      ));
      
      // Remove notifications for this subtask
      notificationService.removeNotificationsForSubtask(taskId, subtaskId);
    };
    
    // Show custom alert for subtask deletion
    setAlertState({
      isOpen: true,
      title: 'Delete Subtask',
      message: 'Are you sure you want to delete this subtask? This action cannot be undone.',
      onConfirm: () => {
        performDelete();
        setAlertState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTask(null);
    setAddingSubtaskTo(null);
    setEditingSubtask(null);
  };

  const handleViewChange = (view: ViewMode) => {
    flushSync(() => {
      setCurrentView(view);
    });
    setSidebarOpen(false); // Close sidebar when changing view
  };

  const handleSortChange = (option: SortOption) => {
    if (option === sortOption) {
      // Toggle direction if same option is selected
      setSortDirection(taskSortingService.toggleDirection(sortDirection));
    } else {
      // Change option and set to ascending
      setSortOption(option);
      setSortDirection('asc');
    }
  };

  const getSortedTasks = (tasksToSort: Task[]) => {
    return taskSortingService.sortTasks(tasksToSort, sortOption, sortDirection);
  };

  const handleFormSubmit = (taskData: TaskFormData) => {
    if (editingTask) {
      handleEditTask(taskData);
    } else if (editingSubtask) {
      handleEditSubtask(taskData);
    } else if (addingSubtaskTo) {
      handleAddSubtask(taskData);
    } else {
      handleAddTask(taskData);
    }
  };

  return (
    <div className="app">
      {/* Hamburger Menu - Independent, fixed position */}
      <button 
        className="hamburger-btn-fixed"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      {/* Notification Bell - Independent, fixed position top-right */}
      <div className="notification-bell-fixed">
        <Notification onNotificationUpdate={() => {}} />
      </div>
      
      {/* Sort Controls - Fixed position next to bell */}
      {currentView === 'active' && (
        <div className="sort-controls-fixed">
          <div className="sort-controls">
            <span className="sort-label">Sort:</span>
            <button 
              className={`sort-btn ${sortOption === 'createdTime' ? 'active' : ''}`}
              onClick={() => handleSortChange('createdTime')}
              title="Sort by Created Time"
            >
              Time {sortOption === 'createdTime' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className={`sort-btn ${sortOption === 'deadline' ? 'active' : ''}`}
              onClick={() => handleSortChange('deadline')}
              title="Sort by Deadline"
            >
              Deadline {sortOption === 'deadline' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      )}
      
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3></h3>
          <button 
            className="close-sidebar-btn"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="sidebar-content">
          <button 
            className={`sidebar-item ${currentView === 'active' ? 'active' : ''}`}
            onClick={() => handleViewChange('active')}
          >
            <span className="sidebar-icon">📝</span>
            <span>Active Tasks</span>
            <span className="count">({tasks.length})</span>
          </button>
          <button 
            className={`sidebar-item ${currentView === 'completed' ? 'active' : ''}`}
            onClick={() => handleViewChange('completed')}
          >
            <span className="sidebar-icon">✅</span>
            <span>Completed Tasks</span>
            <span className="count">({completedTasks.length})</span>
          </button>
          <button 
            className={`sidebar-item ${currentView === 'calendar' ? 'active' : ''}`}
            onClick={() => handleViewChange('calendar')}
          >
            <span className="sidebar-icon">📅</span>
            <span>Calendar</span>
          </button>
          <button 
            className={`sidebar-item ${currentView === 'analysis' ? 'active' : ''}`}
            onClick={() => handleViewChange('analysis')}
          >
            <span className="sidebar-icon">📊</span>
            <span>Analysis</span>
          </button>
        </div>
      </div>

      <div className="app-header">
        <div className="header-center">
          <h1>GRADUALLY</h1>
        </div>
        
        <div className="header-right">
          {currentView === 'active' && (
            <button 
              onClick={() => setShowForm(true)}
              className="add-task-btn"
            >
              Add New Task
            </button>
          )}
        </div>
      </div>

      <div className="tasks-container" key={currentView}>
        {currentView === 'active' ? (
          // Active Tasks View
          tasks.length === 0 ? (
            <div className="empty-state">
              <p>No active tasks. Add your first task!</p>
            </div>
          ) : (
            getSortedTasks(tasks).map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleDone={handleToggleTask}
                onEdit={setEditingTask}
                onDelete={handleDeleteTask}
                onUpdateSubtask={handleUpdateSubtask}
                onDeleteSubtask={handleDeleteSubtask}
                onEditSubtask={(subtask) => setEditingSubtask({ task, subtask })}
              />
            ))
          )
        ) : currentView === 'completed' ? (
          // Completed Tasks View
          completedTasks.length === 0 ? (
            <div className="empty-state">
              <p>No completed tasks yet.</p>
            </div>
          ) : (
            completedTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleDone={() => {}} // No toggle for completed tasks
                onEdit={() => {}} // No edit for completed tasks
                onDelete={handleDeleteTask}
                onUpdateSubtask={() => {}} // No subtask updates for completed tasks
                onDeleteSubtask={() => {}} // No subtask updates for completed tasks
                onEditSubtask={() => {}} // No subtask editing for completed tasks
                isCompleted={true}
                completedAt={task.completedAt}
              />
            ))
          )
        ) : currentView === 'calendar' ? (
          // Calendar View
          <CalendarView
            tasks={tasks}
            onEditTask={setEditingTask}
            onDeleteTask={handleDeleteTask}
            onToggleTask={handleToggleTask}
            onEditSubtask={(subtask) => setEditingSubtask(subtask)}
            onUpdateSubtask={handleUpdateSubtask}
            onDeleteSubtask={handleDeleteSubtask}
          />
        ) : currentView === 'analysis' ? (
          // Analysis View
          <AnalysisView
            tasks={tasks}
            completedTasks={completedTasks}
            onTaskFilter={(filterType, value) => {
              // Handle task filtering based on analysis interactions
              console.log('Filter tasks by:', filterType, value);
              // You can implement filtering logic here if needed
            }}
          />
        ) : (
          // Fallback for any other view state
          <div className="empty-state">
            <p>Unknown view state. Please refresh the page.</p>
          </div>
        )}
      </div>

      {(showForm || editingTask || addingSubtaskTo || editingSubtask) && (
        <TaskForm
          task={editingTask || (editingSubtask ? { 
            id: editingSubtask.subtask.id.toString(), 
            title: editingSubtask.subtask.title, 
            deadline: editingSubtask.subtask.deadline, 
            subtasks: [], 
            done: editingSubtask.subtask.done 
          } : undefined)}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isSubtask={!!addingSubtaskTo || !!editingSubtask}
        />
      )}
      
      {/* Custom Alert Dialog */}
      <Alert
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        onConfirm={alertState.onConfirm}
        onCancel={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default App