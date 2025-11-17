import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import './App.css';
import './AppLayout.css';
import './TaskItem.css';
import './TaskForm.css';
import './SortControls.css';
import './Alert.css';
import type { Task, TaskFormData, Subtask, ViewMode, CompletedTask, SortOption, SortDirection } from './types';
import { TaskForm } from './TaskForm';
import { TaskItem } from './TaskItem';
import { Notification } from './components/Notification.tsx';
import { CalendarView } from './components/CalendarView';
import { AnalysisView } from './components/AnalysisView';
import { Alert } from './components/Alert';
import { taskSortingService } from './services/taskSortingService';
import { notificationService } from './services/notificationService';
import { TaskManager } from './services/taskManager';
import { AppController } from './services/appController';
import Login from './components/Login';
import { useAuth } from './contexts/AuthContext';
import { logoutUser } from './services/authService';

function App() {
  const { currentUser, loading, isEmailVerified } = useAuth();
  
  // Show loading state while checking auth
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  // Show login screen if not authenticated
  if (!currentUser) {
    return <Login />;
  }
  
  // Show email verification message if email is not verified
  if (!isEmailVerified) {
    return (
      <div className="login-container">
        <h2>Email Verification Required</h2>
        <p>Please verify your email address to continue. Check your inbox for the verification email.</p>
        <p>After verifying your email, please refresh this page or log out and log back in.</p>
        <button onClick={async () => {
          await logoutUser();
        }}>
          Logout
        </button>
      </div>
    );
  }
  
  // Use refs to maintain single instances
  const [appController] = useState(() => new AppController());
  const [taskManager] = useState(() => new TaskManager());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('createdTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  // Add form visibility state to trigger re-renders
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Initialize tasks (in-memory only now)
  useEffect(() => {
    const loadTasksAsync = async () => {
      console.log('useEffect: Loading tasks for current user');
      // Add a small delay to allow Firebase pending operations to complete
      // This ensures tasks saved in the background have time to persist
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await taskManager.loadTasks();
      const loadedTasks = taskManager.getTasks();
      const loadedCompletedTasks = taskManager.getCompletedTasks();
      console.log('useEffect: Loaded', loadedTasks.length, 'active tasks and', loadedCompletedTasks.length, 'completed tasks');
      setTasks(loadedTasks);
      setCompletedTasks(loadedCompletedTasks);
    };
    
    loadTasksAsync();
  }, [taskManager, currentUser?.uid]);

  // Periodic check for overdue notifications (every minute)
  useEffect(() => {
    const checkOverdueInterval = setInterval(() => {
      const currentTasks = taskManager.getTasks();
      if (currentTasks.length > 0) {
        notificationService.checkAndCreateOverdueNotifications(currentTasks);
        notificationService.cleanupNotifications(currentTasks);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkOverdueInterval);
  }, [taskManager]);

  // CREATE: Add new task (SYNCHRONOUS - like handleAddSubtask)
  const handleAddTask = (taskData: TaskFormData) => {
    console.log('handleAddTask called with:', taskData);
    taskManager.addTask(taskData);
    console.log('Task added to taskManager');
    
    // Update the tasks state
    const updatedTasks = taskManager.getTasks();
    console.log('Updated tasks from taskManager:', updatedTasks);
    setTasks(updatedTasks);
    setCompletedTasks(taskManager.getCompletedTasks());
    
    // Hide the form and reset all form states
    console.log('Hiding form and resetting form states');
    appController.hideForm();
    appController.resetFormStates();
    setIsFormVisible(false); // Hide form by updating React state
    
    // Force a re-render to hide the form and update tasks
    console.log('Forcing re-render with updated tasks');
    setTasks([...taskManager.getTasks()]);
    setCompletedTasks([...taskManager.getCompletedTasks()]);
    console.log('UI updated with new tasks - form should be hidden now');
  };

  // UPDATE: Edit existing task
  const handleEditTask = (taskData: TaskFormData) => {
    const editingTask = appController.getEditingTask();
    if (editingTask) {
      taskManager.editTask(editingTask.id, taskData);
      setTasks(taskManager.getTasks());
      setCompletedTasks(taskManager.getCompletedTasks());
      appController.setEditingTask(null);
      appController.hideForm();
      setIsFormVisible(false);
      // Force a re-render to hide the form
      setTasks([...taskManager.getTasks()]);
    }
  };

  // Add subtask to existing task
  const handleAddSubtask = (taskData: TaskFormData) => {
    const addingSubtaskTo = appController.getAddingSubtaskTo();
    if (addingSubtaskTo) {
      taskManager.addSubtask(addingSubtaskTo, taskData);
      setTasks(taskManager.getTasks());
      setCompletedTasks(taskManager.getCompletedTasks());
      appController.setAddingSubtaskTo(null);
      appController.hideForm();
      setIsFormVisible(false);
      // Force a re-render to hide the form
      setTasks([...taskManager.getTasks()]);
    }
  };

  // Edit existing subtask
  const handleEditSubtask = (taskData: TaskFormData) => {
    const editingSubtask = appController.getEditingSubtask();
    if (editingSubtask) {
      taskManager.editSubtask(editingSubtask.task.id, editingSubtask.subtask.id, taskData);
      setTasks(taskManager.getTasks());
      setCompletedTasks(taskManager.getCompletedTasks());
      appController.setEditingSubtask(null);
      appController.hideForm();
      setIsFormVisible(false);
      // Force a re-render to hide the form
      setTasks([...taskManager.getTasks()]);
    }
  };

  // Update subtask - DO NOT auto-complete parent task
  const handleUpdateSubtask = (taskId: string, subtaskId: number, updates: Partial<Subtask>) => {
    taskManager.updateSubtask(taskId, subtaskId, updates);
    setTasks(taskManager.getTasks());
    setCompletedTasks(taskManager.getCompletedTasks());
    // Force a re-render to update the UI
    setTasks([...taskManager.getTasks()]);
  };

  // Delete subtask
  const handleDeleteSubtask = (taskId: string, subtaskId: number) => {
    const performDelete = () => {
      taskManager.deleteSubtask(taskId, subtaskId);
      setTasks(taskManager.getTasks());
      setCompletedTasks(taskManager.getCompletedTasks());
      
      // Remove notifications for this subtask
      notificationService.removeNotificationsForSubtask(taskId, subtaskId);
      // Force a re-render to update the UI
      setTasks([...taskManager.getTasks()]);
    };
    
    // Show custom alert for subtask deletion
    appController.showAlert('Delete Subtask', 'Are you sure you want to delete this subtask? This action cannot be undone.', () => {
      performDelete();
      appController.hideAlert();
      // Force a re-render to hide the alert and update the UI
      setTasks([...taskManager.getTasks()]);
      setCompletedTasks([...taskManager.getCompletedTasks()]);
    });
  };

  // Remove task immediately from both active and completed
  const handleDeleteTask = (taskId: string) => {
    // Check if we're in completed view - no confirmation needed
    const currentView = appController.getCurrentView();
    const isInCompletedView = currentView === 'completed';
    
    const performDelete = () => {
      taskManager.deleteTask(taskId, isInCompletedView);
      if (isInCompletedView) {
        setCompletedTasks(taskManager.getCompletedTasks());
      } else {
        setTasks(taskManager.getTasks());
      }
      // Force a re-render to update the UI
      setTasks([...taskManager.getTasks()]);
      setCompletedTasks([...taskManager.getCompletedTasks()]);
    };
    
    if (isInCompletedView) {
      // No confirmation needed for completed tasks - delete immediately
      performDelete();
    } else {
      // Show custom alert for main view
      appController.showAlert('Delete Task', 'Are you sure you want to delete this task? This action cannot be undone.', () => {
        performDelete();
        appController.hideAlert();
        // Force a re-render to hide the alert and update the task list
        setTasks([...taskManager.getTasks()]);
        setCompletedTasks([...taskManager.getCompletedTasks()]);
      });
    }
  };

  // Toggle task completion - immediate completion without countdown
  const handleToggleTask = (taskId: string) => {
    taskManager.toggleTaskCompletion(taskId);
    setTasks(taskManager.getTasks());
    setCompletedTasks(taskManager.getCompletedTasks());
    // Force a re-render to update the UI
    setTasks([...taskManager.getTasks()]);
    setCompletedTasks([...taskManager.getCompletedTasks()]);
  };

  const handleFormCancel = () => {
    appController.hideForm();
    appController.setEditingTask(null);
    appController.setAddingSubtaskTo(null);
    appController.setEditingSubtask(null);
    setIsFormVisible(false); // Hide form by updating React state
    // Force a re-render to hide the form
    setTasks([...tasks]);
  };

  const handleViewChange = (view: ViewMode) => {
    flushSync(() => {
      appController.setCurrentView(view);
    });
    appController.closeSidebar(); // Close sidebar when changing view
    // Force a re-render to update the view
    setTasks([...tasks]);
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

  const handleFormSubmit = async (taskData: TaskFormData) => {
    console.log('handleFormSubmit called with:', taskData);
    const editingTask = appController.getEditingTask();
    const editingSubtask = appController.getEditingSubtask();
    const addingSubtaskTo = appController.getAddingSubtaskTo();
    
    try {
      if (editingTask) {
        console.log('Editing existing task');
        handleEditTask(taskData);
      } else if (editingSubtask) {
        console.log('Editing existing subtask');
        handleEditSubtask(taskData);
      } else if (addingSubtaskTo) {
        console.log('Adding subtask to existing task');
        handleAddSubtask(taskData);
      } else {
        console.log('Adding new task');
        // Call synchronously now - no await
        handleAddTask(taskData);
      }
      console.log('Form submission completed successfully');
    } catch (error) {
      console.error('Error during form submission:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Showing error alert:', errorMessage);
      appController.showAlert(
        'Error', 
        `Failed to save task: ${errorMessage}`,
        () => {
          appController.hideAlert();
          setTasks([...tasks]);
        }
      );
      // Re-throw so TaskForm knows the submission failed
      throw error;
    }
  };

  return (
    <div className="app">
      {/* Hamburger Menu - Independent, fixed position */}
      <button 
        className="hamburger-btn-fixed"
        onClick={() => {
          appController.toggleSidebar();
          // Force a re-render to show/hide the sidebar
          setTasks([...tasks]);
        }}
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
      {appController.getCurrentView() === 'active' && (
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
      {appController.isSidebarOpen() && (
        <div className="sidebar-overlay" onClick={() => {
          appController.closeSidebar();
          // Force a re-render to hide the sidebar
          setTasks([...tasks]);
        }} />
      )}
      
      {/* Sidebar */}
      <div className={`sidebar ${appController.isSidebarOpen() ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3></h3>
          <button 
            className="close-sidebar-btn"
            onClick={() => {
              appController.closeSidebar();
              // Force a re-render to hide the sidebar
              setTasks([...tasks]);
            }}
          >
            ×
          </button>
        </div>
        <div className="sidebar-content">
          <button 
            className={`sidebar-item ${appController.getCurrentView() === 'active' ? 'active' : ''}`}
            onClick={() => handleViewChange('active')}
          >
            <span className="sidebar-icon">📝</span>
            <span>Active Tasks</span>
            <span className="count">({tasks.length})</span>
          </button>
          <button 
            className={`sidebar-item ${appController.getCurrentView() === 'completed' ? 'active' : ''}`}
            onClick={() => handleViewChange('completed')}
          >
            <span className="sidebar-icon">✅</span>
            <span>Completed Tasks</span>
            <span className="count">({completedTasks.length})</span>
          </button>
          <button 
            className={`sidebar-item ${appController.getCurrentView() === 'calendar' ? 'active' : ''}`}
            onClick={() => handleViewChange('calendar')}
          >
            <span className="sidebar-icon">📅</span>
            <span>Calendar</span>
          </button>
          <button 
            className={`sidebar-item ${appController.getCurrentView() === 'analysis' ? 'active' : ''}`}
            onClick={() => handleViewChange('analysis')}
          >
            <span className="sidebar-icon">📊</span>
            <span>Analysis</span>
          </button>
          <button 
            className="sidebar-item logout-item"
            onClick={async () => {
              await logoutUser();
              // The AuthProvider will handle redirecting to login screen
            }}
          >
            <span className="sidebar-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="app-header">
        <div className="header-center">
          <h1>GRADUALLY</h1>
        </div>
        
        <div className="header-right">
          {appController.getCurrentView() === 'active' && (
            <button 
              onClick={() => {
                appController.showForm();
                setIsFormVisible(true); // Show form by updating React state
                // Force a re-render to show the form
                setTasks([...tasks]);
              }}
              className="add-task-btn"
            >
              Add New Task
            </button>
          )}
        </div>
      </div>

      <div className="tasks-container" key={appController.getCurrentView()}>
        {appController.getCurrentView() === 'active' ? (
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
                onEdit={(task) => {
                  appController.setEditingTask(task);
                  setIsFormVisible(true); // Show form by updating React state
                  // Force a re-render to show the form
                  setTasks([...tasks]);
                }}
                onDelete={(taskId) => {
                  handleDeleteTask(taskId);
                  // Force a re-render to update the UI
                  setTasks([...taskManager.getTasks()]);
                  setCompletedTasks([...taskManager.getCompletedTasks()]);
                }}
                onUpdateSubtask={handleUpdateSubtask}
                onDeleteSubtask={(taskId, subtaskId) => {
                  handleDeleteSubtask(taskId, subtaskId);
                  // Force a re-render to update the UI
                  setTasks([...taskManager.getTasks()]);
                  setCompletedTasks([...taskManager.getCompletedTasks()]);
                }}
                onEditSubtask={(subtask) => {
                  appController.setEditingSubtask({ task, subtask });
                  // Force a re-render to show the form
                  setTasks([...tasks]);
                }}
              />
            ))
          )
        ) : appController.getCurrentView() === 'completed' ? (
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
                onDelete={(taskId) => {
                  handleDeleteTask(taskId);
                  // Force a re-render to update the UI
                  setTasks([...taskManager.getTasks()]);
                  setCompletedTasks([...taskManager.getCompletedTasks()]);
                }}
                onUpdateSubtask={() => {}} // No subtask updates for completed tasks
                onDeleteSubtask={() => {}} // No subtask updates for completed tasks
                onEditSubtask={() => {}} // No subtask editing for completed tasks
                isCompleted={true}
                completedAt={task.completedAt}
              />
            ))
          )
        ) : appController.getCurrentView() === 'calendar' ? (
          // Calendar View
          <CalendarView
            tasks={tasks}
            onEditTask={(task) => {
              appController.setEditingTask(task);
              setIsFormVisible(true); // Show form by updating React state
              // Force a re-render to show the form
              setTasks([...tasks]);
            }}
            onDeleteTask={(taskId) => {
              handleDeleteTask(taskId);
              // Force a re-render to update the UI
              setTasks([...taskManager.getTasks()]);
              setCompletedTasks([...taskManager.getCompletedTasks()]);
            }}
            onToggleTask={handleToggleTask}
            onEditSubtask={(subtask) => {
              appController.setEditingSubtask(subtask);
              setIsFormVisible(true); // Show form by updating React state
              // Force a re-render to show the form
              setTasks([...tasks]);
            }}
            onUpdateSubtask={handleUpdateSubtask}
            onDeleteSubtask={(taskId, subtaskId) => {
              handleDeleteSubtask(taskId, subtaskId);
              // Force a re-render to update the UI
              setTasks([...taskManager.getTasks()]);
              setCompletedTasks([...taskManager.getCompletedTasks()]);
            }}
          />
        ) : appController.getCurrentView() === 'analysis' ? (
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

      {(isFormVisible || appController.shouldShowForm() || appController.getEditingTask() || appController.getAddingSubtaskTo() || appController.getEditingSubtask()) && (
        <TaskForm
          task={appController.getEditingTask() || (appController.getEditingSubtask() ? { 
            id: appController.getEditingSubtask()!.subtask.id.toString(), 
            title: appController.getEditingSubtask()!.subtask.title, 
            deadline: appController.getEditingSubtask()!.subtask.deadline, 
            subtasks: [], 
            done: appController.getEditingSubtask()!.subtask.done 
          } : undefined)}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isSubtask={!!appController.getAddingSubtaskTo() || !!appController.getEditingSubtask()}
        />
      )}
      
      {/* Custom Alert Dialog */}
      <Alert
        isOpen={appController.isOpenAlert()}
        title={appController.getAlertTitle()}
        message={appController.getAlertMessage()}
        onConfirm={appController.getOnConfirmCallback()}
        onCancel={() => appController.hideAlert()}
      />
    </div>
  );
}

export default App;