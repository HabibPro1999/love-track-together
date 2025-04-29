import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Calendar, Edit2, EyeOff, Trash2, Loader2, AlertCircle, Info, Clock } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/AuthContext';
import {
  useHabitDetail,
  useUpdateHabit,
  useDeleteHabit,
  HabitDetailData
} from '@/hooks/useHabitData';
import { usePartnerData } from '@/hooks/usePartnerData';
import { useToast } from '@/hooks/use-toast';

// Days of week constant for dialogs
const DAYS_OF_WEEK = [
  { label: 'Mon', value: 'monday' },
  { label: 'Tue', value: 'tuesday' },
  { label: 'Wed', value: 'wednesday' },
  { label: 'Thu', value: 'thursday' },
  { label: 'Fri', value: 'friday' },
  { label: 'Sat', value: 'saturday' },
  { label: 'Sun', value: 'sunday' }
];

const HabitDetail = () => {
  const { id: habitId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch habit details
  const {
    data: habit,
    isLoading: isLoadingHabit,
    error: habitError,
  } = useHabitDetail(habitId);

  // Fetch partner data (needed if habit is shared)
  const { partner, isLoading: isLoadingPartner } = usePartnerData();

  // Mutations
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();

  // Dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Edit form state - Extended
  const [editHabitName, setEditHabitName] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editFrequencyType, setEditFrequencyType] = useState('daily');
  const [editSelectedDays, setEditSelectedDays] = useState<string[]>([]);

  // Effect to initialize edit form state when habit data loads or changes
  useEffect(() => {
    if (habit) {
      setEditHabitName(habit.name || '');
      setEditIsPrivate(habit.is_private || false);
      setEditDescription(habit.description || '');
      setEditFrequencyType(habit.frequency || 'daily');
      setEditSelectedDays(habit.frequency_days || []);
    }
  }, [habit]);

  // --- Derived Data & Logic (MOVED UP) ---
  const isShared = useMemo(() => habit?.couple_id !== null, [habit]);
  const isPersonal = useMemo(() => habit?.couple_id === null, [habit]);
  const isOwner = useMemo(() => habit?.user_id === user?.id, [habit, user]);
  const partnerName = useMemo(() => partner?.name || 'Partner', [partner]);

  const today = useMemo(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }, []);

  const { userCompletions, partnerCompletions, bothCompletions, allDates, missedDays } = useMemo(() => {
    // This logic needs to handle habit being potentially null initially
    if (!habit || !user) {
      return {
        userCompletions: [],
        partnerCompletions: [],
        bothCompletions: [],
        allDates: new Set<string>(),
        missedDays: []
      };
    }
    const completionsMap = new Map<string, { user: boolean, partner: boolean }>();
    const allDatesSet = new Set<string>();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      allDatesSet.add(dateStr);
      completionsMap.set(dateStr, { user: false, partner: false });
    }
    habit.completions.forEach(comp => {
      const dateStr = comp.completion_date;
      allDatesSet.add(dateStr);
      const entry = completionsMap.get(dateStr) || { user: false, partner: false };
      if (comp.user_id === user.id) entry.user = true;
      if (isShared && partner && comp.user_id === partner.id) entry.partner = true;
      completionsMap.set(dateStr, entry);
    });
    const userDates: Date[] = [], partnerDates: Date[] = [], bothDates: Date[] = [], missedDaysArr: Date[] = [];
    completionsMap.forEach((status, dateStr) => {
      const date = new Date(dateStr + 'T00:00:00');
      const isPastDate = date < new Date(today + 'T00:00:00');
      if (status.user && status.partner) bothDates.push(date);
      else if (status.user) userDates.push(date);
      else if (status.partner) partnerDates.push(date);
      else if (isPastDate) missedDaysArr.push(date);
    });
    return {
      userCompletions: userDates,
      partnerCompletions: partnerDates,
      bothCompletions: bothDates,
      allDates: allDatesSet,
      missedDays: missedDaysArr
    };
  }, [habit, user, partner, isShared, today]);

  const calculateStreak = (dates: Date[]): number => {
    if (!dates.length) return 0;
    const sortedDates = dates.map(d => d.getTime()).sort((a, b) => b - a);
    let streak = 0;
    let expectedDate = new Date();
    expectedDate.setHours(0, 0, 0, 0);
    for (const timestamp of sortedDates) {
      const currentDate = new Date(timestamp);
      currentDate.setHours(0, 0, 0, 0);
      if (currentDate.getTime() === expectedDate.getTime()) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else if (currentDate.getTime() < expectedDate.getTime()) {
        break;
      }
    }
    return streak;
  };

  const userStreak = useMemo(() => calculateStreak(userCompletions.concat(bothCompletions)), [userCompletions, bothCompletions]);
  const jointStreak = useMemo(() => calculateStreak(bothCompletions), [bothCompletions]);

  const frequencyText = useMemo(() => {
    if (!habit || !habit.frequency) return 'Daily';
    if (habit.frequency === 'daily') return 'Daily';
    if (habit.frequency === 'weekly') {
      if (!habit.frequency_days || habit.frequency_days.length === 0) return 'Weekly (No days set)';
      if (habit.frequency_days.length === 7) return 'Daily';
      const dayMap: Record<string, string> = {
        'monday': 'Mon', 'tuesday': 'Tue', 'wednesday': 'Wed', 'thursday': 'Thu', 'friday': 'Fri', 'saturday': 'Sat', 'sunday': 'Sun'
      };
      const sortedDays = [...habit.frequency_days].sort((a, b) => DAYS_OF_WEEK.findIndex(d => d.value === a) - DAYS_OF_WEEK.findIndex(d => d.value === b));
      return `Weekly: ${sortedDays.map(day => dayMap[day] || day).join(', ')}`;
    }
    return 'Daily'; // Default
  }, [habit]);

  // --- Early Returns (Now AFTER all hooks) ---
  if (isLoadingHabit || (isShared && isLoadingPartner)) {
    return (
      <div className="app-container pb-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-couples-accent" />
      </div>
    );
  }

  if (habitError) {
    return (
      <div className="app-container p-4">
        <header className="sticky top-0 bg-couples-background pt-8 pb-4">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-medium text-red-600">Error</h1>
          </div>
        </header>
        <div className="mt-8 text-center text-red-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <p>Could not load habit details.</p>
          <p className="text-sm text-couples-text/70">{String(habitError)}</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-6">
            Go Back
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="app-container p-4">
        <header className="sticky top-0 bg-couples-background pt-8 pb-4">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-medium">Habit Not Found</h1>
          </div>
        </header>
        <div className="mt-8 text-center">
          <p>This habit could not be found or you may not have permission to view it.</p>
          <Button onClick={() => navigate('/habits')} className="mt-4">
            Go to All Habits
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // --- Handlers ---
  const handleGoBack = () => {
    navigate(-1);
  };

  const handleEditDayToggle = (day: string) => {
    setEditSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleEditSubmit = () => {
    if (!habit) return;
    if (!editHabitName.trim()) {
      toast({ title: "Name required", description: "Habit name cannot be empty.", variant: "destructive" });
      return;
    }
    if (editFrequencyType === 'weekly' && editSelectedDays.length === 0) {
      toast({
        title: "Days selection required",
        description: "Please select at least one day of the week for weekly habits.",
        variant: "destructive"
      });
      return;
    }
    const updatePayload: any = {};
    if (editHabitName.trim() !== habit.name) {
      updatePayload.name = editHabitName.trim();
    }
    if (isPersonal && editIsPrivate !== habit.is_private) {
      updatePayload.is_private = editIsPrivate;
    }
    if (editDescription.trim() !== (habit.description || '')) {
      updatePayload.description = editDescription.trim() || null;
    }
    if (editFrequencyType !== habit.frequency) {
      updatePayload.frequency = editFrequencyType;
    }
    if (editFrequencyType === 'weekly' && JSON.stringify(editSelectedDays.sort()) !== JSON.stringify((habit.frequency_days || []).sort())) {
      updatePayload.frequency_days = editSelectedDays;
    } else if (editFrequencyType === 'daily' && habit.frequency_days !== null) {
      updatePayload.frequency_days = null;
    }
    if (Object.keys(updatePayload).length > 0) {
      updateHabit.mutate({ id: habit.id, ...updatePayload }, {
        onSuccess: () => { setShowEditDialog(false); }
      });
    } else {
      setShowEditDialog(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (!habit) return;
    deleteHabit.mutate(habit.id, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        navigate('/habits', { replace: true });
      }
    });
  };

  // --- Main Render Logic (Now guaranteed to run after hooks) ---
  return (
    <div className="app-container pb-20">
      <header className="sticky top-0 bg-couples-background pt-8 pb-4 px-4 z-10">
        <div className="flex items-center">
          <button onClick={handleGoBack} className="mr-2 p-1 rounded-full hover:bg-couples-backgroundAlt">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-medium truncate mr-2">{habit.name}</h1>
          {isPersonal && habit.is_private && (
            <EyeOff className="h-4 w-4 ml-auto text-couples-text/50 flex-shrink-0" />
          )}
        </div>
      </header>

      <main className="px-4 mt-4">
        <section className="bg-white rounded-xl shadow-md p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-5 w-5 text-couples-accent fill-couples-accent" />
            {isShared ? (
              <h2 className="text-lg font-medium">Joint Streak: {jointStreak} days</h2>
            ) : (
              <h2 className="text-lg font-medium">Current Streak: {userStreak} days</h2>
            )}
          </div>

          {isShared && (
            <div className="text-sm text-couples-text/80 mt-2 space-y-1">
              <p>You've completed this {userCompletions.length + bothCompletions.length} times</p>
              <p>{partnerName} has completed this {partnerCompletions.length + bothCompletions.length} times</p>
              {jointStreak > 0 && (
                <p className="text-couples-accent font-medium mt-1">
                  You both kept this up for {jointStreak} consecutive days!
                </p>
              )}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-md p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-couples-text/70" />
            <h3 className="font-medium">Frequency: {frequencyText}</h3>
          </div>
          {habit.description && (
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-couples-text/70 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-couples-text/90 whitespace-pre-wrap">{habit.description}</p>
            </div>
          )}
          {!habit.description && (
            <p className="text-sm text-couples-text/60 italic pl-7">No description provided.</p>
          )}
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <h2 className="font-medium">Completion History</h2>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 sm:p-6">
              <CalendarUI
                mode="multiple"
                className="w-full max-w-none"
                classNames={{
                  day_selected: "", // Override default so we can use our own custom styles
                  day_today: "border-2 border-couples-accent",
                  day: "text-center flex items-center justify-center rounded-full w-9 h-9",
                  cell: "p-0 h-10 w-10 flex items-center justify-center",
                  row: "flex w-full justify-center my-1",
                  head_row: "flex w-full justify-center",
                  head_cell: "text-couples-text/60 w-10 text-center",
                  table: "w-full",
                  month: "w-full"
                }}
                modifiers={{
                  user: userCompletions,
                  partner: partnerCompletions,
                  both: bothCompletions,
                  missed: missedDays
                }}
                modifiersClassNames={{
                  user: "!bg-couples-accent !text-white shadow-sm",
                  partner: "!bg-gradient-to-br !from-couples-accent/70 !to-couples-accent/30 !text-white",
                  both: "!bg-couples-accent !text-white font-bold shadow-md",
                  missed: "!bg-gray-100 !text-gray-400 border-dashed border border-gray-200"
                }}
                disabled={(date) => {
                  // Only enable dates that fall within the completion record period
                  const dateStr = date.toISOString().split('T')[0];
                  return !allDates.has(dateStr);
                }}
              />
            </div>

            <div className="border-t border-couples-backgroundAlt px-6 py-4">
              <h3 className="text-sm font-medium mb-3 text-couples-text/90">Legend:</h3>
              <div className="grid grid-cols-2 gap-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full border-2 border-couples-accent flex items-center justify-center"></div>
                  <span className="text-sm text-couples-text/80">Today</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-couples-accent shadow-sm flex items-center justify-center"></div>
                  <span className="text-sm text-couples-text/80">Completed</span>
                </div>

                {isShared && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-couples-accent/70 to-couples-accent/30 flex items-center justify-center"></div>
                      <span className="text-sm text-couples-text/80">{partnerName} only</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-couples-accent shadow-md flex items-center justify-center text-[10px] text-white font-bold">
                        <span>2</span>
                      </div>
                      <span className="text-sm text-couples-text/80">Both completed</span>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-gray-100 border-dashed border border-gray-200 flex items-center justify-center"></div>
                  <span className="text-sm text-couples-text/80">Missed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {isOwner && (
          <section className="p-4 border-t border-couples-backgroundAlt">
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(true)}
                className="flex items-center justify-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit</span>
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            </div>
          </section>
        )}
      </main>

      <BottomNav />

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[90vw] max-w-md rounded-lg p-6 sm:w-full [&>button[aria-label='Close']]:hidden">
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
            <DialogDescription>Update habit details and frequency.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="edit-name">Habit Name</Label>
              <Input
                id="edit-name"
                value={editHabitName}
                onChange={(e) => setEditHabitName(e.target.value)}
                disabled={updateHabit.isPending}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description <span className="text-couples-text/50">(optional)</span></Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add details about your habit..."
                className="resize-none mt-1"
                disabled={updateHabit.isPending}
                rows={3}
              />
            </div>

            <div>
              <Label className="block mb-2">Frequency</Label>
              <RadioGroup
                value={editFrequencyType}
                onValueChange={(value) => setEditFrequencyType(value)}
                className="space-y-3"
                disabled={updateHabit.isPending}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="edit-daily" />
                  <Label htmlFor="edit-daily">Daily</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="edit-weekly" />
                  <Label htmlFor="edit-weekly">Specific days</Label>
                </div>
              </RadioGroup>

              {editFrequencyType === 'weekly' && (
                <div className="mt-3">
                  <div className="flex justify-center gap-2 py-2 flex-wrap">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleEditDayToggle(day.value)}
                        className={`
                          flex items-center justify-center h-10 w-10 rounded-full text-sm font-medium transition-colors mb-1
                          ${editSelectedDays.includes(day.value)
                            ? 'bg-couples-accent text-white shadow-md ring-2 ring-couples-accent/20'
                            : 'bg-couples-backgroundAlt/50 text-couples-text/80 hover:bg-couples-backgroundAlt/80'}
                        `}
                        disabled={updateHabit.isPending}
                        aria-pressed={editSelectedDays.includes(day.value)}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isPersonal && (
              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="edit-private" className="cursor-pointer">
                  <span className="font-medium">Private Habit</span>
                  <p className="text-sm text-couples-text/70">
                    {editIsPrivate ? 'Only visible to you.' : 'Visible to your partner.'}
                  </p>
                </Label>
                <Switch
                  id="edit-private"
                  checked={editIsPrivate}
                  onCheckedChange={setEditIsPrivate}
                  disabled={updateHabit.isPending}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={handleEditSubmit}
              className="bg-couples-accent hover:bg-couples-accent/90 w-full sm:w-auto"
              disabled={updateHabit.isPending ||
                !editHabitName.trim() ||
                (editFrequencyType === 'weekly' && editSelectedDays.length === 0)}
            >
              {updateHabit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {updateHabit.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[90vw] max-w-md rounded-lg p-6 sm:w-full [&>button[aria-label='Close']]:hidden">
          <DialogHeader>
            <DialogTitle>Delete Habit</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{habit?.name}"? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className='pt-4'>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteHabit.isPending}
              className="sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              variant="destructive"
              disabled={deleteHabit.isPending}
              className="w-full sm:w-auto"
            >
              {deleteHabit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteHabit.isPending ? 'Deleting...' : 'Delete Habit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HabitDetail;
