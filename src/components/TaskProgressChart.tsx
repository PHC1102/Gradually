
import type { TaskMetrics } from '../types';
import { formatPercentage } from '../utils/analysisUtils';
import './AnalysisComponents.css';

interface TaskProgressChartProps {
  metrics: TaskMetrics;
  onClick?: () => void;
}

export function TaskProgressChart({ metrics, onClick }: TaskProgressChartProps) {
  const { completionRate, onTime, overdue, total } = metrics;
  
  const getProgressColor = (rate: number): string => {
    if (rate >= 80) return '#00FF7F';
    if (rate >= 60) return '#00BFFF';
    if (rate >= 40) return '#1E90FF';
    return '#FF6B6B';
  };
  
  return (
    <div className="task-progress-container" onClick={onClick}>
      <div className="chart-title">Task Completion Rate</div>
      
      <div className="progress-display">
        <div className="progress-percentage">
          {formatPercentage(completionRate)}
        </div>
        <div className="progress-label">Complete</div>
      </div>
      
      <div className="progress-bar-container">
        <div className="progress-bar-background">
          <div 
            className="progress-bar-fill"
            style={{
              width: `${completionRate}%`,
              background: `linear-gradient(90deg, ${getProgressColor(completionRate)}, ${getProgressColor(completionRate)}80)`,
              boxShadow: `0 0 10px ${getProgressColor(completionRate)}40`
            }}
          />
        </div>
        <div className="progress-bar-labels">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
      
      <div className="task-stats">
        <div className="stat-item">
          <div className="stat-number">{total}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-item">
          <div className="stat-number on-time">{onTime}</div>
          <div className="stat-label">On Time</div>
        </div>
        <div className="stat-item">
          <div className="stat-number overdue">{overdue}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>
    </div>
  );
}

export default TaskProgressChart;