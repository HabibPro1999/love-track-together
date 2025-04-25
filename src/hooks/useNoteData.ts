import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "./use-toast";
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { usePartnerData } from './usePartnerData'; // To get partner info

// Type for Note data
export type Note = Tables<'notes'>;

// --- Query Hooks ---

/**
 * Fetches the latest note received from the partner.
 */
export const usePartnerNote = () => {
    const { partner } = usePartnerData(); // Get partner data

    return useQuery<Note | null, Error>({
        queryKey: ['notes', 'latestReceived', partner?.id], // Include partner ID in key
        queryFn: async () => {
            // 1. Get current user ID
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('usePartnerNote: User not authenticated.');
                // Return null instead of throwing, as this might be expected state initially
                return null;
            }
            const userId = user.id;

            // 2. If no partner, no note to fetch
            if (!partner?.id) {
                // console.log('usePartnerNote: No partner found.');
                return null;
            }
            const partnerId = partner.id;

            // 3. Fetch the latest note sent by the partner to the current user
            const { data: noteData, error: noteError } = await supabase
                .from('notes')
                .select('*')
                .eq('receiver_user_id', userId)
                .eq('sender_user_id', partnerId)
                .order('created_at', { ascending: false }) // Get the latest first
                .limit(1) // We only need the most recent one
                .maybeSingle(); // Returns data as object or null, doesn't error if no rows

            if (noteError) {
                console.error('Error fetching partner note:', noteError);
                throw new Error(noteError.message || 'Failed to fetch partner note.');
            }

            // console.log('Fetched partner note:', noteData);
            return noteData; // This will be the note object or null
        },
        enabled: !!partner?.id, // Only run query if partner data is available
        // Optional: Add staleTime or refetchInterval if needed
        // staleTime: 1000 * 60 * 5, // 5 minutes
    });
};


// --- Mutation Hooks ---

/**
 * Mutation to send a note to the partner.
 */
export const useSendNote = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { partner } = usePartnerData(); // Get partner and couple info

    type SendNoteInput = {
        content: string;
    };

    return useMutation({
        mutationFn: async ({ content }: SendNoteInput) => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('User not authenticated.');
            if (!partner?.id || !partner.couple_id) throw new Error('Partner or couple information missing.');

            const noteToInsert: TablesInsert<'notes'> = {
                content: content,
                sender_user_id: user.id,
                receiver_user_id: partner.id,
                couple_id: partner.couple_id,
            };

            const { data, error } = await supabase
                .from('notes')
                .insert(noteToInsert)
                .select()
                .single();

            if (error) {
                console.error('Error sending note:', error);
                // Check for specific errors like RLS violation
                if (error.code === '42501') { // RLS violation code
                    throw new Error("Permission denied. Could not send note.");
                }
                throw new Error(error.message || 'Failed to send note.');
            }
            return data;
        },
        onSuccess: (_, variables) => {
            // Invalidate the query that fetches the received note to show the new one (if applicable, depends on app logic)
            // For now, let's assume we *don't* show notes we just sent in the received notes area.
            // We might need a different query for "sent notes" if that's a feature.

            // More importantly, maybe we want to invalidate something else?
            // For now, just show success toast.
            queryClient.invalidateQueries({ queryKey: ['notes', 'latestReceived', partner?.id] });


            toast({
                title: "Note Sent!",
                // description: `Your note has been sent to ${partner?.name || 'your partner'}.`,
            });
        },
        onError: (error) => {
            toast({
                title: "Error Sending Note",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}; 