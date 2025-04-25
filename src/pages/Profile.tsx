
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Copy } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [connectionCode, setConnectionCode] = useState<string | null>(null);

  // Fetch user's connection code from the couples table
  const { data: coupleData } = useQuery({
    queryKey: ['couple-code'],
    queryFn: async () => {
      if (!user) return null;

      // Check if user is part of a couple
      const { data: memberData } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData) return null;

      // Get the couple code
      const { data: coupleInfo } = await supabase
        .from('couples')
        .select('code')
        .eq('id', memberData.couple_id)
        .single();

      return coupleInfo;
    },
    enabled: !!user
  });

  // Generate a display code - either from the database or a placeholder
  const displayCode = coupleData?.code || 'Not connected';

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: "Failed to sign out. Please try again."
      });
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    try {
      // Find the couple membership
      const { data: membership } = await supabase
        .from('couple_members')
        .select('id, couple_id')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        // Delete the membership
        await supabase
          .from('couple_members')
          .delete()
          .eq('id', membership.id);

        // Check if there are any other members in this couple
        const { count } = await supabase
          .from('couple_members')
          .select('id', { count: 'exact' })
          .eq('couple_id', membership.couple_id);

        // If no other members, delete the couple
        if (!count || count === 0) {
          await supabase
            .from('couples')
            .delete()
            .eq('id', membership.couple_id);
        }

        toast({
          title: "Disconnected",
          description: "You've been disconnected from your partner"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error disconnecting",
        description: "Failed to disconnect from your partner"
      });
    } finally {
      setShowDisconnectDialog(false);
    }
  };

  return (
    <div className="app-container pb-20">
      <header className="sticky top-0 bg-couples-background pt-8 pb-4 px-4 z-10">
        <h1 className="text-2xl font-medium">Profile</h1>
      </header>
      
      <main className="px-4">
        {/* User Info */}
        <section className="bg-white rounded-lg shadow-sm p-5 mb-6 flex items-center">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-couples-accent text-white text-xl">
              {user?.user_metadata.name?.charAt(0).toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4">
            <h2 className="text-lg font-medium">{user?.user_metadata.name}</h2>
            <p className="text-sm text-couples-text/70">{user?.email}</p>
          </div>
        </section>

        {/* Partner Connection */}
        <section className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-5">
            <h2 className="font-medium mb-4">Your Connection Code</h2>
            <div className="bg-couples-backgroundAlt p-4 rounded-lg flex justify-between items-center">
              <span className="font-mono text-lg">{displayCode}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(displayCode);
                  toast({
                    title: "Code copied",
                    description: "Your connection code has been copied to clipboard"
                  });
                }}
                className="text-couples-accent hover:text-couples-accent/80"
              >
                <Copy className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-couples-text/70 mt-2">
              Share this code with your partner to connect your accounts
            </p>
          </div>
        </section>

        {/* Account Actions */}
        <section className="bg-white rounded-lg shadow-sm overflow-hidden">
          <button 
            onClick={handleLogout}
            className="w-full p-4 flex items-center gap-2 text-left hover:bg-couples-backgroundAlt text-red-500"
          >
            <LogOut className="h-5 w-5" />
            <span>Log Out</span>
          </button>
        </section>
      </main>
      
      <BottomNav />
      
      {/* Disconnect Partner Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect Partner</DialogTitle>
          </DialogHeader>
          
          <p>Are you sure you want to disconnect from your partner? All shared habits will become personal habits.</p>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisconnectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDisconnect}
              variant="destructive"
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
