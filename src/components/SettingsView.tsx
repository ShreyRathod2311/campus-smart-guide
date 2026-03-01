import { Bell, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";

export default function SettingsView() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleDarkModeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 h-full overflow-y-auto scrollbar-thin">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your SmartAssist preferences.</p>
      </div>

      <div className="space-y-4">
        {/* Email Notifications */}
        <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Email Notifications</h3>
              <p className="text-sm text-muted-foreground">Receive email updates for booking status changes</p>
            </div>
          </div>
          <Switch defaultChecked={true} />
        </div>

        {/* Dark Mode – wired to ThemeContext */}
        <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Moon size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Dark Mode</h3>
              <p className="text-sm text-muted-foreground">Switch to dark theme for reduced eye strain</p>
            </div>
          </div>
          <Switch checked={isDark} onCheckedChange={handleDarkModeToggle} />
        </div>
      </div>

      <div className="mt-10 bg-card rounded-xl border border-border p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">About SmartAssist</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Version: 1.0.0 (Prototype)</p>
          <p>Department: CSIS, BITS Pilani Goa Campus</p>
          <p>Proposed by: Prof. Neena Goveas</p>
          <p>Built with: RAG + Open-Source LLMs</p>
          <p className="pt-2 text-xs">All responses are grounded in official department documents and policies. For critical decisions, always verify with the CSIS office directly.</p>
        </div>
      </div>
    </div>
  );
}
