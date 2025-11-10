
import type { CalendarItem, CalendarMonth, CalendarWeek, CalendarDay, CalendarMode } from '../types';
import { getWeekdayNames } from '../utils/calendarUtils';

interface CalendarGridProps {
  calendarData: {
    type: 'month' | 'week';
    data: CalendarMonth | CalendarWeek;
  };
  mode: CalendarMode;
  onItemClick: (item: CalendarItem) => void;
}

interface CalendarDayProps {
  day: CalendarDay;
  mode: CalendarMode;
  onItemClick: (item: CalendarItem) => void;
}

function CalendarDayComponent({ day, mode, onItemClick }: CalendarDayProps) {
  const { date, isCurrentMonth, isToday, items } = day;
  
  const dayClasses = [
    'calendar-day',
    !isCurrentMonth && mode === 'monthly' ? 'other-month' : '',
    isToday ? 'today' : '',
    items.length > 0 ? 'has-items' : ''
  ].filter(Boolean).join(' ');

  // Group items by same deadline date and type
  const groupedItems = groupItemsForDisplay(items);

  return (
    <div className={dayClasses}>
      <div className="day-header">
        <span className="day-number">{date.getDate()}</span>
      </div>
      <div className="day-content">
        {groupedItems.map((group, index) => (
          <CalendarItemGroup
            key={index}
            group={group}
            onItemClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
}

interface CalendarItemGroupProps {
  group: {
    type: 'single-task' | 'task-with-subtasks' | 'single-subtask';
    mainItem: CalendarItem;
    subItems?: CalendarItem[];
  };
  onItemClick: (item: CalendarItem) => void;
}

function CalendarItemGroup({ group, onItemClick }: CalendarItemGroupProps) {
  const { type, mainItem, subItems } = group;

  if (type === 'single-task' || type === 'single-subtask') {
    return (
      <CalendarItemBox
        item={mainItem}
        isSubtask={type === 'single-subtask'}
        onClick={() => onItemClick(mainItem)}
      />
    );
  }

  // task-with-subtasks
  return (
    <div className="item-group">
      <CalendarItemBox
        item={mainItem}
        isSubtask={false}
        onClick={() => onItemClick(mainItem)}
      />
      {subItems && subItems.map(subItem => (
        <CalendarItemBox
          key={subItem.id}
          item={subItem}
          isSubtask={true}
          onClick={() => onItemClick(subItem)}
          indent={true}
        />
      ))}
    </div>
  );
}

interface CalendarItemBoxProps {
  item: CalendarItem;
  isSubtask: boolean;
  onClick: () => void;
  indent?: boolean;
}

function CalendarItemBox({ item, isSubtask, onClick, indent }: CalendarItemBoxProps) {
  const itemClasses = [
    'calendar-item',
    isSubtask ? 'subtask' : 'task',
    item.done ? 'completed' : '',
    indent ? 'indented' : ''
  ].filter(Boolean).join(' ');

  const style = {
    backgroundColor: item.color,
    borderColor: item.color
  };

  const time = new Date(item.deadline).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div 
      className={itemClasses}
      style={style}
      onClick={onClick}
      title={isSubtask ? `${item.title} (${item.parentTaskTitle})` : item.title}
    >
      <div className="item-content">
        <div className="item-title">
          {item.title}
        </div>
        <div className="item-time">
          {time}
        </div>
        {isSubtask && (
          <div className="parent-indicator">
            📎 {item.parentTaskTitle}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Group calendar items for better display
 * - If a task and its subtasks share the same date, group them together
 * - Otherwise, show them separately
 */
function groupItemsForDisplay(items: CalendarItem[]) {
  const groups: Array<{
    type: 'single-task' | 'task-with-subtasks' | 'single-subtask';
    mainItem: CalendarItem;
    subItems?: CalendarItem[];
  }> = [];

  const processed = new Set<string>();

  items.forEach(item => {
    if (processed.has(item.id)) return;

    if (item.type === 'task') {
      // Check if any subtasks share the same date
      const relatedSubtasks = items.filter(i => 
        i.type === 'subtask' && 
        i.parentTaskId === item.id && 
        !processed.has(i.id)
      );

      if (relatedSubtasks.length > 0) {
        groups.push({
          type: 'task-with-subtasks',
          mainItem: item,
          subItems: relatedSubtasks
        });
        // Mark all related items as processed
        processed.add(item.id);
        relatedSubtasks.forEach(sub => processed.add(sub.id));
      } else {
        groups.push({
          type: 'single-task',
          mainItem: item
        });
        processed.add(item.id);
      }
    } else if (item.type === 'subtask') {
      // Only add if not already processed as part of a group
      groups.push({
        type: 'single-subtask',
        mainItem: item
      });
      processed.add(item.id);
    }
  });

  return groups;
}

export function CalendarGrid({ calendarData, mode, onItemClick }: CalendarGridProps) {
  const weekdayNames = getWeekdayNames();

  if (calendarData.type === 'week') {
    const week = calendarData.data as CalendarWeek;
    
    return (
      <div className="calendar-grid weekly">
        <div className="calendar-header">
          {weekdayNames.map(day => (
            <div key={day} className="weekday-header">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-body week-view">
          {week.days.map((day, index) => (
            <CalendarDayComponent
              key={index}
              day={day}
              mode={mode}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      </div>
    );
  } else {
    const month = calendarData.data as CalendarMonth;
    
    return (
      <div className="calendar-grid monthly">
        <div className="calendar-header">
          {weekdayNames.map(day => (
            <div key={day} className="weekday-header">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-body month-view">
          {month.weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {week.days.map((day, dayIndex) => (
                <CalendarDayComponent
                  key={`${weekIndex}-${dayIndex}`}
                  day={day}
                  mode={mode}
                  onItemClick={onItemClick}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default CalendarGrid;