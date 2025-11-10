import React from 'react';
import type { CalendarItem, Task } from '../types';

interface TaskModalProps {
  selectedItem: {
    item: CalendarItem;
    task: Task;
    subtask?: any;
  };
  onClose: () => void;
  onAction: (action: 'edit' | 'delete' | 'toggle') => void;
}

export function TaskModal({ selectedItem, onClose, onAction }: TaskModalProps) {
  const { item, task, subtask } = selectedItem;
  const isSubtask = !!subtask;
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const deadline = formatDateTime(item.deadline);
  const completedSubtasks = task.subtasks.filter(st => st.done).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="task-modal">
        <div className="modal-header">
          <div className="modal-title-section">
            <div 
              className="task-color-indicator"
              style={{ backgroundColor: item.color }}
            />
            <h3 className="modal-title">
              {isSubtask ? 'Subtask Details' : 'Task Details'}
            </h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="task-info">
            <div className="info-row">
              <label>Title:</label>
              <span className={`task-title ${item.done ? 'completed' : ''}`}>
                {item.title}
              </span>
            </div>

            {isSubtask && (
              <div className="info-row">
                <label>Parent Task:</label>
                <span className="parent-task-name">
                  {item.parentTaskTitle}
                </span>
              </div>
            )}

            <div className="info-row">
              <label>Deadline:</label>
              <div className="deadline-info">
                <div className="deadline-date">{deadline.date}</div>
                <div className="deadline-time">{deadline.time}</div>
              </div>
            </div>

            <div className="info-row">
              <label>Status:</label>
              <span className={`status-badge ${item.done ? 'completed' : 'pending'}`}>
                {item.done ? '✅ Completed' : '⏳ Pending'}
              </span>
            </div>

            {!isSubtask && totalSubtasks > 0 && (
              <div className="info-row">
                <label>Subtasks:</label>
                <div className="subtasks-info">
                  <div className="subtasks-progress">
                    {completedSubtasks} of {totalSubtasks} completed
                  </div>
                  <div className="subtasks-list">
                    {task.subtasks.map(st => (
                      <div key={st.id} className={`subtask-item ${st.done ? 'completed' : ''}`}>
                        <span className="subtask-status">
                          {st.done ? '✅' : '⏳'}
                        </span>
                        <span className="subtask-title">{st.title}</span>
                        <span className="subtask-deadline">
                          {new Date(st.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="action-btn toggle-btn"
            onClick={() => onAction('toggle')}
          >
            {item.done ? 'Mark as Pending' : 'Mark as Complete'}
          </button>
          
          <button 
            className="action-btn edit-btn"
            onClick={() => onAction('edit')}
          >
            Edit
          </button>
          
          <button 
            className="action-btn delete-btn"
            onClick={() => onAction('delete')}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskModal;