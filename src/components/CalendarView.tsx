import { useState, useMemo } from 'react';
import type { Task, CalendarItem, CalendarMode, CalendarState } from '../types';
import { CalendarControls } from './CalendarControls';
import { CalendarGrid } from './CalendarGrid';
import { TaskModal } from './TaskModal';
import { 
  tasksToCalendarItems, 
  groupItemsByDate,
  generateMonthCalendar,
  generateWeekCalendar 
} from '../utils/calendarUtils';
import './Calendar.css';

interface CalendarViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  onEditSubtask: (subtask: { task: Task; subtask: any }) => void;
  onUpdateSubtask: (taskId: string, subtaskId: number, updates: Partial<any>) => void;
  onDeleteSubtask: (taskId: string, subtaskId: number) => void;
}

export function CalendarView({ 
  tasks, 
  onEditTask, 
  onDeleteTask, 
  onToggleTask,
  onEditSubtask,
  onUpdateSubtask,
  onDeleteSubtask
}: CalendarViewProps) {
  const [calendarState, setCalendarState] = useState<CalendarState>({
    mode: 'monthly',
    currentDate: new Date()
  });
  
  const [selectedItem, setSelectedItem] = useState<{
    item: CalendarItem;
    task: Task;
    subtask?: any;
  } | null>(null);

  // Convert tasks to calendar items and group by date
  const calendarItems = useMemo(() => tasksToCalendarItems(tasks), [tasks]);
  const itemsByDate = useMemo(() => groupItemsByDate(calendarItems), [calendarItems]);

  // Generate calendar data based on current mode
  const calendarData = useMemo(() => {
    const { mode, currentDate } = calendarState;
    
    if (mode === 'weekly') {
      return {
        type: 'week' as const,
        data: generateWeekCalendar(currentDate, itemsByDate)
      };
    } else {
      return {
        type: 'month' as const,
        data: generateMonthCalendar(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          itemsByDate
        )
      };
    }
  }, [calendarState, itemsByDate]);

  const handleModeChange = (mode: CalendarMode) => {
    setCalendarState(prev => ({ ...prev, mode }));
  };

  const handleDateNavigation = (direction: 'prev' | 'next' | 'today') => {
    setCalendarState(prev => {
      const { mode, currentDate } = prev;
      let newDate: Date;
      
      switch (direction) {
        case 'prev':
          newDate = new Date(currentDate);
          if (mode === 'weekly') {
            newDate.setDate(newDate.getDate() - 7);
          } else {
            newDate.setMonth(newDate.getMonth() - 1);
          }
          break;
        case 'next':
          newDate = new Date(currentDate);
          if (mode === 'weekly') {
            newDate.setDate(newDate.getDate() + 7);
          } else {
            newDate.setMonth(newDate.getMonth() + 1);
          }
          break;
        case 'today':
          newDate = new Date();
          break;
        default:
          newDate = currentDate;
      }
      
      return { ...prev, currentDate: newDate };
    });
  };

  const handleItemClick = (item: CalendarItem) => {
    // Find the corresponding task and subtask
    const task = tasks.find(t => t.id === (item.parentTaskId || item.id));
    if (!task) return;

    if (item.type === 'subtask') {
      const subtask = task.subtasks.find(st => `${task.id}-${st.id}` === item.id);
      if (subtask) {
        setSelectedItem({ item, task, subtask });
      }
    } else {
      setSelectedItem({ item, task });
    }
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  const handleTaskAction = (action: 'edit' | 'delete' | 'toggle') => {
    if (!selectedItem) return;

    const { task, subtask } = selectedItem;

    switch (action) {
      case 'edit':
        if (subtask) {
          onEditSubtask({ task, subtask });
        } else {
          onEditTask(task);
        }
        break;
      case 'delete':
        if (subtask) {
          onDeleteSubtask(task.id, subtask.id);
        } else {
          onDeleteTask(task.id);
        }
        break;
      case 'toggle':
        if (subtask) {
          onUpdateSubtask(task.id, subtask.id, { done: !subtask.done });
        } else {
          onToggleTask(task.id);
        }
        break;
    }
    
    handleCloseModal();
  };

  return (
    <div className="calendar-view">
      <div className="calendar-header-container">
        <CalendarControls
          mode={calendarState.mode}
          currentDate={calendarState.currentDate}
          onModeChange={handleModeChange}
          onNavigate={handleDateNavigation}
        />
      </div>
      
      <div className="calendar-grid-container">
        <CalendarGrid
          calendarData={calendarData}
          mode={calendarState.mode}
          onItemClick={handleItemClick}
        />
      </div>
      
      {selectedItem && (
        <TaskModal
          selectedItem={selectedItem}
          onClose={handleCloseModal}
          onAction={handleTaskAction}
        />
      )}
    </div>
  );
}

export default CalendarView;