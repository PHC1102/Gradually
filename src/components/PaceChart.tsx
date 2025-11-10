import { useState } from 'react';
import type { SubtaskMetrics } from '../types';
import './AnalysisComponents.css';

interface PaceChartProps {
  metrics: SubtaskMetrics;
  onSegmentClick?: (segment: 'onPace' | 'behind') => void;
}

export function PaceChart({ metrics, onSegmentClick }: PaceChartProps) {
  const { onPace, behind, total, onPaceTasks, behindTasks } = metrics;
  const [showTaskList, setShowTaskList] = useState<'onPace' | 'behind' | null>(null);
  
  if (total === 0) {
    return (
      <div className="pace-chart-container">
        <div className="chart-title">Task Pace</div>
        <div className="no-data">No active tasks to analyze</div>
      </div>
    );
  }
  
  const onPacePercentage = (onPace / total) * 100;
  const behindPercentage = (behind / total) * 100;
  
  // Calculate stroke dash array for donut chart
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const onPaceLength = (onPacePercentage / 100) * circumference;
  const behindLength = (behindPercentage / 100) * circumference;
  
  const handleSegmentClick = (segment: 'onPace' | 'behind') => {
    setShowTaskList(showTaskList === segment ? null : segment);
    onSegmentClick?.(segment);
  };
  
  return (
    <div className="pace-chart-container">
      <div className="chart-title">Task Pace</div>
      <div className="donut-chart-wrapper">
        <svg viewBox="0 0 200 200" className="donut-chart">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="20"
          />
          
          {/* On pace segment */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#00FF7F"
            strokeWidth="20"
            strokeDasharray={`${onPaceLength} ${circumference}`}
            strokeDashoffset="0"
            transform="rotate(-90 100 100)"
            className="chart-segment on-pace clickable"
            onClick={() => handleSegmentClick('onPace')}
            style={{ filter: 'drop-shadow(0 0 8px #00FF7F)' }}
          />
          
          {/* Behind segment */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#FF6B6B"
            strokeWidth="20"
            strokeDasharray={`${behindLength} ${circumference}`}
            strokeDashoffset={-onPaceLength}
            transform="rotate(-90 100 100)"
            className="chart-segment behind clickable"
            onClick={() => handleSegmentClick('behind')}
            style={{ filter: 'drop-shadow(0 0 8px #FF6B6B)' }}
          />
          
          {/* Center text */}
          <text
            x="100"
            y="95"
            textAnchor="middle"
            className="chart-center-text"
            fill="#00BFFF"
          >
            {total}
          </text>
          <text
            x="100"
            y="115"
            textAnchor="middle"
            className="chart-center-label"
            fill="rgba(255, 255, 255, 0.7)"
          >
            Tasks
          </text>
        </svg>
        
        <div className="chart-legend">
          <div className="legend-item clickable" onClick={() => handleSegmentClick('onPace')}>
            <div className="legend-color on-pace"></div>
            <span>On Pace: {onPace} ({Math.round(onPacePercentage)}%)</span>
          </div>
          <div className="legend-item clickable" onClick={() => handleSegmentClick('behind')}>
            <div className="legend-color behind"></div>
            <span>Behind: {behind} ({Math.round(behindPercentage)}%)</span>
          </div>
        </div>
        
        {/* Centered Modal */}
        {showTaskList && (
          <div className="modal-overlay" onClick={() => setShowTaskList(null)}>
            <div className="task-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-section">
                  <div 
                    className="task-color-indicator"
                    style={{ 
                      backgroundColor: showTaskList === 'onPace' ? '#00FF7F' : '#FF6B6B'
                    }}
                  ></div>
                  <h3 className="modal-title">
                    {showTaskList === 'onPace' ? 'On Pace Tasks' : 'Behind Tasks'}
                  </h3>
                </div>
                <button 
                  className="close-btn"
                  onClick={() => setShowTaskList(null)}
                >
                  ×
                </button>
              </div>
              
              <div className="modal-content">
                <div className="task-list-scroll">
                  {(showTaskList === 'onPace' ? onPaceTasks : behindTasks).map(task => (
                    <div key={task.id} className="modal-task-item">
                      <div className="task-info">
                        <div className="info-row">
                          <label>Task:</label>
                          <div className="task-title">{task.title}</div>
                        </div>
                        <div className="info-row">
                          <label>Deadline:</label>
                          <div className="deadline-info">
                            <div className="deadline-date">
                              {new Date(task.deadline).toLocaleDateString()}
                            </div>
                            <div className="deadline-time">
                              {new Date(task.deadline).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="info-row">
                          <label>Subtasks:</label>
                          <div className="subtasks-info">
                            <div className="subtasks-progress">
                              {task.subtasks.filter(s => s.done).length} of {task.subtasks.length} completed
                            </div>
                            {task.subtasks.length > 0 && (
                              <div className="subtasks-list">
                                {task.subtasks.map(subtask => (
                                  <div key={subtask.id} className={`subtask-item ${subtask.done ? 'completed' : ''}`}>
                                    <span className="subtask-status">
                                      {subtask.done ? '✓' : '○'}
                                    </span>
                                    <span className="subtask-title">{subtask.title}</span>
                                    <span className="subtask-deadline">
                                      {new Date(subtask.deadline).toLocaleDateString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(showTaskList === 'onPace' ? onPaceTasks : behindTasks).length === 0 && (
                    <div className="no-tasks">No tasks in this category</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaceChart;