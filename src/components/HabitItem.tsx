import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Calendar, Info, Clock, Flag } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface HabitItemProps {
  id: string;
  name: string;
  completed: boolean;
  isShared?: boolean;
  partnerCompleted?: boolean;
  partnerName?: string;
  frequency?: 'daily' | 'weekly';
  frequencyDays?: string[];
  description?: string | null;
  onToggle: () => void;
  isTodayScheduled: boolean;
  isDisabled: boolean;
}

const HabitItem: React.FC<HabitItemProps> = ({
  id,
  name,
  completed,
  isShared = false,
  partnerCompleted = false,
  partnerName = '',
  frequency = 'daily',
  frequencyDays = [],
  description = null,
  onToggle,
  isTodayScheduled,
  isDisabled,
}) => {
  // Format the frequency for display
  const frequencyText = React.useMemo(() => {
    if (frequency === 'daily') return 'Daily';

    if (frequency === 'weekly' && frequencyDays && frequencyDays.length > 0) {
      if (frequencyDays.length === 7) return 'Daily';

      // Show abbreviated days (e.g., "Mon, Wed, Fri")
      const dayMap: Record<string, string> = {
        'monday': 'Mon',
        'tuesday': 'Tue',
        'wednesday': 'Wed',
        'thursday': 'Thu',
        'friday': 'Fri',
        'saturday': 'Sat',
        'sunday': 'Sun'
      };

      return frequencyDays.map(day => dayMap[day] || day).join(', ');
    }

    return 'Daily'; // Default
  }, [frequency, frequencyDays]);

  return (
    <div className={cn(
      "habit-item relative rounded-md p-3 shadow-lg",
      !isTodayScheduled && "opacity-60"
    )}>

      <button
        onClick={onToggle}
        className={`habit-checkbox ${completed ? 'completed' : ''} ${!isTodayScheduled ? 'bg-couples-backgroundAlt border-couples-text/20' : ''
          }`}
        aria-label={`Mark ${name} as ${completed ? 'incomplete' : 'complete'}`}
        disabled={isDisabled || !isTodayScheduled}
      >
        {completed && <Check className="h-4 w-4" />}
      </button>

      <Link to={`/habits/${id}`} className="flex-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{name}</h3>
            {description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-couples-text/50" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">{description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-3 mt-0.5">
            {/* Frequency indicator */}
            <div className="text-xs flex items-center gap-1 text-couples-text/70">
              <Calendar className="h-3 w-3" />
              <span>{frequencyText}</span>
            </div>

            {/* Shared status message */}
            {isShared && (
              <div className="text-xs">
                {completed && partnerCompleted ? (
                  <span className="text-couples-completed">Both completed ✓</span>
                ) : completed && !partnerCompleted ? (
                  <span className="text-couples-text/70">Waiting for {partnerName}</span>
                ) : !completed && partnerCompleted ? (
                  <span className="text-couples-text/70">{partnerName} completed</span>
                ) : (
                  <span className="text-couples-text/70">Shared with {partnerName}</span>
                )}
              </div>
            )}

            {/* Not scheduled today indicator - moved to a small badge */}
            {!isTodayScheduled && (
              <div className="text-xs text-couples-text/50">
                Not for today
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default HabitItem;
