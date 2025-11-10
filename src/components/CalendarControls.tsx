
import type { CalendarMode } from '../types';
import { formatDisplayDate } from '../utils/calendarUtils';

interface CalendarControlsProps {
  mode: CalendarMode;
  currentDate: Date;
  onModeChange: (mode: CalendarMode) => void;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
}

export function CalendarControls({ 
  mode, 
  currentDate, 
  onModeChange, 
  onNavigate 
}: CalendarControlsProps) {
  const displayDate = formatDisplayDate(currentDate, mode);

  return (
    <div className="calendar-controls">
      <div className="calendar-controls-left">
        <div className="view-mode-buttons">
          <button 
            className={`mode-btn ${mode === 'monthly' ? 'active' : ''}`}
            onClick={() => onModeChange('monthly')}
          >
            Month
          </button>
          <button 
            className={`mode-btn ${mode === 'weekly' ? 'active' : ''}`}
            onClick={() => onModeChange('weekly')}
          >
            Week
          </button>
        </div>
      </div>

      <div className="calendar-controls-center">
        <div className="navigation-controls">
          <button 
            className="nav-btn prev-btn"
            onClick={() => onNavigate('prev')}
            title={`Previous ${mode === 'weekly' ? 'week' : 'month'}`}
          >
            ◀
          </button>
          
          <div className="current-period">
            <h2>{displayDate}</h2>
          </div>
          
          <button 
            className="nav-btn next-btn"
            onClick={() => onNavigate('next')}
            title={`Next ${mode === 'weekly' ? 'week' : 'month'}`}
          >
            ▶
          </button>
        </div>
      </div>

      <div className="calendar-controls-right">
        <button 
          className="today-btn"
          onClick={() => onNavigate('today')}
        >
          Today
        </button>
      </div>
    </div>
  );
}

export default CalendarControls;