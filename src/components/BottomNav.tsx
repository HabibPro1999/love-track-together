
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, List, User } from "lucide-react";

const BottomNav: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-couples-backgroundAlt flex justify-around py-3 px-4">
      <Link to="/home" className={`nav-item ${path === "/home" ? "active" : ""}`}>
        <Home className="h-6 w-6" />
        <span className="text-xs mt-1">Home</span>
      </Link>
      <Link to="/habits" className={`nav-item ${path === "/habits" ? "active" : ""}`}>
        <List className="h-6 w-6" />
        <span className="text-xs mt-1">Habits</span>
      </Link>
      <Link to="/profile" className={`nav-item ${path === "/profile" ? "active" : ""}`}>
        <User className="h-6 w-6" />
        <span className="text-xs mt-1">Profile</span>
      </Link>
    </nav>
  );
};

export default BottomNav;
