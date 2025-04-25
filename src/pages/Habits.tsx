import React, { useState, useMemo } from 'react';
import { Plus, Loader2, Info, CalendarDays } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import HabitItem from '../components/HabitItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePartnerData } from '@/hooks/usePartnerData';
import { useAuth } from '@/contexts/AuthContext';
import {
  useHabits,
  useCompleteHabit,
  useDeleteCompletion,
  useCreateHabit,
  HabitWithCompletion
} from '@/hooks/useHabitData';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from "@/components/ui/skeleton";

// Define habit type for the dialog form state
type NewHabitType = 'personal' | 'shared';
type FrequencyType = 'daily' | 'weekly';
type ActiveHabitTab = 'personal' | 'partner' | 'shared';

// Define days of the week
const DAYS_OF_WEEK = [
  { label: 'Mon', value: 'monday' },
  { label: 'Tue', value: 'tuesday' },
  { label: 'Wed', value: 'wednesday' },
  { label: 'Thu', value: 'thursday' },
  { label: 'Fri', value: 'friday' },
  { label: 'Sat', value: 'saturday' },
  { label: 'Sun', value: 'sunday' }
];

const Habits = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch partner data
  const { partner, isLoading: isLoadingPartner, error: partnerError } = usePartnerData();

  // Fetch habits data
  const {
    data: habitsData,
    isLoading: isLoadingHabits,
    error: habitsError
  } = useHabits();

  // Mutations
  const completeHabit = useCompleteHabit();
  const deleteCompletion = useDeleteCompletion();
  const createHabit = useCreateHabit();

  // Get today's day name ONCE
  const todayDayName = useMemo(() => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[new Date().getDay()];
  }, []);

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState<NewHabitType>('personal');
  const [newHabitPrivate, setNewHabitPrivate] = useState(false);
  const [newHabitDescription, setNewHabitDescription] = useState('');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveHabitTab>('personal');
  // Default selected day filter to today's actual day name
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>(todayDayName);

  // Simplified toggle function
  const toggleHabit = (id: string, isCompleted: boolean, completionId: string | null) => {
    if (!id) return;
    if (isCompleted && completionId) {
      deleteCompletion.mutate({ completionId, habitId: id });
    } else if (!isCompleted) {
      completeHabit.mutate({ habitId: id });
    }
  };

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) {
      toast({
        title: "Habit name required",
        description: "Please enter a name for your habit.",
        variant: "destructive"
      });
      return;
    }
    if (newHabitType === 'shared' && !partner?.couple_id) {
      toast({
        title: "Cannot add shared habit",
        description: "You need to be connected with a partner to add shared habits.",
        variant: "destructive"
      });
      return;
    }
    if (frequencyType === 'weekly' && selectedDays.length === 0) {
      toast({
        title: "Days selection required",
        description: "Please select at least one day of the week.",
        variant: "destructive"
      });
      return;
    }
    const habitPayload = {
      name: newHabitName.trim(),
      couple_id: newHabitType === 'shared' ? partner?.couple_id : null,
      is_private: newHabitType === 'personal' ? newHabitPrivate : false,
      description: newHabitDescription.trim() || null,
      frequency: frequencyType,
      frequency_days: frequencyType === 'weekly' ? selectedDays : null,
    };
    createHabit.mutate(habitPayload, { onSuccess: () => { resetForm(); setShowAddDialog(false); } });
  };

  const resetForm = () => {
    setNewHabitName('');
    setNewHabitType('personal');
    setNewHabitPrivate(false);
    setNewHabitDescription('');
    setFrequencyType('daily');
    setSelectedDays([]);
  };

  const handleDialogChange = (open: boolean) => {
    setShowAddDialog(open);
    if (!open) resetForm();
  };

  const partnerNameForUI = useMemo(() => {
    if (isLoadingPartner) return 'Partner';
    if (partnerError) return 'Partner';
    return partner?.name || 'Partner';
  }, [partner, isLoadingPartner, partnerError]);

  // Update habit filtering logic
  const filteredHabits = useMemo(() => {
    if (!habitsData || !user) return [];
    return habitsData.filter(habit => {
      // 1. Filter by Active Tab
      let meetsTabCriteria = false;
      if (activeTab === 'personal') { meetsTabCriteria = habit.user_id === user.id && habit.couple_id === null; }
      else if (activeTab === 'partner') { meetsTabCriteria = habit.user_id === partner?.id && habit.couple_id === null && !habit.is_private; }
      else if (activeTab === 'shared') { meetsTabCriteria = habit.couple_id !== null; }
      if (!meetsTabCriteria) return false;

      // 2. Filter by Selected Day Schedule
      const isScheduledForSelectedDay = () => {
        if (selectedDayFilter === 'all') return true; // Always show if 'All Days' is selected
        if (habit.frequency === 'daily') return true; // Daily habits are always scheduled
        if (habit.frequency === 'weekly' && Array.isArray(habit.frequency_days)) {
          // Check if the selected day filter (e.g., 'monday') is in the habit's frequency days
          return habit.frequency_days.includes(selectedDayFilter);
        }
        return false; // Not scheduled if not daily or weekly with matching day
      };
      return isScheduledForSelectedDay();
    });
  }, [habitsData, activeTab, selectedDayFilter, user, partner?.id]);

  return (
    <div className="app-container pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-couples-background pt-8 pb-4 px-4 z-10">
        <h1 className="text-2xl font-medium mb-4">Habits</h1>

        {/* Update Tab Order and Logic */}
        <div className="flex border-b border-couples-backgroundAlt">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-2 text-center transition-colors ${activeTab === 'personal'
              ? 'text-couples-accent border-b-2 border-couples-accent'
              : 'text-couples-text/70 hover:text-couples-text'
              }`}
          >
            My Habits
          </button>
          <button
            onClick={() => setActiveTab('partner')}
            disabled={!partner?.id}
            className={`flex-1 py-2 text-center transition-colors ${activeTab === 'partner'
              ? 'text-couples-accent border-b-2 border-couples-accent'
              : 'text-couples-text/70 hover:text-couples-text'
              } ${!partner?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {partnerNameForUI}'s
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            disabled={!partner?.couple_id}
            className={`flex-1 py-2 text-center transition-colors ${activeTab === 'shared'
              ? 'text-couples-accent border-b-2 border-couples-accent'
              : 'text-couples-text/70 hover:text-couples-text'
              } ${!partner?.couple_id ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {partner?.couple_id ? 'Our Habits' : 'Shared'}
          </button>
        </div>

        {/* Day of week filter - Update Today Styling */}
        <div className="mt-3 overflow-x-auto pb-2">
          <div className="flex space-x-2">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day.value}
                onClick={() => setSelectedDayFilter(day.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors
                ${selectedDayFilter === day.value
                    ? 'bg-couples-accent text-white'
                    : 'bg-couples-backgroundAlt/60 text-couples-text/80 hover:bg-couples-backgroundAlt'
                  }
                `}
              >
                {day.label} {day.value === todayDayName && '(Today)'}
              </button>
            ))}
            <button
              key="all"
              onClick={() => setSelectedDayFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors
              ${selectedDayFilter === 'all'
                  ? 'bg-couples-accent text-white'
                  : 'bg-couples-backgroundAlt/60 text-couples-text/80 hover:bg-couples-backgroundAlt'
                }
              `}
            >
              All Days
            </button>
          </div>
        </div>
      </header>

      <main className="px-4">
        <div className="rounded-lg overflow-hidden">
          {isLoadingHabits ? (
            <div className="p-8 flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-md p-3 shadow-md">
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
          ) : habitsError ? (
            <div className="p-8 text-center text-red-500">
              <p>Error loading habits</p>
              <p className="text-sm text-couples-text/70">{String(habitsError)}</p>
            </div>
          ) : filteredHabits.length > 0 ? (
            <div className="flex flex-col gap-4 py-8">
              {filteredHabits.map((habit: HabitWithCompletion) => {
                // Is the currently selected day filter today?
                const isFilterToday = selectedDayFilter === todayDayName;

                // Determine completion status ONLY if the selected filter IS today
                const displayCompleted = isFilterToday && (activeTab === 'partner' ? habit.partnerCompletedToday : habit.isCompletedToday);

                // Allow toggling only if the selected filter IS today AND it's not the partner tab
                const canToggle = isFilterToday && activeTab !== 'partner';

                // Get the correct completion ID based on the active tab (needed for deletion)
                const completionIdToUse = activeTab === 'partner' ? habit.partnerTodaysCompletionId : habit.todaysCompletionId;

                // Determine if the current habit *is scheduled* for today (regardless of filter) for visual cues
                const isHabitActuallyScheduledToday = habit.frequency === 'daily' || (habit.frequency === 'weekly' && habit.frequency_days?.includes(todayDayName));

                return (
                  <HabitItem
                    key={habit.id}
                    id={habit.id}
                    name={habit.name}
                    completed={displayCompleted}
                    isShared={habit.couple_id !== null}
                    partnerCompleted={habit.partnerCompletedToday}
                    partnerName={habit.couple_id !== null ? partnerNameForUI : undefined}
                    onToggle={() => toggleHabit(habit.id, displayCompleted, completionIdToUse)}
                    frequency={habit.frequency || 'daily'}
                    frequencyDays={habit.frequency_days}
                    description={habit.description}
                    isTodayScheduled={isHabitActuallyScheduledToday}
                    isDisabled={!canToggle}
                  />
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-couples-text/70">
              {selectedDayFilter !== 'all' ? (
                <>No {activeTab === 'personal' ? 'personal' : activeTab === 'partner' ? partnerNameForUI + "'s" : activeTab === 'shared' ? 'shared' : ''} habits scheduled for {DAYS_OF_WEEK.find(d => d.value === selectedDayFilter)?.label || selectedDayFilter}.</>
              ) : (
                <>No {activeTab === 'personal' ? 'personal' : activeTab === 'partner' ? partnerNameForUI + "'s" : activeTab === 'shared' ? 'shared' : ''} habits found. Add one to get started!</>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAddDialog(true)}
          className="button-primary fixed bottom-20 right-4 flex items-center gap-2 shadow-md"
        >
          <Plus className="h-5 w-5" />
          <span>New Habit</span>
        </button>
      </main>

      <BottomNav />

      {/* Add Habit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={handleDialogChange}>
        <DialogContent className="w-[90vw] max-w-md rounded-lg p-6 sm:w-full [&>button[aria-label='Close']]:hidden">
          <DialogHeader>
            <DialogTitle>Add New Habit</DialogTitle>
            <DialogDescription>
              Create a personal habit or one shared with {partnerNameForUI}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Habit Name */}
            <div>
              <Label htmlFor="habit-name" className="block mb-2">Habit Name</Label>
              <Input
                id="habit-name"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="e.g., Morning Workout"
                disabled={createHabit.isPending}
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="habit-description">Description <span className="text-couples-text/50">(optional)</span></Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-couples-text/50" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-[200px] text-xs">
                        Add details about your habit to help you remember what it involves.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                id="habit-description"
                value={newHabitDescription}
                onChange={(e) => setNewHabitDescription(e.target.value)}
                placeholder="Add details about your habit..."
                className="resize-none"
                disabled={createHabit.isPending}
              />
            </div>

            {/* Frequency Selection */}
            <div>
              <Label className="block mb-2">Frequency</Label>
              <RadioGroup
                value={frequencyType}
                onValueChange={(value: FrequencyType) => setFrequencyType(value)}
                className="space-y-3"
                disabled={createHabit.isPending}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="daily" />
                  <Label htmlFor="daily">Daily</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly">Specific days</Label>
                </div>
              </RadioGroup>

              {frequencyType === 'weekly' && (
                <div className="mt-3">
                  <div className="flex justify-center gap-2 py-2">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleDayToggle(day.value)}
                        className={`
                          flex items-center justify-center h-10 w-10 rounded-full text-sm font-medium transition-colors
                          ${selectedDays.includes(day.value)
                            ? 'bg-couples-accent text-white shadow-md ring-2 ring-couples-accent/20'
                            : 'bg-couples-backgroundAlt/50 text-couples-text/80 hover:bg-couples-backgroundAlt/80'}
                        `}
                        disabled={createHabit.isPending}
                        aria-pressed={selectedDays.includes(day.value)}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Habit Type */}
            <div>
              <Label className="block mb-2">Type</Label>
              <RadioGroup
                value={newHabitType}
                onValueChange={(value: NewHabitType) => setNewHabitType(value)}
                className="flex space-x-4"
                disabled={createHabit.isPending}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal" id="personal" />
                  <Label htmlFor="personal">Personal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="shared"
                    id="shared"
                    disabled={!partner?.couple_id}
                  />
                  <Label htmlFor="shared" className={!partner?.couple_id ? 'text-couples-text/50' : ''}>
                    Shared with {partnerNameForUI}
                  </Label>
                </div>
              </RadioGroup>
              {!partner?.couple_id && newHabitType === 'shared' && (
                <p className="text-xs text-red-500 mt-1">Connect with a partner to add shared habits.</p>
              )}
            </div>

            {/* Privacy Setting */}
            {newHabitType === 'personal' && (
              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label htmlFor="private-mode" className="block">Private Habit</Label>
                  <p className="text-sm text-couples-text/70">Only visible to you</p>
                </div>
                <Switch
                  id="private-mode"
                  checked={newHabitPrivate}
                  onCheckedChange={setNewHabitPrivate}
                  disabled={createHabit.isPending}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={handleAddHabit}
              className="bg-couples-accent hover:bg-couples-accent/90 w-full sm:w-auto"
              disabled={!newHabitName.trim() || createHabit.isPending ||
                (newHabitType === 'shared' && !partner?.couple_id) ||
                (frequencyType === 'weekly' && selectedDays.length === 0)}
            >
              {createHabit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {createHabit.isPending ? 'Adding...' : 'Add Habit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Habits;
