import React, { useState } from 'react';
import type { Task } from '../types';
import { TaskItem } from '../TaskItem';
import './BoardView.css';

interface BoardViewProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  onEditSubtask: (subtask: any) => void;
  onUpdateSubtask: (taskId: string, subtaskId: number, updates: any) => void;
  onDeleteSubtask: (taskId: string, subtaskId: number) => void;
}

import type { TaskStatus } from '../types';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: '#6366f1' },
  { id: 'inProgress', title: 'In Progress', color: '#f59e0b' },
  { id: 'done', title: 'Done', color: '#10b981' },
];

export const BoardView: React.FC<BoardViewProps> = ({
  tasks,
  onUpdateTask,
  onEditTask,
  onDeleteTask,
  onToggleTask,
  onEditSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: TaskStatus) => {
    if (draggedTask && draggedTask.status !== status) {
      onUpdateTask(draggedTask.id, { status });
    }
    setDraggedTask(null);
  };

  return (
    <div className="board-view">
      <div className="board-columns">
        {COLUMNS.map(column => (
          <div
            key={column.id}
            className="board-column"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <div className="column-header" style={{ borderTopColor: column.color }}>
              <h3>{column.title}</h3>
              <span className="task-count">{getTasksByStatus(column.id).length}</span>
            </div>
            <div className="column-tasks">
              {getTasksByStatus(column.id).map(task => (
                <div
                  key={task.id}
                  className="board-task-wrapper"
                  draggable
                  onDragStart={() => handleDragStart(task)}
                >
                  <TaskItem
                    task={task}
                    onToggleDone={onToggleTask}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onUpdateSubtask={onUpdateSubtask}
                    onDeleteSubtask={onDeleteSubtask}
                    onEditSubtask={onEditSubtask}
                  />
                </div>
              ))}
              {getTasksByStatus(column.id).length === 0 && (
                <div className="empty-column">
                  <p>No tasks</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

