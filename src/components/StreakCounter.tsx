
import './AnalysisComponents.css';

interface StreakCounterProps {
  streak: number;
  onClick?: () => void;
}

export function StreakCounter({ streak, onClick }: StreakCounterProps) {
  const getStreakEmoji = (days: number): string => {
    if (days === 0) return '💤';
    if (days < 3) return '🔥';
    if (days < 7) return '🚀';
    if (days < 14) return '⚡';
    return '🏆';
  };
  
  const getStreakLevel = (days: number): string => {
    if (days === 0) return 'dormant';
    if (days < 3) return 'warming';
    if (days < 7) return 'hot';
    if (days < 14) return 'blazing';
    return 'legendary';
  };
  
  return (
    <div 
      className={`streak-counter ${getStreakLevel(streak)}`}
      onClick={onClick}
    >
      <div className="streak-header">
        <span className="streak-label">Anti-Cram Streak</span>
        <span className="streak-emoji">{getStreakEmoji(streak)}</span>
      </div>
      
      <div className="streak-display">
        <div className="streak-number">{streak}</div>
        <div className="streak-unit">
          {streak === 1 ? 'Day' : 'Days'}
        </div>
      </div>
      
      <div className="streak-subtitle">
        {streak === 0 && 'Complete subtasks on time to start!'}
        {streak > 0 && streak < 3 && 'Keep it up!'}
        {streak >= 3 && streak < 7 && 'You\'re on fire!'}
        {streak >= 7 && streak < 14 && 'Incredible momentum!'}
        {streak >= 14 && 'Legendary consistency!'}
      </div>
      
      <div className="streak-glow"></div>
    </div>
  );
}

export default StreakCounter;