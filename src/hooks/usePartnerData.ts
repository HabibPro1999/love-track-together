import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

// Define the type for the partner data we expect
// Add couple_id to the returned type
type PartnerData = (Pick<Tables<'profiles'>, 'id' | 'name'> & { couple_id: string }) | null;

// Define the asynchronous function to fetch partner data
const fetchPartnerData = async (userId: string | undefined): Promise<PartnerData> => {
    if (!userId) {
        return null; // No user, no partner data
    }

    // 1. Find the current user's couple membership to get the couple_id
    const { data: currentUserMembership, error: membershipError } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (membershipError) throw new Error(`Error fetching membership: ${membershipError.message}`);
    // If no membership, the user isn't connected to a partner
    if (!currentUserMembership) {
        return null;
    }

    const { couple_id } = currentUserMembership;

    // 2. Find the partner's membership in the same couple
    const { data: partnerMembership, error: partnerMembershipError } = await supabase
        .from('couple_members')
        .select('user_id')
        .eq('couple_id', couple_id)
        .neq('user_id', userId)
        .maybeSingle();

    if (partnerMembershipError) throw new Error(`Error fetching partner membership: ${partnerMembershipError.message}`);
    // If no partner membership found in the same couple
    if (!partnerMembership) {
        return null;
    }

    const partnerUserId = partnerMembership.user_id;

    // 3. Fetch the partner's profile using their user_id
    const { data: partnerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', partnerUserId)
        .single(); // Use single, expecting one profile

    if (profileError) {
        // Handle cases where the partner profile might not exist (e.g., deleted user)
        if (profileError.code === 'PGRST116') { // 'PGRST116' is Supabase code for 'exact one row expected' failure
            console.warn(`Partner profile not found for user ID: ${partnerUserId}`);
            return null;
        }
        throw new Error(`Error fetching partner profile: ${profileError.message}`);
    }

    // Combine profile with couple_id
    return { ...partnerProfile, couple_id };
};

export const usePartnerData = () => {
    const { user } = useAuth();
    const userId = user?.id;

    // Use React Query's useQuery hook
    const {
        data: partnerData,
        isLoading,
        error,
        // Add other potentially useful properties from useQuery if needed:
        // isError, isFetching, refetch, etc.
    } = useQuery<PartnerData, Error>({
        // Query key: Unique identifier for this data.
        // Includes userId so it refetches if the user changes.
        queryKey: ['partnerData', userId],
        // The function that fetches the data
        queryFn: () => fetchPartnerData(userId),
        // Only run the query if the userId exists
        enabled: !!userId,
        // Optional: Configure caching behavior (e.g., staleTime, cacheTime)
        // staleTime: 5 * 60 * 1000, // 5 minutes
        // cacheTime: 15 * 60 * 1000, // 15 minutes
    });

    // Return the data and status provided by useQuery
    // Ensure we return 'partner' as the key for consistency with previous usage
    return {
        partner: partnerData ?? null, // Default to null if data is undefined
        isLoading,
        error: error ? error : null // Return the error object or null
    };
};