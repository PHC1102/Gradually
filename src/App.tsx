import { useState, useEffect, useCallback, useRef } from 'react';
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
import { BoardView } from './components/BoardView';
import { LoadingSpinner } from './components/LoadingSpinner';
import SelectOrganizationPage from './pages/SelectOrganizationPage';
import { useOrganizationStore } from './store/organizationStore';
import type { OrgState } from './store/organizationStore';
import { taskSortingService } from './services/taskSortingService';
import { notificationService } from './services/notificationService';
import { TaskManager } from './services/taskManager';
import { AppController } from './services/appController';
import Login from './components/Login';
import { useAuth } from './contexts/AuthContext';
import { logoutUser } from './services/authService';
import MembersManagementPage from './components/org/MembersManagementPage';
import ProjectMembersPage from './components/project/ProjectMembersPage';
import { getOrganizationMembers, subscribeToOrganizationMembers, leaveOrganization, deleteOrganization } from './services/organizationService';
import { getProjectMembers, getMyProjectRole, subscribeToProjectMembers, leaveProject, deleteProject } from './services/projectService';
import { subscribeToProjectTasks } from './services/firebaseTaskService';
import ProfileSetupPage from './pages/ProfileSetupPage';
import AccountMenu from './components/AccountMenu';
import SelectProjectPage from './pages/SelectProjectPage';
import { useProjectStore } from './store/projectStore';

function App() {
  const { currentUser, loading, isEmailVerified, profileLoading, needsProfileSetup, refreshProfile } = useAuth();
  
  // Zustand selectors (must be called before any conditional returns to keep hook order stable)
  const selectedOrgId = useOrganizationStore((state: OrgState) => state.selectedOrgId);
  const setSelectedOrgId = useOrganizationStore((state: OrgState) => state.setSelectedOrgId);
  const organizations = useOrganizationStore((state: OrgState) => state.organizations);
  const setOrganizations = useOrganizationStore((state: OrgState) => state.setOrganizations);
  const members = useOrganizationStore((state: OrgState) => state.members);
  const setMembers = useOrganizationStore((state: OrgState) => state.setMembers);
  const currentRole = useOrganizationStore((state: OrgState) => state.currentRole);
  const setCurrentRole = useOrganizationStore((state: OrgState) => state.setCurrentRole);
  const projects = useProjectStore((state) => state.projects);
  const setProjects = useProjectStore((state) => state.setProjects);
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useProjectStore((state) => state.setSelectedProjectId);
  const projectMembers = useProjectStore((state) => state.projectMembers);
  const setProjectMembers = useProjectStore((state) => state.setProjectMembers);
  const currentProjectRole = useProjectStore((state) => state.currentProjectRole);
  const setCurrentProjectRole = useProjectStore((state) => state.setCurrentProjectRole);
  const setProjectUserId = useProjectStore((state) => state.setCurrentUserId);
  const setOrgUserId = useOrganizationStore((state: OrgState) => state.setCurrentUserId);
  const [validatingOrg, setValidatingOrg] = useState(false);
  const [appController] = useState(() => new AppController());
  const [taskManager] = useState(() => new TaskManager());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('createdTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sidebarGroup, setSidebarGroup] = useState<'main' | 'views' | 'settings' | 'actions'>('main');
  
  // Initialize user-specific storage when user changes
  useEffect(() => {
    if (currentUser) {
      // Set user ID in stores to enable user-specific localStorage
      setOrgUserId(currentUser.uid);
      setProjectUserId(currentUser.uid);
    } else {
      // Clear stores when user logs out
      setOrgUserId(null);
      setProjectUserId(null);
      if (selectedOrgId) {
        setSelectedOrgId(null);
      }
      setValidatingOrg(false);
    }
  }, [currentUser, selectedOrgId, setSelectedOrgId, setOrgUserId, setProjectUserId]);
  
  // Load organizations when user is authenticated
  useEffect(() => {
    if (!currentUser) {
      setOrganizations([]);
      setValidatingOrg(false);
      return;
    }
    
    setValidatingOrg(true);
    
    const loadOrgs = async () => {
      try {
        const { getMyOrganizations } = await import('./services/organizationService');
        const orgs = await getMyOrganizations();
        setOrganizations(orgs);
        setValidatingOrg(false);
      } catch (err) {
        console.error('Error loading organizations', err);
        setOrganizations([]);
        setValidatingOrg(false);
      }
    };
    
    loadOrgs();
  }, [currentUser, setOrganizations]);

  // Validate selectedOrgId against loaded organizations
  useEffect(() => {
    if (!currentUser || !selectedOrgId || organizations.length === 0) {
      return;
    }
    
    // Validate selectedOrgId - if it doesn't belong to user's organizations, clear it
    const isValid = organizations.some(org => org.id === selectedOrgId);
    if (!isValid) {
      console.warn('Selected organization not found in user organizations, clearing selection');
      setSelectedOrgId(null);
    }
  }, [currentUser, selectedOrgId, organizations, setSelectedOrgId]);

  useEffect(() => {
    if (!selectedOrgId) {
      setProjects([]);
      setSelectedProjectId(null);
      setProjectMembers([]);
    }
  }, [selectedOrgId, setProjects, setSelectedProjectId, setProjectMembers]);

  // Real-time subscription for project members
  useEffect(() => {
    if (!selectedOrgId || !selectedProjectId) {
      setProjectMembers([]);
      setCurrentProjectRole(null);
      return;
    }
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToProjectMembers(
      selectedOrgId,
      selectedProjectId,
      (membersList, myRole) => {
        setProjectMembers(membersList);
        setCurrentProjectRole(myRole);
      },
      (error) => {
        console.error('Failed to subscribe to project members', error);
        setProjectMembers([]);
        setCurrentProjectRole(null);
      }
    );
    
    // Cleanup subscription on unmount or when deps change
    return () => unsubscribe();
  }, [selectedOrgId, selectedProjectId, setProjectMembers, setCurrentProjectRole]);
  
  // Real-time subscription for organization members
  useEffect(() => {
    if (!selectedOrgId || !currentUser) {
      setCurrentRole(null);
      setMembers([]);
      return;
    }
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToOrganizationMembers(
      selectedOrgId,
      (membersList) => {
        setMembers(membersList);
        const myMembership = membersList.find((member) => member.id === currentUser.uid);
        setCurrentRole(myMembership?.role ?? null);
      },
      (error) => {
        console.error('Failed to subscribe to members', error);
        setMembers([]);
        setCurrentRole(null);
      }
    );
    
    // Cleanup subscription on unmount or when deps change
    return () => unsubscribe();
  }, [selectedOrgId, currentUser, setMembers, setCurrentRole]);

  // Keep refreshMembers for manual refresh if needed
  const refreshMembers = useCallback(async () => {
    if (!selectedOrgId || !currentUser) return;
    try {
      const list = await getOrganizationMembers(selectedOrgId);
      setMembers(list);
      const myMembership = list.find((member) => member.id === currentUser.uid);
      setCurrentRole(myMembership?.role ?? null);
    } catch (err) {
      console.error('Failed to load members', err);
      setMembers([]);
      setCurrentRole(null);
    }
  }, [currentUser, selectedOrgId, setMembers, setCurrentRole]);

  // Initialize task manager context
  useEffect(() => {
    if (selectedOrgId && selectedProjectId) {
      taskManager.setContext(selectedOrgId, selectedProjectId);
    }
  }, [taskManager, selectedOrgId, selectedProjectId]);

  // Real-time subscription for project tasks
  useEffect(() => {
    if (!selectedOrgId || !selectedProjectId) {
      setTasks([]);
      setCompletedTasks([]);
      return;
    }
    
    console.log('Subscribing to project tasks:', selectedProjectId);
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToProjectTasks(
      selectedOrgId,
      selectedProjectId,
      (projectTasks) => {
        console.log('📡 Real-time tasks update:', projectTasks.length, 'tasks');
        // Filter completed vs active tasks
        const active = projectTasks.filter(t => !t.done);
        const completed = projectTasks
          .filter(t => t.done)
          .map(t => {
            // Ensure completed tasks have required fields
            const now = Date.now();
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
            return {
              ...t,
              completedAt: (t as any).completedAt || now,
              expiresAt: (t as any).expiresAt || (now + thirtyDaysInMs)
            } as CompletedTask;
          });
        
        // Update taskManager's internal state
        taskManager.setTasks(active);
        taskManager.setCompletedTasks(completed);
        
        // Update React state
        setTasks(active);
        setCompletedTasks(completed);
      },
      (error) => {
        console.error('Failed to subscribe to project tasks', error);
        setTasks([]);
        setCompletedTasks([]);
      }
    );
    
    // Cleanup subscription on unmount or when deps change
    return () => unsubscribe();
  }, [selectedOrgId, selectedProjectId]);

  // Periodic check for overdue notifications (every minute)
  useEffect(() => {
    const checkOverdueInterval = setInterval(() => {
      const currentTasks = taskManager.getTasks();
      if (currentTasks.length > 0) {
        notificationService.checkAndCreateOverdueNotifications(currentTasks);
        notificationService.cleanupNotifications(currentTasks);
      }
    }, 60000);

    return () => clearInterval(checkOverdueInterval);
  }, [taskManager]);

  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSortMenu && !target.closest('.sort-controls-fixed')) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortMenu]);

  // ALL CONDITIONAL RETURNS MUST BE AFTER ALL HOOKS
  if (loading) {
    return <LoadingSpinner message="Initializing..." size="large" />;
  }
  
  if (!currentUser) {
    return <Login />;
  }

  if (profileLoading) {
    return <LoadingSpinner message="Loading profile..." size="large" />;
  }

  if (needsProfileSetup) {
    return <ProfileSetupPage onCompleted={refreshProfile} />;
  }
  
  if (!isEmailVerified) {
    return (
      <div className="login-container">
        <h2>Email Verification Required</h2>
        <p>Please verify your email address to continue. Check your inbox for the verification email.</p>
        <p>After verifying your email, please refresh this page or log out and log back in.</p>
        <button onClick={async () => {
          const { setSelectedOrgId } = useOrganizationStore.getState();
          setSelectedOrgId(null);
          const { setSelectedProjectId } = useProjectStore.getState();
          setSelectedProjectId(null);
          await logoutUser();
        }}>
          Logout
        </button>
      </div>
    );
  }
  
  if (validatingOrg) {
    return <LoadingSpinner message="Validating organization..." size="large" />;
  }
  
  if (!selectedOrgId) {
    return <SelectOrganizationPage />;
  }

  if (!selectedProjectId) {
    return <SelectProjectPage orgId={selectedOrgId} />;
  }

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

  // Update task (for Board view drag-and-drop)
  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    taskManager.editTask(taskId, {
      title: updates.title || '',
      deadline: updates.deadline || '',
      description: updates.description,
      status: updates.status,
      priority: updates.priority,
      assigneeId: updates.assigneeId,
    });
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
  const handleToggleTask = async (taskId: string) => {
    await taskManager.toggleTaskCompletion(taskId);
    // Note: Real-time listener will automatically update UI
    // No need to manually update state here
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
          <button 
            className="sort-btn"
            onClick={() => setShowSortMenu(!showSortMenu)}
            title="Sort tasks"
            style={{
              position: 'relative',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #4b5563',
              backgroundColor: '#1f2937',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>Sort</span>
            <span>{showSortMenu ? '▲' : '▼'}</span>
          </button>
          
          {showSortMenu && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '0.5rem',
                backgroundColor: '#1f2937',
                border: '1px solid #4b5563',
                borderRadius: '6px',
                minWidth: '150px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                zIndex: 1001,
              }}
            >
              <button
                onClick={() => {
                  handleSortChange('createdTime');
                  setShowSortMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  backgroundColor: sortOption === 'createdTime' ? '#374151' : 'transparent',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Time</span>
                {sortOption === 'createdTime' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </button>
              <button
                onClick={() => {
                  handleSortChange('deadline');
                  setShowSortMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  backgroundColor: sortOption === 'deadline' ? '#374151' : 'transparent',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Deadline</span>
                {sortOption === 'deadline' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </button>
              <button
                onClick={() => {
                  handleSortChange('priority');
                  setShowSortMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  backgroundColor: sortOption === 'priority' ? '#374151' : 'transparent',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Priority</span>
                {sortOption === 'priority' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Sidebar Overlay */}
      {appController.isSidebarOpen() && (
        <div className="sidebar-overlay" onClick={() => {
          appController.closeSidebar();
          setSidebarGroup('main'); // Reset to main menu when closing
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
              setSidebarGroup('main'); // Reset to main menu when closing
              setTasks([...tasks]);
            }}
          >
            ×
          </button>
        </div>
      <div className="sidebar-content">
        {/* Main Menu */}
        {sidebarGroup === 'main' && (
          <>
            <button 
              className="sidebar-item sidebar-group-btn"
              onClick={() => setSidebarGroup('views')}
            >
              <span className="sidebar-icon">📋</span>
              <span>Views</span>
              <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>›</span>
            </button>
            <button 
              className="sidebar-item sidebar-group-btn"
              onClick={() => setSidebarGroup('settings')}
            >
              <span className="sidebar-icon">⚙️</span>
              <span>Settings</span>
              <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>›</span>
            </button>
            <button 
              className="sidebar-item sidebar-group-btn"
              onClick={() => setSidebarGroup('actions')}
            >
              <span className="sidebar-icon">⚠️</span>
              <span>Leave / Delete</span>
              <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>›</span>
            </button>
          </>
        )}

        {/* Views Group */}
        {sidebarGroup === 'views' && (
          <>
            <button 
              className="sidebar-item sidebar-back-btn"
              onClick={() => setSidebarGroup('main')}
            >
              <span style={{ marginRight: '0.5rem' }}>←</span>
              <span style={{ fontWeight: 600 }}>Views</span>
            </button>
            <div style={{ borderTop: '1px solid #374151', margin: '0.5rem 0' }}></div>
            <button 
              className={`sidebar-item ${appController.getCurrentView() === 'active' ? 'active' : ''}`}
              onClick={() => { handleViewChange('active'); setSidebarGroup('main'); }}
            >
              <span className="sidebar-icon">📝</span>
              <span>List View</span>
              <span className="count">({tasks.length})</span>
            </button>
            <button 
              className={`sidebar-item ${appController.getCurrentView() === 'board' ? 'active' : ''}`}
              onClick={() => { handleViewChange('board'); setSidebarGroup('main'); }}
            >
              <span className="sidebar-icon">📋</span>
              <span>Board View</span>
              <span className="count">({tasks.length})</span>
            </button>
            <button 
              className={`sidebar-item ${appController.getCurrentView() === 'completed' ? 'active' : ''}`}
              onClick={() => { handleViewChange('completed'); setSidebarGroup('main'); }}
            >
              <span className="sidebar-icon">✅</span>
              <span>Completed Tasks</span>
              <span className="count">({completedTasks.length})</span>
            </button>
            <button 
              className={`sidebar-item ${appController.getCurrentView() === 'calendar' ? 'active' : ''}`}
              onClick={() => { handleViewChange('calendar'); setSidebarGroup('main'); }}
            >
              <span className="sidebar-icon">📅</span>
              <span>Calendar</span>
            </button>
            <button 
              className={`sidebar-item ${appController.getCurrentView() === 'analysis' ? 'active' : ''}`}
              onClick={() => { handleViewChange('analysis'); setSidebarGroup('main'); }}
            >
              <span className="sidebar-icon">📊</span>
              <span>Analysis</span>
            </button>
          </>
        )}

        {/* Settings Group */}
        {sidebarGroup === 'settings' && (
          <>
            <button 
              className="sidebar-item sidebar-back-btn"
              onClick={() => setSidebarGroup('main')}
            >
              <span style={{ marginRight: '0.5rem' }}>←</span>
              <span style={{ fontWeight: 600 }}>Settings</span>
            </button>
            <div style={{ borderTop: '1px solid #374151', margin: '0.5rem 0' }}></div>
            <button 
              className={`sidebar-item ${appController.getCurrentView() === 'project-settings' ? 'active' : ''}`}
              onClick={() => { handleViewChange('project-settings'); setSidebarGroup('main'); }}
            >
              <span className="sidebar-icon">🛠️</span>
              <span>Project Settings</span>
            </button>
            <button 
              className={`sidebar-item ${appController.getCurrentView() === 'org-settings' ? 'active' : ''}`}
              onClick={() => { handleViewChange('org-settings'); setSidebarGroup('main'); }}
            >
              <span className="sidebar-icon">🏢</span>
              <span>Org Settings</span>
            </button>
          </>
        )}

        {/* Actions Group (Leave/Delete) */}
        {sidebarGroup === 'actions' && (
          <>
            <button 
              className="sidebar-item sidebar-back-btn"
              onClick={() => setSidebarGroup('main')}
            >
              <span style={{ marginRight: '0.5rem' }}>←</span>
              <span style={{ fontWeight: 600 }}>Leave / Delete</span>
            </button>
            <div style={{ borderTop: '1px solid #374151', margin: '0.5rem 0' }}></div>
            <button 
              className="sidebar-item"
              onClick={async () => {
                if (!confirm('Are you sure you want to leave this project? You cannot rejoin without being added again.')) return;
                try {
                  await leaveProject(selectedOrgId, selectedProjectId);
                  setSelectedProjectId(null);
                  setSidebarGroup('main');
                } catch (err) {
                  alert((err as Error).message);
                }
              }}
            >
              <span className="sidebar-icon">👋</span>
              <span>Leave Project</span>
            </button>
            <button 
              className="sidebar-item"
              onClick={async () => {
                if (!confirm('Are you sure you want to leave this organization? You will also leave all projects and cannot rejoin without an invitation.')) return;
                try {
                  await leaveOrganization(selectedOrgId);
                  setSelectedOrgId(null);
                  setSelectedProjectId(null);
                  setSidebarGroup('main');
                } catch (err) {
                  alert((err as Error).message);
                }
              }}
            >
              <span className="sidebar-icon">🚶</span>
              <span>Leave Organization</span>
            </button>
            {/* Delete Project - only for project admin or org owner/admin */}
            {(currentProjectRole === 'admin' || currentRole === 'owner' || currentRole === 'admin') && (
              <button 
                className="sidebar-item"
                style={{ color: '#ef4444' }}
                onClick={async () => {
                  if (!confirm('⚠️ DELETE PROJECT: This will permanently delete ALL tasks, members, and data in this project. This action CANNOT be undone. Are you sure?')) return;
                  if (!confirm('This is your last chance. Type "delete" in the next prompt to confirm.')) return;
                  const confirmText = prompt('Type "delete" to confirm permanent deletion:');
                  if (confirmText?.toLowerCase() !== 'delete') {
                    alert('Deletion cancelled.');
                    return;
                  }
                  try {
                    await deleteProject(selectedOrgId, selectedProjectId);
                    setSelectedProjectId(null);
                    setSidebarGroup('main');
                    alert('Project deleted successfully.');
                  } catch (err) {
                    alert((err as Error).message);
                  }
                }}
              >
                <span className="sidebar-icon">🗑️</span>
                <span>Delete Project</span>
              </button>
            )}
            {/* Delete Organization - only for org owner */}
            {currentRole === 'owner' && (
              <button 
                className="sidebar-item"
                style={{ color: '#dc2626' }}
                onClick={async () => {
                  if (!confirm('⚠️ DELETE ORGANIZATION: This will permanently delete ALL projects, tasks, members, and data. This action CANNOT be undone. Are you sure?')) return;
                  if (!confirm('This is your last chance. Type "delete" in the next prompt to confirm.')) return;
                  const confirmText = prompt('Type "delete" to confirm permanent deletion:');
                  if (confirmText?.toLowerCase() !== 'delete') {
                    alert('Deletion cancelled.');
                    return;
                  }
                  try {
                    await deleteOrganization(selectedOrgId);
                    setSelectedOrgId(null);
                    setSelectedProjectId(null);
                    setSidebarGroup('main');
                    alert('Organization deleted successfully.');
                  } catch (err) {
                    alert((err as Error).message);
                  }
                }}
              >
                <span className="sidebar-icon">💀</span>
                <span>Delete Organization</span>
              </button>
            )}
          </>
        )}
        </div>
      </div>

      <div className="app-header">
        {(appController.getCurrentView() === 'active' || appController.getCurrentView() === 'board') && 
         // Only show Add Task if user can create tasks (project admin or org owner/admin)
         (currentProjectRole === 'admin' || currentRole === 'owner' || currentRole === 'admin') && (
          <button 
            onClick={() => {
              appController.showForm();
              setIsFormVisible(true);
              setTasks([...tasks]);
            }}
            className="add-task-btn"
            style={{ width: 'auto', flexShrink: 0 }}
          >
            Add New Task
          </button>
        )}
      </div>

      <div className="tasks-container" key={appController.getCurrentView()}>
        {appController.getCurrentView() === 'active' ? (
          // Active Tasks List View
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
        ) : appController.getCurrentView() === 'board' ? (
          // Board View (Kanban-style)
          <BoardView
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
            onEditTask={(task) => {
              appController.setEditingTask(task);
              setIsFormVisible(true);
              setTasks([...tasks]);
            }}
            onDeleteTask={(taskId) => {
              handleDeleteTask(taskId);
              setTasks([...taskManager.getTasks()]);
              setCompletedTasks([...taskManager.getCompletedTasks()]);
            }}
            onToggleTask={handleToggleTask}
            onEditSubtask={(subtask) => {
              appController.setEditingSubtask(subtask);
              setIsFormVisible(true);
              setTasks([...tasks]);
            }}
            onUpdateSubtask={handleUpdateSubtask}
            onDeleteSubtask={(taskId, subtaskId) => {
              handleDeleteSubtask(taskId, subtaskId);
              setTasks([...taskManager.getTasks()]);
              setCompletedTasks([...taskManager.getCompletedTasks()]);
            }}
          />
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
        ) : appController.getCurrentView() === 'org-settings' ? (
          <MembersManagementPage
            orgId={selectedOrgId}
            currentRole={currentRole}
            members={members}
            onRefresh={refreshMembers}
          />
        ) : appController.getCurrentView() === 'project-settings' ? (
          <ProjectMembersPage
            orgId={selectedOrgId}
            projectId={selectedProjectId}
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

      <AccountMenu />
    </div>
  );
}

export default App;