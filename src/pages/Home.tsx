import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Plus, Loader2, CalendarDays, PenLine } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import HabitItem from '../components/HabitItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePartnerData } from '@/hooks/usePartnerData';
import { useAuth } from '@/contexts/AuthContext';
import {
  useHabits,
  useCompleteHabit,
  useDeleteCompletion,
  HabitWithCompletion
} from '@/hooks/useHabitData';
import { usePartnerNote, useSendNote } from '@/hooks/useNoteData';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from "@/components/ui/skeleton";
import Confetti from 'react-confetti';

// Enhanced StickyNote component - Now display only
const EnhancedStickyNote = ({ content, author, hasNote = false }) => {
  return (
    <div
      className={`
        relative bg-white p-4 rounded-md border border-gray-300 shadow-sm mb-4
        ${!hasNote ? 'bg-white/50 border-dashed' : ''}
      `}
    >
      {hasNote ? (
        <>
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-couples-accent rounded-full shadow-sm" />
          <p className="mb-3 text-gray-800">{content}</p>
          <p className="text-right text-sm text-gray-600 font-medium">— from your lovely {author}</p>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-3 text-gray-500">
          <p className="text-center text-sm">Notes from {author} will appear here</p>
        </div>
      )}
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const [noteContent, setNoteContent] = useState('');
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Use authentication context
  const { user } = useAuth();

  // Use hooks to get data
  const { partner, isLoading: isLoadingPartner, error: partnerError } = usePartnerData();
  const {
    data: habitsData,
    isLoading: isLoadingHabits,
    error: habitsError
  } = useHabits();
  const { data: latestPartnerNote, isLoading: isLoadingNote, error: noteError } = usePartnerNote();
  const sendNoteMutation = useSendNote();

  // Get today's day name
  const todayDayName = useMemo(() => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[new Date().getDay()];
  }, []);

  // Get today's date in display format
  const todayFormatted = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Filter habits for today only
  const todaysHabits = useMemo(() => {
    if (!habitsData) return [];

    return habitsData.filter(habit => {
      // For daily habits, show them
      if (habit.frequency === 'daily') return true;

      // For weekly habits, check if today is in their frequency days
      if (habit.frequency === 'weekly' && Array.isArray(habit.frequency_days)) {
        return habit.frequency_days.includes(todayDayName);
      }

      // Default to showing if unknown frequency (shouldn't happen)
      return true;
    });
  }, [habitsData, todayDayName]);

  // Separate habits into categories
  const { sharedHabits, myPersonalHabits, partnerVisibleHabits } = useMemo(() => {
    if (!todaysHabits || !user)
      return { sharedHabits: [], myPersonalHabits: [], partnerVisibleHabits: [] };

    return {
      // Shared habits (couple_id is not null)
      sharedHabits: todaysHabits.filter(habit => habit.couple_id !== null),

      // My personal habits (couple_id is null and created by me)
      myPersonalHabits: todaysHabits.filter(habit =>
        habit.couple_id === null && habit.user_id === user.id
      ),

      // Partner's visible habits (couple_id is null, created by partner, and not private)
      partnerVisibleHabits: todaysHabits.filter(habit =>
        habit.couple_id === null &&
        habit.user_id !== user.id &&
        !habit.is_private &&
        partner?.id // Only include if we have a partner
      )
    };
  }, [todaysHabits, user, partner]);

  // Get partner name for UI elements
  const partnerNameForUI = useMemo(() => {
    // Important: Don't use isLoadingPartner here for the name itself, 
    // let the skeleton handle the loading state visually.
    return partner?.name || 'your partner';
  }, [partner]);

  // Calculate relevant habits (own + shared) for progress bar
  const relevantHabits = useMemo(() => {
    if (!todaysHabits || !user) return [];
    // Only include my personal habits and shared habits (not partner's habits)
    return todaysHabits.filter(habit => 
      habit.couple_id !== null || // shared habits
      (habit.couple_id === null && habit.user_id === user.id) // my personal habits
    );
  }, [todaysHabits, user]);

  // Calculate completion percentage for progress bar
  const completionPercentage = useMemo(() => {
    if (!relevantHabits || relevantHabits.length === 0) return 0;
    const completedCount = relevantHabits.filter(h => h.isCompletedToday).length;
    return Math.round((completedCount / relevantHabits.length) * 100);
  }, [relevantHabits]);

  // *** Unified Loading State for Core Content ***
  const isCoreLoading = isLoadingPartner || isLoadingHabits;
  // Note loading is handled separately within its section

  // Check if all habits are completed
  const allHabitsCompleted = useMemo(() => {
    // Only consider my personal habits and shared habits
    const relevantHabits = [...myPersonalHabits, ...sharedHabits];

    // If there are no habits, we don't show celebration
    if (relevantHabits.length === 0) return false;

    // Check if all relevant habits are completed
    return relevantHabits.every(habit => habit.isCompletedToday);
  }, [myPersonalHabits, sharedHabits]);

  // Track previous completion state to detect changes
  const [prevCompletedCount, setPrevCompletedCount] = useState(0);
  
  // Get today's date for storage key
  const todayStorageKey = useMemo(() => {
    const today = new Date();
    return `celebration-shown-${today.toISOString().split('T')[0]}`;
  }, []);
  
  // Check if celebration was already shown today
  const [celebrationShownToday, setCelebrationShownToday] = useState(() => {
    return localStorage.getItem(todayStorageKey) === 'true';
  });
  
  // Effect to show confetti only when completing the last habit
  useEffect(() => {
    if (!relevantHabits.length) return;
    if (celebrationShownToday) return; // Skip if already shown today
    
    const currentCompletedCount = relevantHabits.filter(h => h.isCompletedToday).length;
    
    // Only show celebration when:
    // 1. All habits are now completed
    // 2. The completed count has increased (meaning we just completed a habit)
    // 3. We've completed the last remaining habit (current = total and previous < total)
    if (allHabitsCompleted && 
        currentCompletedCount > prevCompletedCount && 
        currentCompletedCount === relevantHabits.length && 
        prevCompletedCount < relevantHabits.length) {
      
      // Mark as shown today
      localStorage.setItem(todayStorageKey, 'true');
      setCelebrationShownToday(true);
      
      // Show the celebration
      setShowConfetti(true);
      
      // Hide confetti after 5 seconds
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
    
    // Update previous count for next comparison
    setPrevCompletedCount(currentCompletedCount);
  }, [allHabitsCompleted, relevantHabits, celebrationShownToday, todayStorageKey]);

  // Update window size for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mutations for completing/uncompleting habits
  const completeHabit = useCompleteHabit();
  const deleteCompletion = useDeleteCompletion();

  // Toggle habit completion
  const toggleHabit = (id, isCompleted, completionId) => {
    if (!id) return;
    if (isCompleted && completionId) {
      deleteCompletion.mutate({ completionId, habitId: id });
    } else if (!isCompleted) {
      completeHabit.mutate({ habitId: id });
    }
  };

  const handleNoteSubmit = () => {
    if (!noteContent.trim() || !partner) return;

    sendNoteMutation.mutate({ content: noteContent.trim() }, {
      onSuccess: () => {
        setNoteContent('');
        setShowNoteDialog(false);
      }
    });
  };

  // Helper to render partner name with loading/error states
  const renderPartnerName = () => {
    if (isLoadingPartner) {
      return <Skeleton className="h-0 w-8 rounded" />;
    }
    if (partnerError) {
      console.error("Partner fetching error:", partnerError);
      return <span className="text-red-500/80">Disconnected</span>;
    }
    if (partner) {
      return <span className="font-medium">{partner.name}</span>;
    }
    return <span className="text-couples-text/80">Not connected</span>;
  };

  return (
    <div className="app-container pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-couples-background pt-8 pb-4 px-4 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-medium">Together</h1>
            <Heart className="h-5 w-5 ml-2 text-couples-accent fill-couples-accent" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {partner && (
                <>
                  <div className="text-sm">
                    <span className="text-couples-text/70">with </span>
                    {renderPartnerName()}
                  </div>
                </>
              )}
            </div>
            {/* Note button in header */}
            <button
              onClick={() => setShowNoteDialog(true)}
              className="w-8 h-8 rounded-full bg-couples-accent flex items-center justify-center text-white shadow-sm hover:bg-couples-accent/90"
              disabled={!partner || isLoadingPartner}
              aria-label="Write a note"
              title="Write a note for your partner"
            >
              <PenLine className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Date display */}
        <p className="text-couples-text/70 text-sm flex items-center gap-1 mt-2">
          <CalendarDays className="h-3.5 w-3.5" />
          {todayFormatted}
        </p>
      </header>
      <main className="px-4">
        {showConfetti && (
          <>
            <div className="fixed inset-0 z-50 pointer-events-none">
              <Confetti
                width={windowSize.width}
                height={windowSize.height}
                recycle={false}
                numberOfPieces={200}
                gravity={0.2}
                colors={['#FF5E87', '#FF8DA1', '#FFC2D1', '#FFD6E0', '#FFE9EF']}
              />
            </div>
            <div className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white/90 rounded-lg p-4 shadow-lg border-2 border-couples-accent animate-bounce text-center">
              <h3 className="text-xl font-bold text-couples-accent mb-1">Amazing job! 🎉</h3>
              <p className="text-couples-text">You've completed all your habits for today!</p>
            </div>
          </>
        )}
        {/* --- Note Section --- */}
        {/* Show skeleton if core data is loading OR note specifically is loading */}
        {(isCoreLoading || isLoadingNote) ? (
          <div className="bg-white/50 p-4 rounded-md border border-gray-300 shadow-sm mb-6">
            <Skeleton className="h-4 w-3/4 rounded mb-3" />
            <Skeleton className="h-4 w-2/3 rounded mb-3" />
            <Skeleton className="h-4 w-1/3 ml-auto rounded" />
          </div>
        ) : noteError ? (
          // Error State for Note
          <div className="bg-red-100 p-4 rounded-md border border-red-300 shadow-sm mb-6 text-red-700">
            Error loading note: {noteError.message}
          </div>
        ) : latestPartnerNote ? (
          // Display Note
          <section className="mb-6">
            <EnhancedStickyNote
              content={latestPartnerNote.content}
              author={partnerNameForUI}
              hasNote={true}
            />
          </section>
        ) : (
          // Display Placeholder if no error and no note
          <div className="bg-white/50 p-4 rounded-md border border-dashed border-gray-300 shadow-sm mb-6 flex flex-col items-center justify-center py-3 text-gray-500">
            <p className="text-center text-sm">Notes from {partnerNameForUI} will appear here</p>
          </div>
        )}

        {/* --- Progress Bar & Habits Section --- */}
        {/* Show skeletons if core data is loading */}
        {isCoreLoading ? (
          <>
            {/* Progress Bar Skeleton */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
            {/* Habits List Skeleton */}
            <section>
              <div className="flex justify-between items-center mb-2">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
              <div className="flex flex-col gap-4 py-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-md p-3 border border-black/10 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-2/3 rounded mb-2" />
                        <div className="flex gap-2">
                          <Skeleton className="h-3 w-16 rounded" />
                          <Skeleton className="h-3 w-24 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : habitsError ? (
          // Habits Error State
          <div className="p-6 text-center text-red-500">
            <p className="mb-2">Failed to load habits</p>
            <p className="text-sm text-couples-text/70">{String(habitsError)}</p>
          </div>
        ) : (
          // Actual Habits Content (Progress Bar + List)
          <>
            {/* Progress Bar - Render only if relevant habits exist */}
            {relevantHabits.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium">
                    Daily Progress
                  </span>
                  <span className="text-sm text-couples-text/70">
                    {relevantHabits.filter(h => h.isCompletedToday).length} of {relevantHabits.length} completed
                  </span>
                </div>
                <div className="h-2.5 w-full bg-couples-backgroundAlt/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-couples-accent rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Today's Habits List */}
            <section>
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-medium">Today's Habits</h2>
                <button
                  onClick={() => navigate('/habits')}
                  className="text-sm text-couples-accent hover:underline"
                >
                  View All
                </button>
              </div>

              {todaysHabits.length === 0 ? (
                // Empty State for Habits
                <div className="py-12 px-4 text-center">
                  <h3 className="font-medium text-lg mb-2">No Habits for Today</h3>
                  <p className="text-couples-text/70 mb-6">
                    You don't have any habits scheduled for today. Add some habits to get started.
                  </p>
                  <Button asChild>
                    <Link to="/habits" className="flex items-center gap-2">
                      Go to Habits
                    </Link>
                  </Button>
                </div>
              ) : (
                // Render Habit Sections
                <div className="flex flex-col gap-6">
                  {/* 1. SHARED HABITS */}
                  {sharedHabits.length > 0 && (
                    <div className="rounded-lg bg-couples-backgroundAlt/10 p-4">
                      <h3 className="text-sm font-medium text-couples-accent mb-3 flex items-center">
                        <Heart className="h-3.5 w-3.5 mr-1 fill-couples-accent" />
                        Shared Habits
                      </h3>
                      <div className="flex flex-col gap-3">
                        {sharedHabits.map((habit) => (
                          <HabitItem
                            key={habit.id}
                            id={habit.id}
                            name={habit.name}
                            completed={habit.isCompletedToday}
                            isShared={true}
                            partnerCompleted={habit.partnerCompletedToday}
                            partnerName={partnerNameForUI}
                            onToggle={() => toggleHabit(habit.id, habit.isCompletedToday, habit.todaysCompletionId)}
                            frequency={habit.frequency}
                            frequencyDays={habit.frequency_days}
                            description={habit.description}
                            isTodayScheduled={true}
                            isDisabled={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. MY PERSONAL HABITS */}
                  {myPersonalHabits.length > 0 && (
                    <div className="rounded-lg bg-white p-4">
                      <h3 className="text-sm font-medium mb-3">
                        My Habits
                      </h3>
                      <div className="flex flex-col gap-3">
                        {myPersonalHabits.map((habit) => (
                          <HabitItem
                            key={habit.id}
                            id={habit.id}
                            name={habit.name}
                            completed={habit.isCompletedToday}
                            isShared={false}
                            onToggle={() => toggleHabit(habit.id, habit.isCompletedToday, habit.todaysCompletionId)}
                            frequency={habit.frequency}
                            frequencyDays={habit.frequency_days}
                            description={habit.description}
                            isTodayScheduled={true}
                            isDisabled={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. PARTNER'S VISIBLE HABITS */}
                  {partnerVisibleHabits.length > 0 && (
                    <div className="rounded-lg bg-white p-4">
                      <h3 className="text-sm font-medium mb-3">
                        {partnerNameForUI}'s Habits
                      </h3>
                      <div className="flex flex-col gap-3">
                        {partnerVisibleHabits.map((habit) => (
                          <HabitItem
                            key={habit.id}
                            id={habit.id}
                            name={habit.name}
                            completed={habit.partnerCompletedToday}
                            isShared={false}
                            onToggle={() => { }}
                            frequency={habit.frequency}
                            frequencyDays={habit.frequency_days}
                            description={habit.description}
                            isTodayScheduled={true}
                            isDisabled={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <BottomNav />

      {/* Write Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="w-[90vw] max-w-md rounded-lg p-6 sm:w-full">
          <DialogHeader>
            <DialogTitle>Write a note for {partnerNameForUI}</DialogTitle>
          </DialogHeader>
          <div className="bg-white p-4 rounded border border-gray-300 shadow-sm">
            <textarea
              className="w-full bg-transparent border-none resize-none outline-none text-gray-800"
              placeholder={`Write something sweet for ${partnerNameForUI}...`}
              rows={4}
              maxLength={100}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
            <div className="text-right text-sm text-couples-text/70">
              {noteContent.length}/100
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleNoteSubmit}
              className="bg-couples-accent hover:bg-couples-accent/90"
              disabled={!noteContent.trim()}
            >
              Send Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;