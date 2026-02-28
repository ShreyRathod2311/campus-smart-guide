import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import ChatView from "@/components/ChatView";
import BookingView from "@/components/BookingView";
import RequestsView from "@/components/RequestsView";
import KnowledgeView from "@/components/KnowledgeView";
import SettingsView from "@/components/SettingsView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Msg } from "@/lib/chat-stream";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type View = "chat" | "booking" | "my-requests" | "knowledge" | "settings";

interface Conversation {
  id: string;
  title: string;
}

export default function Index() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load conversations for current user
  useEffect(() => {
    if (!user) return;
    
    supabase
      .from("conversations")
      .select("id, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setConversations(data);
          setActiveConversationId(data[0].id);
        }
      });
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) return;
    supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as Msg[]);
      });
  }, [activeConversationId]);

  // Save messages when they change (debounced to avoid rapid saves during streaming)
  useEffect(() => {
    if (!activeConversationId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === "assistant" && lastMsg.content) {
      // Debounce save operation to wait for streaming to complete
      const timeoutId = setTimeout(async () => {
        // Delete old messages for this conversation
        await supabase.from("messages").delete().eq("conversation_id", activeConversationId);
        // Insert all current messages
        await supabase.from("messages").insert(
          messages.map((m) => ({
            conversation_id: activeConversationId,
            role: m.role,
            content: m.content,
          }))
        );
        // Update conversation title from first user message
        const firstUserMsg = messages.find((m) => m.role === "user");
        if (firstUserMsg) {
          await supabase
            .from("conversations")
            .update({ title: firstUserMsg.content.slice(0, 60) })
            .eq("id", activeConversationId);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversationId
                ? { ...c, title: firstUserMsg.content.slice(0, 60) }
                : c
            )
          );
        }
      }, 1000); // Wait 1 second after last message change before saving
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, activeConversationId]);

  const handleNewChat = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("conversations")
      .insert({ title: "New Chat", user_id: user.id })
      .select("id, title")
      .single();
    if (data) {
      setConversations((prev) => [data, ...prev]);
      setActiveConversationId(data.id);
      setMessages([]);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setCurrentView("chat");
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  // Auto-create first conversation if none exist
  useEffect(() => {
    if (conversations.length === 0 && currentView === "chat") {
      handleNewChat();
    }
  }, [conversations.length, currentView]);

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile menu toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-card border border-border shadow-md"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sign out button - mobile */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut size={18} />
        </Button>
      </div>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static z-40 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <AppSidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onSignOut={handleSignOut}
          userEmail={user?.email}
          userName={profile?.full_name}
          userRole={profile?.role}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-hidden">
        {currentView === "chat" && (
          <ChatView
            messages={messages}
            setMessages={setMessages}
            onNavigateToBooking={() => setCurrentView("booking")}
          />
        )}
        {currentView === "booking" && <BookingView />}
        {currentView === "my-requests" && <RequestsView />}
        {currentView === "knowledge" && <KnowledgeView />}
        {currentView === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
