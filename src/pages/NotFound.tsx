
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-couples-background p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-couples-text mb-6">
          Oops! This page doesn't exist.
        </p>
        <p className="text-couples-text/70 mb-8">
          The path "{location.pathname}" was not found.
        </p>
        <Link 
          to="/home" 
          className="button-primary inline-flex items-center gap-2"
        >
          <Home className="h-5 w-5" />
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
