import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, LogOut, Moon, Settings, User } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Copy } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDisconnectDialog, setShowDisconnectDialog] = React.useState(false);

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
              <span className="font-mono text-lg">ABC123</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('ABC123');
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
          
          <p>Are you sure you want to disconnect from {demoPartner.name}? All shared habits will become personal habits.</p>
          
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
