
import type { TaskMetrics } from '../types';
import './AnalysisComponents.css';

interface TimelineChartProps {
  metrics: TaskMetrics;
  onBarClick?: (type: 'onTime' | 'overdue') => void;
}

export function TimelineChart({ metrics, onBarClick }: TimelineChartProps) {
  const { onTime, overdue, total } = metrics;
  
  if (total === 0) {
    return (
      <div className="timeline-chart-container">
        <div className="chart-title">Timeline Performance</div>
        <div className="no-data">No completed tasks to analyze</div>
      </div>
    );
  }
  
  const maxValue = Math.max(onTime, overdue) || 1;
  const onTimeHeight = (onTime / maxValue) * 100;
  const overdueHeight = (overdue / maxValue) * 100;
  
  return (
    <div className="timeline-chart-container">
      <div className="chart-title">Timeline Performance</div>
      
      <div className="bar-chart">
        <div className="bar-container">
          <div 
            className="bar on-time-bar"
            style={{ height: `${onTimeHeight}%` }}
            onClick={() => onBarClick?.('onTime')}
          >
            <div className="bar-value">{onTime}</div>
          </div>
          <div className="bar-label">On Time</div>
        </div>
        
        <div className="bar-container">
          <div 
            className="bar overdue-bar"
            style={{ height: `${overdueHeight}%` }}
            onClick={() => onBarClick?.('overdue')}
          >
            <div className="bar-value">{overdue}</div>
          </div>
          <div className="bar-label">Overdue</div>
        </div>
      </div>
      
      <div className="chart-summary">
        <div className="summary-item success">
          <span className="summary-percentage">
            {total > 0 ? Math.round((onTime / total) * 100) : 0}%
          </span>
          <span className="summary-label">On Time</span>
        </div>
        <div className="summary-item warning">
          <span className="summary-percentage">
            {total > 0 ? Math.round((overdue / total) * 100) : 0}%
          </span>
          <span className="summary-label">Overdue</span>
        </div>
      </div>
    </div>
  );
}

export default TimelineChart;