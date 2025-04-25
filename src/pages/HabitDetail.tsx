
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Calendar, Edit2, Eye, EyeOff, Trash2 } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar as CalendarUI } from '@/components/ui/calendar';

// Define appropriate types for our habits
type BaseHabitDetail = {
  id: string;
  name: string;
  streak: number;
  isShared: boolean;
  completedDates: string[];
}

type PersonalHabitDetail = BaseHabitDetail & {
  isPrivate: boolean;
}

type SharedHabitDetail = BaseHabitDetail & {
  jointStreak: number;
  partnerName: string;
  partnerCompletedDates: string[];
  bothCompletedDates: string[];
}

type HabitDetailType = PersonalHabitDetail | SharedHabitDetail;

// Demo data with properly typed objects
const habitDetails: Record<string, HabitDetailType> = {
  '1': {
    id: '1',
    name: 'Morning Run',
    streak: 5,
    isShared: false,
    isPrivate: false,
    completedDates: ['2025-04-22', '2025-04-23', '2025-04-24'],
  },
  '2': {
    id: '2',
    name: 'Drink Water',
    streak: 12,
    isShared: false,
    isPrivate: false,
    completedDates: ['2025-04-20', '2025-04-21', '2025-04-22', '2025-04-23', '2025-04-24'],
  },
  '3': {
    id: '3',
    name: 'Cook Dinner',
    streak: 3,
    jointStreak: 2,
    isShared: true,
    partnerName: 'Emma',
    completedDates: ['2025-04-21', '2025-04-22', '2025-04-24'],
    partnerCompletedDates: ['2025-04-22', '2025-04-23', '2025-04-24'],
    bothCompletedDates: ['2025-04-22', '2025-04-24'],
  },
  '4': {
    id: '4',
    name: 'Evening Walk',
    streak: 7,
    jointStreak: 4,
    isShared: true,
    partnerName: 'Emma',
    completedDates: ['2025-04-19', '2025-04-20', '2025-04-21', '2025-04-22', '2025-04-23', '2025-04-24'],
    partnerCompletedDates: ['2025-04-20', '2025-04-22', '2025-04-24'],
    bothCompletedDates: ['2025-04-20', '2025-04-22', '2025-04-24'],
  },
  '5': {
    id: '5',
    name: 'Read a Book',
    streak: 2,
    isShared: false,
    isPrivate: true,
    completedDates: ['2025-04-23', '2025-04-24'],
  }
};

const HabitDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const habit = id ? habitDetails[id as keyof typeof habitDetails] : null;
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [habitName, setHabitName] = useState(habit?.name || '');
  const [isPrivate, setIsPrivate] = useState(
    !habit?.isShared && 'isPrivate' in habit ? habit.isPrivate : false
  );
  
  const handleGoBack = () => {
    navigate(-1);
  };

  const handleEditSubmit = () => {
    // In a real app, this would update the habit
    setShowEditDialog(false);
  };

  const handleDeleteHabit = () => {
    // In a real app, this would delete the habit
    setShowDeleteDialog(false);
    navigate('/habits');
  };
  
  // Type guard to check if habit is shared
  const isSharedHabit = (habit: HabitDetailType | null): habit is SharedHabitDetail => {
    return habit?.isShared === true;
  };
  
  // Type guard to check if habit is personal
  const isPersonalHabit = (habit: HabitDetailType | null): habit is PersonalHabitDetail => {
    return habit?.isShared === false;
  };
  
  if (!habit) {
    return (
      <div className="app-container p-4">
        <p>Habit not found.</p>
        <button onClick={handleGoBack} className="button-primary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  const today = new Date();
  
  return (
    <div className="app-container pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-couples-background pt-8 pb-4 px-4 z-10">
        <div className="flex items-center">
          <button onClick={handleGoBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-medium">{habit.name}</h1>
          {isPersonalHabit(habit) && habit.isPrivate && (
            <EyeOff className="h-4 w-4 ml-2 text-couples-text/50" />
          )}
        </div>
      </header>
      
      <main className="px-4">
        {/* Streak Information */}
        <section className="bg-white rounded-lg shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-5 w-5 text-couples-accent fill-couples-accent" />
            {isSharedHabit(habit) ? (
              <>
                <h2 className="text-lg font-medium">Joint Streak: {habit.jointStreak || 0} days</h2>
              </>
            ) : (
              <>
                <h2 className="text-lg font-medium">Current Streak: {habit.streak} days</h2>
              </>
            )}
          </div>
          
          {isSharedHabit(habit) && (
            <div className="text-sm text-couples-text mt-2">
              <p>You've completed this {habit.completedDates.length} times</p>
              <p>{habit.partnerName} has completed this {habit.partnerCompletedDates.length} times</p>
              <p className="text-couples-completed mt-1">
                You both kept this up for {habit.jointStreak || 0} consecutive days!
              </p>
            </div>
          )}
        </section>
        
        {/* Calendar View */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <h2 className="font-medium">Completion History</h2>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 overflow-x-auto">
            <CalendarUI
              mode="multiple"
              selected={habit.completedDates.map(date => new Date(date))}
              className="pointer-events-auto"
            />
            
            {isSharedHabit(habit) && (
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-couples-accent"></div>
                  <span>You</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-couples-text/50"></div>
                  <span>{habit.partnerName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-couples-completed"></div>
                  <span>Both</span>
                </div>
              </div>
            )}
          </div>
        </section>
        
        {/* Actions */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowEditDialog(true)}
              className="flex items-center justify-center gap-2 button-secondary"
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit</span>
            </button>
            
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center justify-center gap-2 bg-red-50 text-red-500 rounded-full px-6 py-3 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </section>
      </main>
      
      <BottomNav />
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium mb-1">
                Habit Name
              </label>
              <input
                id="edit-name"
                className="input-field"
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
              />
            </div>
            
            {!habit.isShared && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Privacy</span>
                  <p className="text-sm text-couples-text/70">Make this habit visible to your partner</p>
                </div>
                <div className="flex items-center">
                  <button 
                    onClick={() => setIsPrivate(!isPrivate)}
                    className="flex items-center justify-center h-6 w-12 rounded-full relative focus:outline-none"
                  >
                    <div className={`
                      absolute w-full h-full rounded-full transition-colors
                      ${isPrivate ? 'bg-couples-incomplete' : 'bg-couples-completed'}
                    `}></div>
                    <div className={`
                      absolute h-5 w-5 rounded-full bg-white shadow transform transition-transform
                      ${isPrivate ? 'translate-x-[-8px]' : 'translate-x-[8px]'}
                    `}></div>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditSubmit}
              className="bg-couples-accent hover:bg-couples-accent/90"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Habit</DialogTitle>
          </DialogHeader>
          
          <p>Are you sure you want to delete "{habit.name}"? This action cannot be undone.</p>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteHabit}
              variant="destructive"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HabitDetail;
