import React, { useEffect, useMemo, useState } from 'react';
import './TaskForm.css';
import './Checkbox.css';
import type { Task, Subtask, TaskFormData, TaskPriority, TaskStatus } from './types';
import { aiService } from './services/aiService';
import { useProjectStore } from './store/projectStore';
import { useOrganizationStore } from './store/organizationStore';

interface TaskFormProps {
  task?: Task;
  onSubmit: (task: TaskFormData) => void | Promise<void>;
  onCancel: () => void;
  isSubtask?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({ 
  task, 
  onSubmit, 
  onCancel, 
  isSubtask = false 
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || '',
    deadline: task?.deadline || '',
    subtasks: task?.subtasks || [],
    description: task?.description || '',
    assigneeId: task?.assigneeId,
    status: task?.status || 'todo',
    priority: task?.priority || 'medium'
  });

  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState({ title: '', deadline: '' });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<{title?: string, deadline?: string}>({});
  const projectMembers = useProjectStore((state) => state.projectMembers);
  const currentProjectRole = useProjectStore((state) => state.currentProjectRole);
  const currentOrgRole = useOrganizationStore((state) => state.currentRole);
  const memberOptions = useMemo(() => projectMembers ?? [], [projectMembers]);
  
  // Determine if user can edit all fields (admin, org owner/admin) or only status (contributor)
  const canEditAllFields = useMemo(() => {
    // Org owners and admins can edit everything
    if (currentOrgRole === 'owner' || currentOrgRole === 'admin') return true;
    // Project admins can edit everything
    if (currentProjectRole === 'admin') return true;
    // Contributors can only edit status
    return false;
  }, [currentOrgRole, currentProjectRole]);
  
  // For new tasks, everyone with access can create with all fields
  const isEditing = !!task;

  useEffect(() => {
    setFormData({
      title: task?.title || '',
      deadline: task?.deadline || '',
      subtasks: task?.subtasks || [],
      description: task?.description || '',
      assigneeId: task?.assigneeId,
      status: task?.status || 'todo',
      priority: task?.priority || 'medium'
    });
    setSubtasks(task?.subtasks || []);
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('TaskForm handleSubmit called with formData:', formData);
    
    // Validate form data
    const errors: {title?: string, deadline?: string} = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!formData.deadline) {
      errors.deadline = 'Deadline is required';
    }
    
    if (Object.keys(errors).length > 0) {
      console.log('Form validation failed with errors:', errors);
      setFormErrors(errors);
      return;
    }
    
    console.log('Form validation passed, submitting task');
    // Clear errors if validation passes
    setFormErrors({});
    setSubmissionError(null);
    
    try {
      // Call onSubmit synchronously (no await, no timeout)
      console.log('Calling onSubmit handler');
      onSubmit({
        ...formData,
        subtasks: isSubtask ? undefined : subtasks
      });
      
      // If onSubmit returns a promise, ignore it - it will complete in the background
      console.log('Form submission called successfully');
    } catch (error) {
      console.error('Form submission failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit form';
      console.error('Error message:', errorMessage);
      setSubmissionError(errorMessage);
      return;
    }
  };

  const addSubtask = () => {
    if (newSubtask.title.trim() && newSubtask.deadline) {
      const subtask: Subtask = {
        id: Date.now(),
        title: newSubtask.title,
        deadline: newSubtask.deadline,
        done: false
      };
      const updatedSubtasks = [...subtasks, subtask];
      setSubtasks(updatedSubtasks);
      setFormData({ ...formData, subtasks: updatedSubtasks });
      setNewSubtask({ title: '', deadline: '' });
    }
  };

  const removeSubtask = (id: number) => {
    const updatedSubtasks = subtasks.filter(st => st.id !== id);
    setSubtasks(updatedSubtasks);
    setFormData({ ...formData, subtasks: updatedSubtasks });
  };

  const generateAISubtasks = async () => {
    if (!formData.title.trim() || !formData.deadline) {
      setAiError('Please enter task title and deadline first');
      return;
    }

    setIsGeneratingAI(true);
    setAiError(null);

    try {
      const generatedSubtasks = await aiService.generateSubtasks({
        taskName: formData.title,
        taskDeadline: formData.deadline
      });

      // Add generated subtasks to existing ones
      const updatedSubtasks = [...subtasks, ...generatedSubtasks];
      setSubtasks(updatedSubtasks);
      setFormData({ ...formData, subtasks: updatedSubtasks });
    } catch (error) {
      console.error('AI Generation Error:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to generate subtasks');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const startEditingSubtask = (subtaskId: number) => {
    setEditingSubtaskId(subtaskId);
  };

  const saveSubtaskEdit = (subtaskId: number, newTitle: string, newDeadline: string) => {
    if (newTitle.trim() && newDeadline) {
      const updatedSubtasks = subtasks.map(subtask => 
        subtask.id === subtaskId 
          ? { ...subtask, title: newTitle.trim(), deadline: newDeadline }
          : subtask
      );
      setSubtasks(updatedSubtasks);
      setFormData({ ...formData, subtasks: updatedSubtasks });
    }
    setEditingSubtaskId(null);
  };

  const cancelSubtaskEdit = () => {
    setEditingSubtaskId(null);
  };

  // Check if form has unsaved changes
  const hasUnsavedChanges = () => {
    if (!task) {
      // New task - check if any field has been filled
      return formData.title.trim() !== '' || 
             formData.deadline !== '' || 
             formData.description !== '' ||
             subtasks.length > 0;
    }
    // Editing - check if anything changed
    return formData.title !== (task.title || '') ||
           formData.deadline !== (task.deadline || '') ||
           formData.description !== (task.description || '') ||
           formData.status !== (task.status || 'todo') ||
           formData.priority !== (task.priority || 'medium');
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (hasUnsavedChanges()) {
        const shouldContinue = window.confirm('Do you want to continue creating this task?');
        if (shouldContinue) {
          return; // Stay on form
        }
      }
      onCancel();
    }
  };

  return (
    <div className="task-form-overlay" onClick={handleOverlayClick}>
      <div className="task-form">
        <h2>{task ? 'Edit Task' : isSubtask ? 'Add Subtask' : 'Add New Task'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title:</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                // Clear error when user starts typing
                if (formErrors.title) {
                  setFormErrors({ ...formErrors, title: undefined });
                }
              }}
              required
              placeholder="Enter task title"
              className={formErrors.title ? 'error' : ''}
              disabled={isEditing && !canEditAllFields}
              style={isEditing && !canEditAllFields ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            />
            {formErrors.title && <div className="error-message">{formErrors.title}</div>}
            {isEditing && !canEditAllFields && (
              <div className="field-note">Only admins can edit title</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="deadline">Deadline:</label>
            <input
              type="datetime-local"
              id="deadline"
              value={formData.deadline}
              onChange={(e) => {
                setFormData({ ...formData, deadline: e.target.value });
                // Clear error when user selects a date
                if (formErrors.deadline) {
                  setFormErrors({ ...formErrors, deadline: undefined });
                }
              }}
              required
              className={formErrors.deadline ? 'error' : ''}
              disabled={isEditing && !canEditAllFields}
              style={isEditing && !canEditAllFields ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            />
            {formErrors.deadline && <div className="error-message">{formErrors.deadline}</div>}
            {isEditing && !canEditAllFields && (
              <div className="field-note">Only admins can edit deadline</div>
            )}
          </div>

          {!isSubtask && (
            <>
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status ?? 'todo'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                >
                  <option value="todo">To Do</option>
                  <option value="inProgress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group flex">
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    value={formData.priority ?? 'medium'}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value as TaskPriority })
                    }
                    disabled={isEditing && !canEditAllFields}
                    style={isEditing && !canEditAllFields ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  {isEditing && !canEditAllFields && (
                    <div className="field-note">Only admins can edit</div>
                  )}
                </div>
                <div className="form-group flex">
                  <label htmlFor="assignee">Assignee</label>
                  <select
                    id="assignee"
                    value={formData.assigneeId ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, assigneeId: e.target.value || undefined })
                    }
                    disabled={isEditing && !canEditAllFields}
                    style={isEditing && !canEditAllFields ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                  >
                    <option value="">Unassigned</option>
                    {memberOptions.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.displayName || member.email || member.userId}
                      </option>
                    ))}
                  </select>
                  {isEditing && !canEditAllFields && (
                    <div className="field-note">Only admins can edit</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add details, acceptance criteria..."
                  disabled={isEditing && !canEditAllFields}
                  style={isEditing && !canEditAllFields ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                />
                {isEditing && !canEditAllFields && (
                  <div className="field-note">Only admins can edit description</div>
                )}
              </div>
            </>
          )}

          {!isSubtask && (
            <div className="subtasks-section">
              <h3>Subtasks</h3>
              {isEditing && !canEditAllFields && (
                <div className="field-note" style={{ marginBottom: '0.5rem' }}>Only admins can manage subtasks</div>
              )}
              
              {subtasks.map((subtask) => (
                <div key={subtask.id} className="subtask-item">
                  {editingSubtaskId === subtask.id && canEditAllFields ? (
                    <SubtaskEditForm 
                      subtask={subtask}
                      onSave={saveSubtaskEdit}
                      onCancel={cancelSubtaskEdit}
                    />
                  ) : (
                    <SubtaskDisplay 
                      subtask={subtask}
                      onEdit={canEditAllFields || !isEditing ? startEditingSubtask : () => {}}
                      onRemove={canEditAllFields || !isEditing ? removeSubtask : () => {}}
                      disabled={isEditing && !canEditAllFields}
                    />
                  )}
                </div>
              ))}

              {(canEditAllFields || !isEditing) && (
                <div className="add-subtask">
                  <input
                    type="text"
                    value={newSubtask.title}
                    onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                    placeholder="Subtask title"
                  />
                  <input
                    type="datetime-local"
                    value={newSubtask.deadline}
                    onChange={(e) => setNewSubtask({ ...newSubtask, deadline: e.target.value })}
                  />
                  <button type="button" onClick={addSubtask} className="add-btn">
                    Add Subtask
                  </button>
                  <button 
                    type="button" 
                    onClick={generateAISubtasks} 
                    className="ai-generate-btn"
                    disabled={isGeneratingAI || !formData.title.trim() || !formData.deadline}
                    title="Generate subtasks using AI"
                  >
                    {isGeneratingAI ? '🤖 Generating...' : '🤖 AI Generate'}
                  </button>
                </div>
              )}
              
              {aiError && (
                <div className="ai-error">
                  <span className="error-icon">⚠️</span>
                  {aiError}
                </div>
              )}
            </div>
          )}

          {submissionError && (
            <div className="ai-error" style={{ marginTop: '15px' }}>
              <span className="error-icon">❌</span>
              {submissionError}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="submit-btn">
              {task ? 'Update' : 'Add'} {isSubtask ? 'Subtask' : 'Task'}
            </button>
            <button type="button" onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper component for displaying subtask
interface SubtaskDisplayProps {
  subtask: Subtask;
  onEdit: (id: number) => void;
  onRemove: (id: number) => void;
  disabled?: boolean;
}

function SubtaskDisplay({ subtask, onEdit, onRemove, disabled = false }: SubtaskDisplayProps) {
  return (
    <>
      <span 
        className={`subtask-content ${disabled ? '' : 'clickable'}`}
        onClick={disabled ? undefined : () => onEdit(subtask.id)}
        title={disabled ? 'View only' : 'Click to edit'}
        style={disabled ? { opacity: 0.8 } : {}}
      >
        {subtask.title} - {new Date(subtask.deadline).toLocaleString()}
      </span>
      {!disabled && (
        <div className="subtask-actions">
          <button 
            type="button" 
            onClick={() => onEdit(subtask.id)}
            className="edit-subtask-btn"
            title="Edit subtask"
          >
            ✏️
          </button>
          <button 
            type="button" 
            onClick={() => onRemove(subtask.id)}
            className="remove-btn"
          >
            Remove
          </button>
        </div>
      )}
    </>
  );
}

// Helper component for editing subtask
interface SubtaskEditFormProps {
  subtask: Subtask;
  onSave: (id: number, title: string, deadline: string) => void;
  onCancel: () => void;
}

function SubtaskEditForm({ subtask, onSave, onCancel }: SubtaskEditFormProps) {
  const [title, setTitle] = useState(subtask.title);
  const [deadline, setDeadline] = useState(subtask.deadline);

  const handleSave = () => {
    onSave(subtask.id, title, deadline);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="subtask-edit-form">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Subtask title"
        className="edit-title-input"
        autoFocus
      />
      <input
        type="datetime-local"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        onKeyDown={handleKeyPress}
        className="edit-deadline-input"
      />
      <div className="edit-actions">
        <button 
          type="button" 
          onClick={handleSave}
          className="save-edit-btn"
          disabled={!title.trim() || !deadline}
        >
          ✓
        </button>
        <button 
          type="button" 
          onClick={onCancel}
          className="cancel-edit-btn"
        >
          ✕
        </button>
      </div>
    </div>
  );
}