import React, { useState } from 'react';
import './TaskItem.css';
import './Checkbox.css';
import type { Task, Subtask } from './types';
import { SubtaskItem } from './SubtaskItem';
import { DateUtils } from './utils/dateUtils';

interface TaskItemProps {
  task: Task;
  onToggleDone: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdateSubtask: (taskId: string, subtaskId: number, updates: any) => void;
  onDeleteSubtask: (taskId: string, subtaskId: number) => void;
  onEditSubtask: (subtask: Subtask) => void;
  isCompleted?: boolean;
  completedAt?: number;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleDone,
  onEdit,
  onDelete,
  onUpdateSubtask,
  onDeleteSubtask,
  onEditSubtask,
  isCompleted = false,
  completedAt
}) => {
  const [showSubtasks, setShowSubtasks] = useState(false);

  const formatDeadline = (deadline: string) => {
    return DateUtils.formatDeadline(deadline);
  };

  const formatCompletedDate = (timestamp: number) => {
    return DateUtils.formatCompletedDate(timestamp);
  };

  const deadlineClass = DateUtils.getDeadlineClass(task.deadline);

  const handleTaskToggle = () => {
    onToggleDone(task.id);
  };

  const handleSubtaskToggle = (subtaskId: number) => {
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (subtask) {
      onUpdateSubtask(task.id, subtaskId, { done: !subtask.done });
    }
  };

  const completedSubtasks = task.subtasks.filter(st => st.done).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <div className={`task-item ${task.done ? 'completed' : ''} ${isCompleted ? 'completed-view' : ''} ${deadlineClass}`}>
      {/* Top row: checkbox and delete button */}
      <div className="task-header">
        <label className="checkbox-container" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={task.done}
            onChange={handleTaskToggle}
            disabled={isCompleted}
          />
          <span className="checkmark"></span>
        </label>
        
        <div className="task-actions">
          {!isCompleted && task.subtasks.length > 0 && (
            <button 
              onClick={() => setShowSubtasks(!showSubtasks)}
              className="toggle-subtasks-btn"
              aria-label={showSubtasks ? 'Hide subtasks' : 'Show subtasks'}
            >
              {showSubtasks ? '▲' : '▼'}
            </button>
          )}
          
          <button 
            onClick={() => onDelete(task.id)}
            className="delete-btn"
          >
            Delete
          </button>
        </div>
      </div>
      
      {/* Second row: task title spanning full width */}
      <div className="task-title-row" onClick={isCompleted ? undefined : () => onEdit(task)} style={{ cursor: isCompleted ? 'default' : 'pointer' }}>
        <h3 className={task.done ? 'strikethrough' : ''}>{task.title}</h3>
      </div>
      
      {/* Third row: task details */}
      <div className="task-details">
        <p className={`deadline ${deadlineClass}`}>Due: {formatDeadline(task.deadline)}</p>
        {isCompleted && completedAt && (
          <p className="completed-date">Completed: {formatCompletedDate(completedAt)}</p>
        )}
        {totalSubtasks > 0 && (
          <p className="subtask-progress">
            Subtasks: {completedSubtasks}/{totalSubtasks} completed
          </p>
        )}
      </div>

      {!isCompleted && showSubtasks && task.subtasks.length > 0 && (
        <div className="subtasks-container">
          <h4>Subtasks:</h4>
          {task.subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onToggleDone={handleSubtaskToggle}
              onEdit={onEditSubtask}
              onDelete={(subtaskId) => onDeleteSubtask(task.id, subtaskId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};