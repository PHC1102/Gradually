import { useState, useMemo } from 'react';
import type { Task } from '../types';

interface CramRiskGaugeProps {
  tasks: Task[];
  today?: Date;
}

interface GaugeData {
  totalItems: number;
  daysRange: number;
  avgPerDay: number;
  maxDueDate: Date | null;
  wasRangeLimited: boolean;
  selectedDays: number;
}

interface RiskLevel {
  level: 'low' | 'medium' | 'high';
  color: string;
  message: string;
  icon: string;
}

export function CramRiskGauge({
  tasks,
  today = new Date()
}: CramRiskGaugeProps) {
  const [selectedDays, setSelectedDays] = useState<number>(7);
  
  const gaugeData: GaugeData = useMemo(() => {
    // Flatten all tasks and subtasks into one array
    const allItems: Array<{ id: string | number; title: string; dueDate: Date }> = [];
    
    tasks.forEach(task => {
      if (!task.done) {
        allItems.push({
          id: task.id,
          title: task.title,
          dueDate: new Date(task.deadline)
        });
        
        task.subtasks.forEach(subtask => {
          if (!subtask.done) {
            allItems.push({
              id: subtask.id,
              title: subtask.title,
              dueDate: new Date(subtask.deadline)
            });
          }
        });
      }
    });
    
    if (allItems.length === 0) {
      return {
        totalItems: 0,
        daysRange: selectedDays,
        avgPerDay: 0,
        maxDueDate: null,
        wasRangeLimited: false,
        selectedDays
      };
    }
    
    // Find the latest deadline
    const maxDueDate = allItems.reduce((latest, item) => 
      item.dueDate > latest ? item.dueDate : latest, 
      allItems[0].dueDate
    );
    
    // Calculate actual days until the farthest deadline
    const todayTime = today.getTime();
    const maxDueDateTime = maxDueDate.getTime();
    const daysTillMaxDeadline = Math.ceil((maxDueDateTime - todayTime) / (24 * 60 * 60 * 1000));
    
    // Use the shorter of selected days or actual remaining days
    const daysRange = Math.min(selectedDays, Math.max(1, daysTillMaxDeadline));
    const wasRangeLimited = selectedDays > daysTillMaxDeadline;
    
    // Calculate end date for the range
    const rangeEndDate = new Date(todayTime + daysRange * 24 * 60 * 60 * 1000);
    
    // Count items within the range
    const totalItems = allItems.filter(item => 
      item.dueDate >= today && item.dueDate <= rangeEndDate
    ).length;
    
    // Calculate average per day
    const avgPerDay = daysRange > 0 ? totalItems / daysRange : 0;
    
    return {
      totalItems,
      daysRange,
      avgPerDay,
      maxDueDate,
      wasRangeLimited,
      selectedDays
    };
  }, [tasks, today, selectedDays]);
  
  const riskLevel: RiskLevel = useMemo(() => {
    if (gaugeData.avgPerDay <= 1) {
      return {
        level: 'low',
        color: '#00FF7F',
        message: '✅ Chill, on pace',
        icon: '✅'
      };
    } else if (gaugeData.avgPerDay <= 3) {
      return {
        level: 'medium',
        color: '#FFD700',
        message: '⚠️ Stay alert',
        icon: '⚠️'
      };
    } else {
      return {
        level: 'high',
        color: '#FF4444',
        message: '🚨 Danger of cramming',
        icon: '🚨'
      };
    }
  }, [gaugeData.avgPerDay]);
  
  // Calculate needle angle based on avgPerDay (normalize to 0-1 scale for gauge)
  // Scale: 0-1 task/day = 0-33%, 1-3 tasks/day = 33-66%, >3 tasks/day = 66-100%
  const normalizedRatio = Math.min(1, gaugeData.avgPerDay / 5); // Cap at 5 tasks/day for visualization
  const needleAngle = normalizedRatio * 180 - 90;
  
  const dayOptions = [7, 14, 30];
  
  return (
    <div className="cram-risk-gauge">
      <h3 className="gauge-title">
        <span className="gauge-icon">⛽</span>
        Cram Risk Gauge
      </h3>
      
      {/* Range Selector */}
      <div className="range-selector">
        <label className="range-label">Select time range:</label>
        <div className="range-buttons">
          {dayOptions.map(days => (
            <button
              key={days}
              className={`range-button ${selectedDays === days ? 'active' : ''}`}
              onClick={() => setSelectedDays(days)}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>
      
      <div className="gauge-container">
        <div className="gauge-background">
          {/* SVG Gauge */}
          <svg viewBox="0 0 200 120" className="gauge-svg">
            {/* Background arc gradient */}
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00FF7F" />
                <stop offset="33%" stopColor="#00FF7F" />
                <stop offset="33%" stopColor="#FFD700" />
                <stop offset="66%" stopColor="#FFD700" />
                <stop offset="66%" stopColor="#FF4444" />
                <stop offset="100%" stopColor="#FF4444" />
              </linearGradient>
              
              {/* Glow filter for needle */}
              <filter id="needleGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Background arc */}
            <path
              d="M 30 100 A 70 70 0 0 1 170 100"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="12"
              strokeLinecap="round"
              className="gauge-arc"
            />
            
            {/* Tick marks */}
            {[0, 1/5, 3/5, 1].map((value, index) => {
              const angle = value * 180 - 90;
              const radians = (angle * Math.PI) / 180;
              const x1 = 100 + 60 * Math.cos(radians);
              const y1 = 100 + 60 * Math.sin(radians);
              const x2 = 100 + 70 * Math.cos(radians);
              const y2 = 100 + 70 * Math.sin(radians);
              
              return (
                <line
                  key={index}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#666"
                  strokeWidth="2"
                />
              );
            })}
            
            {/* Needle */}
            <g transform={`rotate(${needleAngle} 100 100)`}>
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="40"
                stroke={riskLevel.color}
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#needleGlow)"
                className="gauge-needle"
              />
              
              {/* Needle center dot */}
              <circle
                cx="100"
                cy="100"
                r="6"
                fill={riskLevel.color}
                filter="url(#needleGlow)"
              />
            </g>
            
            {/* Value labels */}
            <text x="30" y="115" fill="#666" fontSize="10" textAnchor="middle">0/day</text>
            <text x="100" y="25" fill="#666" fontSize="10" textAnchor="middle">3/day</text>
            <text x="170" y="115" fill="#666" fontSize="10" textAnchor="middle">5+/day</text>
          </svg>
        </div>
        
        {/* Risk indicator */}
        <div className="risk-indicator" style={{ color: riskLevel.color }}>
          <div className="risk-percentage">
            {gaugeData.avgPerDay.toFixed(1)}
          </div>
          <div className="risk-label">tasks/day</div>
        </div>
      </div>
      
      {/* Risk message */}
      <div className="risk-message" style={{ color: riskLevel.color }}>
        <span className="risk-icon">{riskLevel.icon}</span>
        {riskLevel.message}
      </div>
      
      {/* Forecast information */}
      <div className="forecast-info">
        <div className="forecast-item">
          <span className="forecast-label">Workload analysis:</span>
          <span className="forecast-value">
            You have <strong>{gaugeData.totalItems}</strong> tasks/subtasks in the next <strong>{gaugeData.daysRange}</strong> days (~<strong>{gaugeData.avgPerDay.toFixed(1)}</strong>/day).
          </span>
        </div>
        
        {gaugeData.wasRangeLimited && (
          <div className="forecast-item warning">
            <span className="forecast-value">
              (Final deadline is in <strong>{gaugeData.daysRange}</strong> days)
            </span>
          </div>
        )}
        
        {gaugeData.totalItems === 0 && (
          <div className="forecast-item">
            <span className="forecast-value">
              🎉 No pending tasks in the selected range! You're all caught up.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CramRiskGauge;