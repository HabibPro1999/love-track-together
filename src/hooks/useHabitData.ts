import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "./use-toast"; // Adjusted path
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { usePartnerData } from './usePartnerData'; // Import usePartnerData
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

// Type for combined Habit data including completion status for both users
export type HabitWithCompletion = Tables<'habits'> & {
    isCompletedToday: boolean;
    todaysCompletionId: string | null; // Current user's completion ID for today
    partnerCompletedToday: boolean;    // Partner's completion status for today
    partnerTodaysCompletionId: string | null; // Partner's completion ID for today
    frequency?: 'daily' | 'weekly';
    frequency_days?: string[];
    description?: string | null;
};

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

// --- Query Hooks ---

/**
 * Fetches habits visible to the current user.
 * Joins with habit_completions for BOTH user and partner to check completion status.
 */
export const useHabits = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth(); // Get current user
    // Get partner data AND loading state
    const { partner, isLoading: isLoadingPartner } = usePartnerData();

    const userId = user?.id;
    const partnerId = partner?.id;

    // Set up real-time subscriptions when the query mounts
    useEffect(() => {
        if (!userId) return;

        // Subscribe to habits changes
        const habitsSubscription = supabase
            .channel('habits-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'habits' },
                (payload) => {
                    // Refetch habits when any change occurs
                    queryClient.invalidateQueries({ 
                        queryKey: ['habits', getTodayDateString(), userId, partnerId]
                    });
                }
            )
            .subscribe();

        // Subscribe to habit completions changes
        const completionsSubscription = supabase
            .channel('completions-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'habit_completions' },
                (payload) => {
                    // Refetch habits when completions change
                    queryClient.invalidateQueries({
                        queryKey: ['habits', getTodayDateString(), userId, partnerId]
                    });
                }
            )
            .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
            habitsSubscription.unsubscribe();
            completionsSubscription.unsubscribe();
        };
    }, [userId, partnerId, queryClient]);

    return useQuery<HabitWithCompletion[], Error>({
        // Include userId and partnerId in queryKey to refetch if they change
        queryKey: ['habits', getTodayDateString(), userId, partnerId],
        queryFn: async () => {
            // User ID is checked by the enabled flag now
            if (!userId) return []; // Should not happen if enabled works correctly

            try {
                const today = getTodayDateString();

                // 1. Fetch habits accessible by the current user (RLS handles visibility)
                const { data: habitsData, error: habitsError } = await supabase
                    .from('habits')
                    .select('*');

                if (habitsError) {
                    console.error('Error fetching habits:', habitsError);
                    throw new Error('Failed to fetch habits.');
                }

                if (!habitsData || habitsData.length === 0) {
                    return []; // No habits found
                }

                const habitIds = habitsData.map(h => h.id);

                // 2. Fetch completions for these habits by *both* user and partner for *today*
                const userIdsToFetch = [userId]; // userId is guaranteed by enabled flag
                if (partnerId) {
                    userIdsToFetch.push(partnerId);
                }

                const { data: completionsData, error: completionsError } = await supabase
                    .from('habit_completions')
                    .select('id, habit_id, user_id')
                    .eq('completion_date', today)
                    .in('habit_id', habitIds)
                    .in('user_id', userIdsToFetch);

                if (completionsError) {
                    console.error('Error fetching habit completions:', completionsError);
                    // Gracefully degrade: return habits but mark all as incomplete
                    return habitsData.map(habit => ({
                        ...habit,
                        frequency: habit.frequency as 'daily' | 'weekly',
                        isCompletedToday: false,
                        todaysCompletionId: null,
                        partnerCompletedToday: false,
                        partnerTodaysCompletionId: null,
                    } as HabitWithCompletion));
                }

                // 3. Process completions into maps for easy lookup
                const userCompletionsMap = new Map<string, string>();
                const partnerCompletionsMap = new Map<string, string>();

                completionsData?.forEach(comp => {
                    if (comp.user_id === userId) {
                        userCompletionsMap.set(comp.habit_id, comp.id);
                    } else if (comp.user_id === partnerId) {
                        partnerCompletionsMap.set(comp.habit_id, comp.id);
                    }
                });

                // 4. Combine habit data with processed completion data
                const habitsWithCompletion: HabitWithCompletion[] = habitsData.map(habit => ({
                    ...habit,
                    frequency: habit.frequency as 'daily' | 'weekly',
                    isCompletedToday: userCompletionsMap.has(habit.id),
                    todaysCompletionId: userCompletionsMap.get(habit.id) || null,
                    partnerCompletedToday: partnerId ? partnerCompletionsMap.has(habit.id) : false,
                    partnerTodaysCompletionId: partnerId ? partnerCompletionsMap.get(habit.id) || null : null,
                } as HabitWithCompletion));

                return habitsWithCompletion;

            } catch (error) {
                console.error("Error in useHabits queryFn:", error);
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("An unknown error occurred while fetching habits.");
            }
        },
        // Only run the query if the userId exists AND partner loading is finished
        enabled: !!userId && !isLoadingPartner,
        // Consider adding staleTime or refetch intervals if needed
    });
};

// --- Mutation Hooks ---

/**
 * Mutation to mark a habit as completed for today (by the current user).
 */
export const useCompleteHabit = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth(); // Need user for optimistic update key
    const { partner } = usePartnerData(); // Need partner for optimistic update key

    return useMutation({
        mutationFn: async ({ habitId }: { habitId: string }) => {
            // User must be authenticated to complete
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error('User not authenticated.');

            const today = getTodayDateString();

            const { data, error } = await supabase
                .from('habit_completions')
                .insert({
                    habit_id: habitId,
                    user_id: currentUser.id,
                    completion_date: today,
                })
                .select('id')
                .single();

            if (error) {
                console.error('Error completing habit:', error);
                // Check for unique constraint violation (already completed)
                if (error.code === '23505') { // PostgreSQL unique violation code
                    // Optionally handle this silently or with a specific message
                    console.warn(`Habit ${habitId} already completed today.`);
                    // Attempt to fetch existing completion id? Might be overkill.
                    return { id: null, alreadyCompleted: true }; // Indicate it was already done
                }
                throw new Error(error.message || 'Failed to complete habit.');
            }
            return { ...data, alreadyCompleted: false };
        },
        onSuccess: (data, variables) => {
            // Only invalidate/update if it wasn't already completed
            if (!data?.alreadyCompleted) {
                const queryKey = ['habits', getTodayDateString(), user?.id, partner?.id];
                // Invalidate the habits query to refetch with the new completion status
                queryClient.invalidateQueries({ queryKey });

                // Optimistically update the cache immediately
                queryClient.setQueryData<HabitWithCompletion[]>(queryKey, (oldData) => {
                    return oldData?.map(habit =>
                        habit.id === variables.habitId
                            ? { ...habit, isCompletedToday: true, todaysCompletionId: data?.id || null }
                            : habit
                    );
                });
            }
            // toast({ title: "Habit completed!" }); // Maybe too noisy?
        },
        onError: (error) => {
            toast({
                title: "Error completing habit",
                description: error.message,
                variant: "destructive",
            });
        },
    });
};

/**
 * Mutation to delete a habit completion for today (by the current user).
 */
export const useDeleteCompletion = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth(); // Need user for optimistic update key
    const { partner } = usePartnerData(); // Need partner for optimistic update key


    return useMutation({
        // Parameters now include habitId needed for optimistic update
        mutationFn: async ({ completionId, habitId }: { completionId: string, habitId: string }) => {
            const { error } = await supabase
                .from('habit_completions')
                .delete()
                .eq('id', completionId);
            // We only allow deleting own completions via RLS implicitly

            if (error) {
                console.error('Error deleting completion:', error);
                throw new Error(error.message || 'Failed to un-complete habit.');
            }
            // Return habitId for optimistic update context
            return { habitId };
        },
        onSuccess: (data, variables) => {
            const queryKey = ['habits', getTodayDateString(), user?.id, partner?.id];
            // Invalidate the habits query to refetch
            queryClient.invalidateQueries({ queryKey });

            // Optimistically update the cache
            queryClient.setQueryData<HabitWithCompletion[]>(queryKey, (oldData) => {
                return oldData?.map(habit =>
                    // Use variables.habitId because mutationFn returns { habitId } now
                    habit.id === variables.habitId
                        ? { ...habit, isCompletedToday: false, todaysCompletionId: null }
                        : habit
                );
            });

            // toast({ title: "Habit un-marked." });
        },
        onError: (error) => {
            toast({
                title: "Error un-completing habit",
                description: error.message,
                variant: "destructive",
            });
        },
    });
};

/**
 * Mutation hook to create a new habit.
 */
export const useCreateHabit = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth(); // Need user for optimistic update key
    const { partner } = usePartnerData(); // Need partner for optimistic update key


    // Define the input type for the mutation, omitting user_id as it's added internally
    type CreateHabitInput = Omit<TablesInsert<'habits'>, 'user_id'>;

    return useMutation({
        mutationFn: async (newHabit: CreateHabitInput) => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error('User not authenticated.');

            // Ensure user_id is set, RLS handles couple_id permissions
            const habitToInsert = { ...newHabit, user_id: currentUser.id };

            const { data, error } = await supabase
                .from('habits')
                .insert(habitToInsert)
                .select()
                .single();

            if (error) {
                console.error('Error creating habit:', error);
                throw new Error(error.message || 'Failed to create habit.');
            }
            return data;
        },
        onSuccess: () => {
            const queryKey = ['habits', getTodayDateString(), user?.id, partner?.id];
            // Invalidate the habits query to refetch the list including the new habit
            queryClient.invalidateQueries({ queryKey });
            // Could also invalidate broader ['habits'] key if needed elsewhere
            toast({
                title: "Habit Added!",
                description: "Your new habit has been created.",
            });
        },
        onError: (error) => {
            toast({
                title: "Error Creating Habit",
                description: error.message || "Could not save the new habit.",
                variant: "destructive",
            });
        },
    });
};

// Define types for habit detail fetching
type HabitCompletionRecord = Pick<Tables<'habit_completions'>, 'user_id' | 'completion_date' | 'id'>;
export type HabitDetailData = Tables<'habits'> & {
    completions: HabitCompletionRecord[];
};

/**
 * Fetches details for a single habit, including all its completion records.
 * NOTE: This hook might need updating if detail view needs partner completion status too.
 */
export const useHabitDetail = (habitId: string | undefined) => {
    const queryClient = useQueryClient();
    const { user } = useAuth(); // Need user for optimistic update key
    const { partner } = usePartnerData(); // Need partner for optimistic update key

    // Set up real-time subscriptions for habit details
    useEffect(() => {
        if (!habitId) return;

        // Subscribe to habit changes
        const habitSubscription = supabase
            .channel('habit-detail-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'habits', filter: `id=eq.${habitId}` },
                (payload) => {
                    // Refetch habit details when the habit changes
                    queryClient.invalidateQueries({ 
                        queryKey: ['habits', 'detail', habitId]
                    });
                }
            )
            .subscribe();

        // Subscribe to habit completion changes
        const completionsSubscription = supabase
            .channel('habit-detail-completions')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'habit_completions', filter: `habit_id=eq.${habitId}` },
                (payload) => {
                    // Refetch habit details when completions change
                    queryClient.invalidateQueries({
                        queryKey: ['habits', 'detail', habitId]
                    });
                }
            )
            .subscribe();

        // Cleanup subscriptions
        return () => {
            habitSubscription.unsubscribe();
            completionsSubscription.unsubscribe();
        };
    }, [habitId, queryClient]);

    return useQuery<HabitDetailData | null, Error>({
        // Add user/partner to key if detail needs to react to their changes,
        // although typically habitId is enough unless RLS depends on user.
        queryKey: ['habits', 'detail', habitId],
        queryFn: async () => {
            if (!habitId) return null; // Skip if no ID

            try {
                // Fetch habit and *all* its completions
                const { data: habitData, error: habitError } = await supabase
                    .from('habits')
                    .select(`
                        *,
                        habit_completions ( id, user_id, completion_date )
                    `)
                    .eq('id', habitId)
                    .single(); // RLS should ensure user can access this habit

                if (habitError) {
                    if (habitError.code === 'PGRST116') { // Not found or RLS denied
                        console.warn(`Habit with ID ${habitId} not found or not accessible.`);
                        return null;
                    }
                    console.error('Error fetching habit detail:', habitError);
                    throw new Error(habitError.message || 'Failed to fetch habit details.');
                }

                // Ensure completions is an array
                return {
                    ...habitData,
                    completions: habitData.habit_completions || []
                };
            } catch (error) {
                console.error('Error in useHabitDetail query:', error);
                // Return null on error to prevent breaking UI, error is handled by useQuery status
                return null;
            }
        },
        enabled: !!habitId, // Only run query if habitId is available
        // Consider retry: false if not found shouldn't be retried
        // staleTime might be useful here too
    });
};


/**
 * Mutation hook to update a habit.
 */
export const useUpdateHabit = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth(); // Need user for query invalidation key
    const { partner } = usePartnerData(); // Need partner for query invalidation key

    // Type for the update payload - extended
    type UpdateHabitInput = {
        id: string;
    } & Partial<Pick<TablesUpdate<'habits'>,
        'name' |
        'is_private' |
        'description' |
        'frequency' |
        'frequency_days'
    >>;

    return useMutation({
        mutationFn: async ({ id, ...updateData }: UpdateHabitInput) => {
            // RLS ensures user can only update their own habits
            const { data, error } = await supabase
                .from('habits')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating habit:', error);
                throw new Error(error.message || 'Failed to update habit.');
            }
            return data;
        },
        onSuccess: (data, variables) => {
            const listQueryKey = ['habits', getTodayDateString(), user?.id, partner?.id];
            const detailQueryKey = ['habits', 'detail', variables.id];

            // Invalidate relevant queries to refetch data
            queryClient.invalidateQueries({ queryKey: detailQueryKey });
            queryClient.invalidateQueries({ queryKey: listQueryKey });

            // Optional: Optimistically update caches if needed for smoother UX
            // queryClient.setQueryData(detailQueryKey, oldData => ({...oldData, ...data}));
            // queryClient.setQueryData<HabitWithCompletion[]>(listQueryKey, oldList => ...);

            toast({
                title: "Habit Updated",
                description: "Your habit details have been saved.",
            });
        },
        onError: (error) => {
            toast({
                title: "Error Updating Habit",
                description: error.message || "Could not save changes.",
                variant: "destructive",
            });
        },
    });
};

/**
 * Mutation hook to delete a habit.
 */
export const useDeleteHabit = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth(); // Need user for query invalidation key
    const { partner } = usePartnerData(); // Need partner for query invalidation key

    return useMutation({
        mutationFn: async (habitId: string) => {
            // RLS ensures user can only delete their own habits
            const { error } = await supabase
                .from('habits')
                .delete()
                .eq('id', habitId);

            if (error) {
                console.error('Error deleting habit:', error);
                throw new Error(error.message || 'Failed to delete habit.');
            }
            return habitId; // Return ID for potential use in onSuccess
        },
        onSuccess: (habitId) => {
            const listQueryKey = ['habits', getTodayDateString(), user?.id, partner?.id];
            const detailQueryKey = ['habits', 'detail', habitId];

            // Invalidate list query after deletion
            queryClient.invalidateQueries({ queryKey: listQueryKey });
            // Remove the specific detail query from cache as it no longer exists
            queryClient.removeQueries({ queryKey: detailQueryKey });

            toast({
                title: "Habit Deleted",
                description: "The habit has been successfully deleted.",
            });
        },
        onError: (error) => {
            toast({
                title: "Error Deleting Habit",
                description: error.message || "Could not delete the habit.",
                variant: "destructive",
            });
        },
    });
};
