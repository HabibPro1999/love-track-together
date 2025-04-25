
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, LogOut, Moon, Settings, User } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const demoPartner = {
  name: 'Emma',
  connected: true,
};

const Profile = () => {
  const navigate = useNavigate();
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [notifications, setNotifications] = useState({
    partnerActivity: true,
    dailyReminder: true,
    streakAlerts: true,
  });
  
  const handleLogout = () => {
    // In a real app, this would log the user out
    navigate('/login');
  };

  const handleDisconnect = () => {
    // In a real app, this would disconnect the partner
    setShowDisconnectDialog(false);
    // You might want to redirect or update state after disconnecting
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key],
    });
  };

  return (
    <div className="app-container pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-couples-background pt-8 pb-4 px-4 z-10">
        <h1 className="text-2xl font-medium">Profile</h1>
      </header>
      
      <main className="px-4">
        {/* User Info */}
        <section className="bg-white rounded-lg shadow-sm p-5 mb-6 flex items-center">
          <div className="h-16 w-16 bg-couples-backgroundAlt rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-couples-text/70" />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-medium">John</h2>
            <p className="text-sm text-couples-text/70">john@example.com</p>
          </div>
        </section>
        
        {/* Partner Connection */}
        <section className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-couples-accent" />
                <h2 className="font-medium">Partner Connection</h2>
              </div>
            </div>
            
            {demoPartner.connected ? (
              <div className="mt-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{demoPartner.name}</p>
                    <p className="text-sm text-couples-text/70">Connected Partner</p>
                  </div>
                  <button 
                    onClick={() => setShowDisconnectDialog(true)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-couples-text/70">You haven't connected with a partner yet.</p>
                <button 
                  onClick={() => navigate('/connect-partner')}
                  className="text-couples-accent hover:underline mt-2"
                >
                  Connect with a partner
                </button>
              </div>
            )}
          </div>
        </section>
        
        {/* Notifications */}
        <section className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5" />
              <h2 className="font-medium">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Partner Activity</p>
                  <p className="text-sm text-couples-text/70">Get notified when your partner completes a habit</p>
                </div>
                <Switch 
                  checked={notifications.partnerActivity}
                  onCheckedChange={() => toggleNotification('partnerActivity')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Daily Reminder</p>
                  <p className="text-sm text-couples-text/70">Get a reminder to complete your habits</p>
                </div>
                <Switch 
                  checked={notifications.dailyReminder}
                  onCheckedChange={() => toggleNotification('dailyReminder')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Streak Alerts</p>
                  <p className="text-sm text-couples-text/70">Get notified about your streak milestones</p>
                </div>
                <Switch 
                  checked={notifications.streakAlerts}
                  onCheckedChange={() => toggleNotification('streakAlerts')}
                />
              </div>
            </div>
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
