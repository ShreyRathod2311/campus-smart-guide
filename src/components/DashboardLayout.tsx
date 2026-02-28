import { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "@/components/ui/animated-sidebar";
import {
  MessageSquare,
  CalendarPlus,
  ClipboardList,
  Shield,
  Bell,
  Settings,
  LogOut,
  Sun,
  Moon,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { label: "New Booking", href: "/dashboard/booking", icon: CalendarPlus },
  { label: "My Requests", href: "/dashboard/requests", icon: ClipboardList },
  { label: "Approvals", href: "/dashboard/approvals", icon: Shield, adminOnly: true },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const getUserInitials = (name?: string | null, email?: string) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
  };

  const userInitials = getUserInitials(profile?.full_name, user?.email);

  // Filter nav items based on role
  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || profile?.role === "admin"
  );

  const links = filteredNavItems.map((item) => ({
    label: item.label,
    href: item.href,
    icon: <item.icon className="h-5 w-5 flex-shrink-0" />,
  }));

  // Check if current path matches href
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className={cn(
      "flex h-screen w-full overflow-hidden",
      "bg-gray-100 dark:bg-neutral-900"
    )}>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Logo */}
            <div className="flex items-center gap-2 py-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="font-semibold text-lg text-neutral-900 dark:text-white whitespace-pre"
              >
                CSIS SmartAssist
              </motion.span>
            </div>

            {/* Navigation Links */}
            <div className="mt-8 flex flex-col gap-1">
              {links.map((link, idx) => (
                <SidebarLink 
                  key={idx} 
                  link={link} 
                  active={isActive(filteredNavItems[idx].href)}
                />
              ))}
            </div>
          </div>

          {/* Bottom section */}
          <div className="flex flex-col gap-2">
            {/* Theme Toggle */}
            <SidebarLink
              link={{
                label: resolvedTheme === "dark" ? "Light Mode" : "Dark Mode",
                href: "#",
                icon: resolvedTheme === "dark" ? (
                  <Sun className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <Moon className="h-5 w-5 flex-shrink-0" />
                ),
                onClick: toggleTheme,
              }}
            />

            {/* Sign Out */}
            <SidebarLink
              link={{
                label: "Sign Out",
                href: "#",
                icon: <LogOut className="h-5 w-5 flex-shrink-0 text-red-500" />,
                onClick: handleSignOut,
              }}
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            />

            {/* User Profile */}
            <SidebarLink
              link={{
                label: profile?.full_name || user?.email || "User",
                href: "/dashboard/settings",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <span className="text-xs font-medium text-white">{userInitials}</span>
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-auto bg-white dark:bg-neutral-900">
        <Outlet />
      </main>
    </div>
  );
}
