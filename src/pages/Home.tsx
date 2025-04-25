
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import StickyNote from '../components/StickyNote';
import HabitItem from '../components/HabitItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Demo data
const demoPartner = {
  name: 'Emma',
  note: 'Have a wonderful day, love! Remember to stay hydrated. ❤️',
};

const demoHabits = [
  { id: '1', name: 'Morning Run', completed: false, isShared: false },
  { id: '2', name: 'Drink Water', completed: true, isShared: false },
  { id: '3', name: 'Cook Dinner', completed: false, isShared: true, partnerCompleted: true, partnerName: demoPartner.name },
  { id: '4', name: 'Evening Walk', completed: true, isShared: true, partnerCompleted: false, partnerName: demoPartner.name },
];

const Home = () => {
  const navigate = useNavigate();
  const [habits, setHabits] = useState(demoHabits);
  const [note, setNote] = useState('');
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  
  const toggleHabit = (id: string) => {
    setHabits(habits.map(habit => 
      habit.id === id ? { ...habit, completed: !habit.completed } : habit
    ));
  };
  
  const handleNoteSubmit = () => {
    // In a real app, this would send the note to the partner
    setShowNoteDialog(false);
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
          <div className="text-sm">
            <span className="text-couples-text/70">with </span>
            <span className="font-medium">{demoPartner.name}</span>
          </div>
        </div>
      </header>
      
      <main className="px-4">
        {/* Partner's Sticky Note */}
        <section className="mb-6">
          <StickyNote 
            content={demoPartner.note}
            author={demoPartner.name}
          />
          
          <button 
            onClick={() => setShowNoteDialog(true)}
            className="button-primary w-full"
          >
            Write a Note for {demoPartner.name}
          </button>
        </section>
        
        {/* Today's Habits */}
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
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {habits.map(habit => (
              <HabitItem 
                key={habit.id}
                id={habit.id}
                name={habit.name}
                completed={habit.completed}
                isShared={habit.isShared}
                partnerCompleted={habit.partnerCompleted}
                partnerName={habit.partnerName}
                onToggle={() => toggleHabit(habit.id)}
              />
            ))}
            
            <button 
              onClick={() => navigate('/habits')}
              className="w-full p-4 text-left text-couples-accent hover:bg-couples-backgroundAlt flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add New Habit</span>
            </button>
          </div>
        </section>
      </main>
      
      <BottomNav />
      
      {/* Write Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Write a note for {demoPartner.name}</DialogTitle>
          </DialogHeader>
          
          <div className="sticky-note">
            <textarea
              className="w-full bg-transparent border-none resize-none outline-none"
              placeholder={`Write something sweet for ${demoPartner.name}...`}
              rows={4}
              maxLength={100}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="text-right text-sm text-couples-text/70">
              {note.length}/100
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleNoteSubmit} className="bg-couples-accent hover:bg-couples-accent/90">
              Send Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
