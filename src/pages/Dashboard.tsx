import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// This file is deprecated - DashboardLayout is now used instead
// Keeping this for backwards compatibility, redirects to /dashboard
export default function Dashboard() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

