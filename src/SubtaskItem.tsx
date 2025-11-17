import React from 'react';
import './TaskItem.css';
import './Checkbox.css';
import type { Subtask } from './types';
import { DateUtils } from './utils/dateUtils';

interface SubtaskItemProps {
  subtask: Subtask;
  onToggleDone: (id: number) => void;
  onEdit: (subtask: Subtask) => void;
  onDelete: (id: number) => void;
}

export const SubtaskItem: React.FC<SubtaskItemProps> = ({
  subtask,
  onToggleDone,
  onEdit,
  onDelete
}) => {
  const deadlineClass = DateUtils.getDeadlineClass(subtask.deadline);

  return (
    <div className={`subtask-item ${subtask.done ? 'completed' : ''} ${deadlineClass}`}>
      <div className="subtask-content" onClick={() => onEdit(subtask)} style={{ cursor: 'pointer', flex: 1 }}>
        <label className="checkbox-container" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={subtask.done}
            onChange={() => onToggleDone(subtask.id)}
          />
          <span className="checkmark"></span>
        </label>
        
        <div className="subtask-details">
          <h4 className={subtask.done ? 'strikethrough' : ''}>{subtask.title}</h4>
          <p className={`deadline ${deadlineClass}`}>Due: {DateUtils.formatDeadline(subtask.deadline)}</p>
        </div>
      </div>
      
      <div className="subtask-actions">
        <button 
          onClick={() => onDelete(subtask.id)}
          className="delete-btn"
        >
          Delete
        </button>
      </div>
    </div>
  );
};