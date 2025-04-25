
import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export interface HabitItemProps {
  id: string;
  name: string;
  completed: boolean;
  isShared?: boolean;
  partnerCompleted?: boolean;
  partnerName?: string;
  onToggle: () => void;
}

const HabitItem: React.FC<HabitItemProps> = ({
  id,
  name,
  completed,
  isShared = false,
  partnerCompleted = false,
  partnerName = '',
  onToggle,
}) => {
  return (
    <div className="habit-item">
      <button 
        onClick={onToggle} 
        className={`habit-checkbox ${completed ? 'completed' : ''}`}
      >
        {completed && <Check className="h-4 w-4" />}
      </button>
      
      <Link to={`/habits/${id}`} className="flex-1">
        <div>
          <h3>{name}</h3>
          {isShared && (
            <div className="text-sm mt-1">
              {completed && partnerCompleted ? (
                <span className="text-couples-completed">Both completed ✓</span>
              ) : completed && !partnerCompleted ? (
                <span className="text-couples-text/70">Waiting for {partnerName}</span>
              ) : !completed && partnerCompleted ? (
                <span className="text-couples-text/70">{partnerName} has completed this</span>
              ) : (
                <span className="text-couples-text/70">Shared habit</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default HabitItem;
