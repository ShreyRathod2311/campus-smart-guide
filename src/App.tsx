import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Landing from "./pages/Landing";
import Admin from "./pages/Admin";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";

// Dashboard page components
import HomeView from "@/components/HomeView";
import ChatViewNew from "@/components/ChatViewNew";
import BookingViewNew from "@/components/BookingViewNew";
import RequestsViewNew from "@/components/RequestsViewNew";
import ApprovalsView from "@/components/ApprovalsView";
import AssistantView from "@/components/AssistantView";
import NotificationsView from "@/components/NotificationsView";
import SettingsView from "@/components/SettingsView";

const queryClient = new QueryClient();

// Redirect authenticated users away from auth pages
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Admin-only route protection
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }
  
  if (profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<Landing />} />
    
    {/* Auth routes - redirect to dashboard if logged in */}
    <Route path="/sign-in" element={
      <AuthRoute>
        <SignIn />
      </AuthRoute>
    } />
    <Route path="/sign-up" element={
      <AuthRoute>
        <SignUp />
      </AuthRoute>
    } />
    <Route path="/forgot-password" element={
      <AuthRoute>
        <ForgotPassword />
      </AuthRoute>
    } />
    
    {/* Protected dashboard routes with nested layout */}
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    }>
      <Route index element={<HomeView />} />
      <Route path="chat" element={<ChatViewNew />} />
      <Route path="booking" element={<BookingViewNew />} />
      <Route path="requests" element={<RequestsViewNew />} />
      <Route path="approvals" element={<ApprovalsView />} />
      <Route path="assistant" element={<AssistantView />} />
      <Route path="notifications" element={<NotificationsView />} />
      <Route path="settings" element={<SettingsView />} />
    </Route>
    
    {/* Admin-only routes */}
    <Route path="/admin" element={
      <AdminRoute>
        <Admin />
      </AdminRoute>
    } />
    
    {/* Catch-all */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
