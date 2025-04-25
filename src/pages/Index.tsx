
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // In a real app, this would check if user is logged in
    // For demo purposes, we'll just redirect to login after a brief delay
    const timer = setTimeout(() => {
      navigate('/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="app-container flex flex-col items-center justify-center">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-couples-accent p-4 rounded-full">
            <Heart className="h-10 w-10 text-white animate-pulse-gentle" />
          </div>
          <h1 className="text-3xl font-bold">Together</h1>
        </div>
        <p className="text-couples-text/70">
          Track habits, share goals, and grow together.
        </p>
      </div>
    </div>
  );
};

export default Index;
