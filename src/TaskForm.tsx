import React, { useState } from 'react';
import type { Task, Subtask, TaskFormData } from './types';
import { aiService } from './services/aiService';

interface TaskFormProps {
  task?: Task;
  onSubmit: (task: TaskFormData) => void;
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
    subtasks: task?.subtasks || []
  });

  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState({ title: '', deadline: '' });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() && formData.deadline) {
      onSubmit({
        ...formData,
        subtasks: isSubtask ? undefined : subtasks
      });
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
      setSubtasks([...subtasks, subtask]);
      setNewSubtask({ title: '', deadline: '' });
    }
  };

  const removeSubtask = (id: number) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
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
      setSubtasks(prev => [...prev, ...generatedSubtasks]);
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
      setSubtasks(prev => prev.map(subtask => 
        subtask.id === subtaskId 
          ? { ...subtask, title: newTitle.trim(), deadline: newDeadline }
          : subtask
      ));
    }
    setEditingSubtaskId(null);
  };

  const cancelSubtaskEdit = () => {
    setEditingSubtaskId(null);
  };

  return (
    <div className="task-form-overlay">
      <div className="task-form">
        <h2>{task ? 'Edit Task' : isSubtask ? 'Add Subtask' : 'Add New Task'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title:</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Enter task title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="deadline">Deadline:</label>
            <input
              type="datetime-local"
              id="deadline"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
            />
          </div>

          {!isSubtask && (
            <div className="subtasks-section">
              <h3>Subtasks</h3>
              
              {subtasks.map((subtask) => (
                <div key={subtask.id} className="subtask-item">
                  {editingSubtaskId === subtask.id ? (
                    <SubtaskEditForm 
                      subtask={subtask}
                      onSave={saveSubtaskEdit}
                      onCancel={cancelSubtaskEdit}
                    />
                  ) : (
                    <SubtaskDisplay 
                      subtask={subtask}
                      onEdit={startEditingSubtask}
                      onRemove={removeSubtask}
                    />
                  )}
                </div>
              ))}

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
              
              {aiError && (
                <div className="ai-error">
                  <span className="error-icon">⚠️</span>
                  {aiError}
                </div>
              )}
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
}

function SubtaskDisplay({ subtask, onEdit, onRemove }: SubtaskDisplayProps) {
  return (
    <>
      <span 
        className="subtask-content clickable"
        onClick={() => onEdit(subtask.id)}
        title="Click to edit"
      >
        {subtask.title} - {new Date(subtask.deadline).toLocaleString()}
      </span>
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