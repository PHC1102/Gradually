import { useMemo } from 'react';
import type { Task, AnalysisData } from '../types';
import { generateAnalysisData } from '../utils/analysisUtils';
import { PaceChart } from './PaceChart';
import { StreakCounter } from './StreakCounter';
import { CramRiskGauge } from './CramRiskGauge';
import './AnalysisComponents.css';

interface AnalysisViewProps {
  tasks: Task[];
  completedTasks?: any[];
  onTaskFilter?: (filterType: string, value: any) => void;
}

export function AnalysisView({ 
  tasks, 
  completedTasks = [], 
  onTaskFilter 
}: AnalysisViewProps) {

  
  // Calculate analysis data
  const analysisData: AnalysisData = useMemo(() => {
    return generateAnalysisData(tasks, completedTasks);
  }, [tasks, completedTasks]);
  
  const handleChartInteraction = (type: string, value?: any) => {
    onTaskFilter?.(type, value);
  };
  
  const handleSegmentClick = (segment: 'onPace' | 'behind') => {
    handleChartInteraction('subtask-pace', segment);
  };
  
  const handleStreakClick = () => {
    handleChartInteraction('streak', analysisData.subtaskMetrics.streak);
  };
  
  return (
    <>
      <div className="analysis-header-container">
        <div className="analysis-header">
          <h1 className="analysis-title">Performance Analysis</h1>
          <p className="analysis-subtitle">
            Track your productivity patterns and anti-cram metrics
          </p>
        </div>
      </div>
      
      <div className="analysis-content-container">
        <div className="analysis-content">
          {/* Task-level Pace Metrics Section */}
          <section className="analysis-section subtask-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon">⚡</span>
                Task Pace Metrics
              </h2>
              <p className="section-description">
                Track tasks on pace vs behind schedule
              </p>
            </div>
            
            <div className="metrics-grid subtask-grid">
              <div className="metric-card pace-card">
                <PaceChart 
                  metrics={analysisData.subtaskMetrics}
                  onSegmentClick={handleSegmentClick}
                />
              </div>
              
              <div className="metric-card streak-card">
                <StreakCounter 
                  streak={analysisData.subtaskMetrics.streak}
                  onClick={handleStreakClick}
                />
              </div>
            </div>
          </section>
          
          {/* Task-level Metrics Section */}
          <section className="analysis-section task-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon">⛽</span>
                Cram Risk Analysis
              </h2>
              <p className="section-description">
                Monitor workload clustering and cramming patterns
              </p>
            </div>
            
            <div className="metrics-grid task-grid">
              <div className="metric-card">
                <CramRiskGauge 
                  tasks={tasks}
                />
              </div>
            </div>
          </section>
          
          {/* Insights Section */}
          <section className="analysis-section insights-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon">💡</span>
                AI Insights
              </h2>
            </div>
            
            <div className="insights-grid">
              <InsightCard 
                data={analysisData}
                type="pace"
              />
              <InsightCard 
                data={analysisData}
                type="completion"
              />
              <InsightCard 
                data={analysisData}
                type="streak"
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// Helper component for AI insights
interface InsightCardProps {
  data: AnalysisData;
  type: 'pace' | 'completion' | 'streak';
}

function InsightCard({ data, type }: InsightCardProps) {
  const getInsight = () => {
    switch (type) {
      case 'pace':
        const paceRate = data.subtaskMetrics.total > 0 
          ? (data.subtaskMetrics.onPace / data.subtaskMetrics.total) * 100 
          : 0;
        
        if (paceRate >= 80) {
          return {
            icon: '🚀',
            title: 'Tasks On Track',
            message: 'Most of your tasks have no overdue subtasks. Excellent pacing!'
          };
        } else if (paceRate >= 60) {
          return {
            icon: '⚡',
            title: 'Good Task Management',
            message: 'Some tasks are behind. Focus on completing overdue subtasks first.'
          };
        } else {
          return {
            icon: '⚠️',
            title: 'Tasks Behind Schedule',
            message: 'Many tasks have overdue subtasks. Prioritize catching up on deadlines.'
          };
        }
      
      case 'completion':
        const completionRate = data.taskMetrics.completionRate;
        
        if (completionRate >= 80) {
          return {
            icon: '🏆',
            title: 'High Achiever',
            message: 'Excellent completion rate! You\'re highly productive.'
          };
        } else if (completionRate >= 60) {
          return {
            icon: '📈',
            title: 'Making Progress',
            message: 'Good completion rate. Consider breaking down larger tasks.'
          };
        } else {
          return {
            icon: '🎯',
            title: 'Room for Growth',
            message: 'Focus on completing smaller tasks first to build momentum.'
          };
        }
      
      case 'streak':
        const streak = data.subtaskMetrics.streak;
        
        if (streak >= 7) {
          return {
            icon: '🔥',
            title: 'Streak Master',
            message: `${streak} days of consistent progress! You\'ve mastered anti-cramming.`
          };
        } else if (streak >= 3) {
          return {
            icon: '💪',
            title: 'Building Habits',
            message: `${streak} days strong! You\'re developing great work habits.`
          };
        } else {
          return {
            icon: '🌱',
            title: 'Getting Started',
            message: 'Complete subtasks consistently to build your anti-cram streak!'
          };
        }
      
      default:
        return {
          icon: '📊',
          title: 'Analysis',
          message: 'Keep tracking your progress!'
        };
    }
  };
  
  const insight = getInsight();
  
  return (
    <div className="insight-card">
      <div className="insight-icon">{insight.icon}</div>
      <div className="insight-content">
        <h3 className="insight-title">{insight.title}</h3>
        <p className="insight-message">{insight.message}</p>
      </div>
    </div>
  );
}

export default AnalysisView;