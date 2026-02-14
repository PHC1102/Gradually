
import type { CalendarMode } from '../types';

interface CalendarControlsProps {
  mode: CalendarMode;
  currentDate: Date;
  onModeChange: (mode: CalendarMode) => void;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
}

// Format date as DD/MM/YYYY
function formatShortDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function CalendarControls({ 
  mode, 
  currentDate, 
  onModeChange, 
  onNavigate 
}: CalendarControlsProps) {
  const displayDate = formatShortDate(currentDate);

  return (
    <div className="calendar-controls-wrapper">
      {/* Navigation controls bar - 3 columns grid */}
      <div className="calendar-controls">
        {/* Left: empty spacer */}
        <div className="calendar-controls-left"></div>
        
        {/* Center: arrows + date */}
        <div className="calendar-controls-center">
          <button 
            className="nav-btn"
            onClick={() => onNavigate('prev')}
            title={`Previous ${mode === 'weekly' ? 'week' : 'month'}`}
          >
            ◀
          </button>
          
          <button 
            className="nav-btn"
            onClick={() => onNavigate('next')}
            title={`Next ${mode === 'weekly' ? 'week' : 'month'}`}
          >
            ▶
          </button>
          
          <span className="current-date">{displayDate}</span>
        </div>

        {/* Right: Today button */}
        <div className="calendar-controls-right">
          <button 
            className="today-btn"
            onClick={() => onNavigate('today')}
          >
            Today
          </button>
        </div>
      </div>

      {/* Month/Week toggle - below nav bar, above grid */}
      <div className="view-mode-toggle">
        <button 
          className={`mode-btn ${mode === 'monthly' ? 'active' : ''}`}
          onClick={() => onModeChange('monthly')}
        >
          Monthly
        </button>
        <button 
          className={`mode-btn ${mode === 'weekly' ? 'active' : ''}`}
          onClick={() => onModeChange('weekly')}
        >
          Weekly
        </button>
      </div>
    </div>
  );
}

export default CalendarControls;