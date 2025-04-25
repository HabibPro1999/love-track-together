
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import HabitItem from '../components/HabitItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

// Demo data
const demoPartner = {
  name: 'Emma',
};

// Define proper types for habits
type HabitType = 'personal' | 'shared';

interface BaseHabit {
  id: string;
  name: string;
  completed: boolean;
  isShared: boolean;
  type: HabitType;
}

interface PersonalHabit extends BaseHabit {
  isShared: false;
  type: 'personal';
  isPrivate?: boolean;
}

interface SharedHabit extends BaseHabit {
  isShared: true;
  type: 'shared';
  partnerCompleted: boolean;
  partnerName: string;
}

type Habit = PersonalHabit | SharedHabit;

const initialHabits: Habit[] = [
  { id: '1', name: 'Morning Run', completed: false, isShared: false, type: 'personal' },
  { id: '2', name: 'Drink Water', completed: true, isShared: false, type: 'personal' },
  { id: '3', name: 'Cook Dinner', completed: false, isShared: true, partnerCompleted: true, partnerName: demoPartner.name, type: 'shared' },
  { id: '4', name: 'Evening Walk', completed: true, isShared: true, partnerCompleted: false, partnerName: demoPartner.name, type: 'shared' },
  { id: '5', name: 'Read a Book', completed: false, isShared: false, isPrivate: true, type: 'personal' },
];

const Habits = () => {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState<HabitType>('personal');
  const [newHabitPrivate, setNewHabitPrivate] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const toggleHabit = (id: string) => {
    setHabits(habits.map(habit => 
      habit.id === id ? { ...habit, completed: !habit.completed } : habit
    ));
  };

  const handleAddHabit = () => {
    if (newHabitName.trim()) {
      let newHabit: Habit;
      
      if (newHabitType === 'shared') {
        newHabit = {
          id: Date.now().toString(),
          name: newHabitName.trim(),
          completed: false,
          isShared: true,
          partnerCompleted: false,
          partnerName: demoPartner.name,
          type: 'shared',
        };
      } else {
        newHabit = {
          id: Date.now().toString(),
          name: newHabitName.trim(),
          completed: false,
          isShared: false,
          type: 'personal',
          isPrivate: newHabitPrivate,
        };
      }
      
      setHabits([...habits, newHabit]);
      setNewHabitName('');
      setNewHabitType('personal');
      setNewHabitPrivate(false);
      setShowAddDialog(false);
    }
  };

  const filteredHabits = habits.filter(habit => {
    if (activeTab === 'all') return true;
    if (activeTab === 'personal') return habit.type === 'personal';
    if (activeTab === 'shared') return habit.type === 'shared';
    return true;
  });

  return (
    <div className="app-container pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-couples-background pt-8 pb-4 px-4 z-10">
        <h1 className="text-2xl font-medium mb-4">Habits</h1>
        
        <div className="flex border-b border-couples-backgroundAlt">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 text-center ${
              activeTab === 'all' 
                ? 'text-couples-accent border-b-2 border-couples-accent' 
                : 'text-couples-text/70'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-2 text-center ${
              activeTab === 'personal' 
                ? 'text-couples-accent border-b-2 border-couples-accent' 
                : 'text-couples-text/70'
            }`}
          >
            My Habits
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`flex-1 py-2 text-center ${
              activeTab === 'shared' 
                ? 'text-couples-accent border-b-2 border-couples-accent' 
                : 'text-couples-text/70'
            }`}
          >
            Our Habits
          </button>
        </div>
      </header>
      
      <main className="px-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredHabits.length > 0 ? filteredHabits.map(habit => (
            <HabitItem 
              key={habit.id}
              id={habit.id}
              name={habit.name}
              completed={habit.completed}
              isShared={habit.isShared}
              partnerCompleted={habit.isShared ? habit.partnerCompleted : undefined}
              partnerName={habit.isShared ? habit.partnerName : undefined}
              onToggle={() => toggleHabit(habit.id)}
            />
          )) : (
            <div className="p-8 text-center text-couples-text/70">
              No habits found. Add a new habit to get started!
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
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Habit</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="habit-name">Habit Name</Label>
              <Input
                id="habit-name"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="e.g., Morning Workout"
              />
            </div>
            
            <div>
              <Label>Type</Label>
              <RadioGroup 
                value={newHabitType} 
                onValueChange={(value: HabitType) => setNewHabitType(value)}
                className="flex space-x-2 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal" id="personal" />
                  <Label htmlFor="personal">Personal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="shared" id="shared" />
                  <Label htmlFor="shared">Shared with {demoPartner.name}</Label>
                </div>
              </RadioGroup>
            </div>
            
            {newHabitType === 'personal' && (
              <div className="flex items-center space-x-2">
                <Switch 
                  id="private-mode"
                  checked={newHabitPrivate}
                  onCheckedChange={setNewHabitPrivate}
                />
                <Label htmlFor="private-mode">Private (only visible to you)</Label>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddHabit}
              className="bg-couples-accent hover:bg-couples-accent/90"
              disabled={!newHabitName.trim()}
            >
              Add Habit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Habits;
