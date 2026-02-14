import React, { useMemo, useState } from 'react';
import './TaskItem.css';
import './Checkbox.css';
import type { Task, Subtask } from './types';
import { SubtaskItem } from './SubtaskItem';
import { DateUtils } from './utils/dateUtils';
import { useProjectStore } from './store/projectStore';
import { useOrganizationStore } from './store/organizationStore';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const projectMembers = useProjectStore((state) => state.projectMembers);
  const currentProjectRole = useProjectStore((state) => state.currentProjectRole);
  const currentOrgRole = useOrganizationStore((state) => state.currentRole);
  const assignee = task.assigneeId ? projectMembers.find((member) => member.userId === task.assigneeId) : null;
  const status = task.status || 'todo';
  const priority = task.priority || 'medium';

  // Check if user can edit/delete (admin/owner) or only toggle status (contributor)
  const canEditOrDelete = useMemo(() => {
    if (currentOrgRole === 'owner' || currentOrgRole === 'admin') return true;
    if (currentProjectRole === 'admin') return true;
    return false;
  }, [currentOrgRole, currentProjectRole]);

  // Check if user can mark task as completed (only admin/owner can do this)
  // Contributors can only change status (todo, inProgress) but NOT mark as done
  const canToggleCompletion = useMemo(() => {
    if (currentOrgRole === 'owner' || currentOrgRole === 'admin') return true;
    if (currentProjectRole === 'admin') return true;
    return false;
  }, [currentOrgRole, currentProjectRole]);

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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(task.id);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className={`task-item ${task.done ? 'completed' : ''} ${isCompleted ? 'completed-view' : ''} ${deadlineClass}`}>
      {/* Red X delete button - appears on hover at top right corner */}
      {canEditOrDelete && (
        <button
          className="task-delete-x"
          onClick={handleDeleteClick}
          title="Delete task"
          aria-label="Delete task"
        >
          ×
        </button>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={handleCancelDelete}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p>Do you want to delete this task?</p>
            <div className="delete-confirm-actions">
              <button className="confirm-delete-btn" onClick={handleConfirmDelete}>
                Yes, Delete
              </button>
              <button className="cancel-delete-btn" onClick={handleCancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top row: checkbox only */}
      <div className="task-header">
        <label 
          className={`checkbox-container ${!canToggleCompletion && !isCompleted ? 'disabled' : ''}`} 
          onClick={(e) => e.stopPropagation()}
          title={!canToggleCompletion && !isCompleted ? 'Only admins can mark tasks as completed' : undefined}
        >
          <input
            type="checkbox"
            checked={task.done}
            onChange={handleTaskToggle}
            disabled={isCompleted || !canToggleCompletion}
          />
          <span className="checkmark"></span>
        </label>
      </div>
      
      {/* Second row: task title spanning full width */}
      <div 
        className={`task-title-row ${!canEditOrDelete && !isCompleted ? 'no-edit' : ''}`}
        onClick={isCompleted ? undefined : () => onEdit(task)} 
        style={{ cursor: isCompleted ? 'default' : 'pointer' }}
        title={!canEditOrDelete && !isCompleted ? 'Contributors can only change status via the form' : undefined}
      >
        <h3 className={task.done ? 'strikethrough' : ''}>{task.title}</h3>
        <div className="task-meta">
          <span className={`status-pill status-${status}`}>{status === 'inProgress' ? 'In Progress' : status === 'todo' ? 'To Do' : 'Done'}</span>
          <span className={`priority-pill priority-${priority}`}>{priority}</span>
          {assignee && (
            <span className="assignee-pill">
              {assignee.displayName || assignee.email || 'User'}
            </span>
          )}
        </div>
      </div>
      
      {/* Third row: task details */}
      <div className="task-details">
        <p className={`deadline ${deadlineClass}`}>Due: {formatDeadline(task.deadline)}</p>
        {isCompleted && completedAt && (
          <p className="completed-date">Completed: {formatCompletedDate(completedAt)}</p>
        )}
        {totalSubtasks > 0 && (
          <div className="subtask-progress-row">
            <p className="subtask-progress">
              Subtasks: {completedSubtasks}/{totalSubtasks} completed
            </p>
            {!isCompleted && (
              <button 
                onClick={() => setShowSubtasks(!showSubtasks)}
                className="toggle-subtasks-btn"
                aria-label={showSubtasks ? 'Hide subtasks' : 'Show subtasks'}
              >
                {showSubtasks ? '▲' : '▼'}
              </button>
            )}
          </div>
        )}
        {task.description && (
          <p className="task-description">{task.description}</p>
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