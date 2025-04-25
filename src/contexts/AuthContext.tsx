import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Clear cache if user becomes null (logged out state)
        if (!session?.user) {
          console.log('Auth state changed to logged out, clearing caches...');
          queryClient.removeQueries({ queryKey: ['partnerData'], exact: false });
          queryClient.removeQueries({ queryKey: ['habits'], exact: false });
          queryClient.removeQueries({ queryKey: ['partnerNote'], exact: false });
          // Add other relevant query keys to clear if necessary
        }
      }
    );

    // Initial check for session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
    // Add queryClient to dependencies? Unlikely needed as it should be stable.
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Navigation might trigger AuthProvider state change, clearing cache if needed
    navigate('/home');
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw error;
    // Clear potentially stale caches before navigating to a fresh state
    queryClient.removeQueries({ queryKey: ['partnerData'], exact: false });
    queryClient.removeQueries({ queryKey: ['habits'], exact: false });
    queryClient.removeQueries({ queryKey: ['partnerNote'], exact: false });
    navigate('/connect-partner');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // --- Clear React Query Cache on Sign Out ---
    console.log('Signing out, clearing caches...');
    queryClient.removeQueries({ queryKey: ['partnerData'], exact: false });
    queryClient.removeQueries({ queryKey: ['habits'], exact: false });
    queryClient.removeQueries({ queryKey: ['partnerNote'], exact: false });
    // Add any other user-specific queries that need clearing
    // Example: queryClient.removeQueries({ queryKey: ['profile'] });

    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
