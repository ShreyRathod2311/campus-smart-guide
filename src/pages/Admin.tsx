import { useState, useEffect } from "react";
import { useAuth, UserProfile } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit, 
  Shield,
  GraduationCap,
  BookOpen,
  LayoutDashboard
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CampusDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserWithProfile extends UserProfile {
  created_at?: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [documents, setDocuments] = useState<CampusDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: "",
    content: "",
    category: "general" as string,
    tags: "",
    source: "",
  });

  // Fetch users and documents
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch all users (profiles)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (profilesData) {
        setUsers(profilesData as UserWithProfile[]);
      }
      
      // Fetch all documents
      const { data: docsData } = await supabase
        .from("campus_documents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (docsData) {
        setDocuments(docsData as CampusDocument[]);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, []);

  // Update user role
  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    
    if (error) {
      toast.error("Failed to update role");
      return;
    }
    
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as UserProfile["role"] } : u));
    toast.success("Role updated successfully");
  };

  // Add new document
  const handleAddDocument = async () => {
    if (!newDoc.title || !newDoc.content) {
      toast.error("Title and content are required");
      return;
    }
    
    const { data, error } = await supabase
      .from("campus_documents")
      .insert({
        title: newDoc.title,
        content: newDoc.content,
        category: newDoc.category,
        tags: newDoc.tags.split(",").map(t => t.trim()).filter(Boolean),
        source: newDoc.source || null,
      })
      .select()
      .single();
    
    if (error) {
      toast.error("Failed to add document");
      return;
    }
    
    setDocuments([data as CampusDocument, ...documents]);
    setNewDoc({ title: "", content: "", category: "general", tags: "", source: "" });
    setIsAddDocOpen(false);
    toast.success("Document added successfully");
  };

  // Toggle document active status
  const toggleDocumentStatus = async (docId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("campus_documents")
      .update({ is_active: !currentStatus })
      .eq("id", docId);
    
    if (error) {
      toast.error("Failed to update document");
      return;
    }
    
    setDocuments(documents.map(d => d.id === docId ? { ...d, is_active: !currentStatus } : d));
    toast.success("Document updated");
  };

  // Delete document
  const deleteDocument = async (docId: string) => {
    const { error } = await supabase
      .from("campus_documents")
      .delete()
      .eq("id", docId);
    
    if (error) {
      toast.error("Failed to delete document");
      return;
    }
    
    setDocuments(documents.filter(d => d.id !== docId));
    toast.success("Document deleted");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive"><Shield className="w-3 h-3 mr-1" />{role}</Badge>;
      case "professor":
        return <Badge variant="default"><BookOpen className="w-3 h-3 mr-1" />{role}</Badge>;
      default:
        return <Badge variant="secondary"><GraduationCap className="w-3 h-3 mr-1" />{role}</Badge>;
    }
  };

  const stats = {
    totalUsers: users.length,
    students: users.filter(u => u.role === "student").length,
    professors: users.filter(u => u.role === "professor").length,
    admins: users.filter(u => u.role === "admin").length,
    totalDocs: documents.length,
    activeDocs: documents.filter(d => d.is_active).length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">CSIS SmartAssist</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="w-4 h-4 mr-2" />
              User Dashboard
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.students} students, {stats.professors} professors
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
              <p className="text-xs text-muted-foreground">System administrators</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Knowledge Base</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocs}</div>
              <p className="text-xs text-muted-foreground">{stats.activeDocs} active documents</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">Document categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Knowledge Base
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.full_name || "No name"}
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{getRoleBadge(u.role)}</TableCell>
                          <TableCell>
                            <Select
                              value={u.role}
                              onValueChange={(value) => handleRoleChange(u.id, value)}
                              disabled={u.id === user?.id}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="professor">Professor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Knowledge Base Documents</CardTitle>
                  <CardDescription>Manage RAG knowledge base for campus AI</CardDescription>
                </div>
                <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Document</DialogTitle>
                      <DialogDescription>
                        Add a new document to the campus knowledge base for RAG
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={newDoc.title}
                          onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                          placeholder="Document title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                          id="content"
                          value={newDoc.content}
                          onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                          placeholder="Document content..."
                          rows={6}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={newDoc.category}
                            onValueChange={(value) => setNewDoc({ ...newDoc, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="academic">Academic</SelectItem>
                              <SelectItem value="administrative">Administrative</SelectItem>
                              <SelectItem value="facilities">Facilities</SelectItem>
                              <SelectItem value="events">Events</SelectItem>
                              <SelectItem value="policies">Policies</SelectItem>
                              <SelectItem value="faq">FAQ</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="source">Source</Label>
                          <Input
                            id="source"
                            value={newDoc.source}
                            onChange={(e) => setNewDoc({ ...newDoc, source: e.target.value })}
                            placeholder="Source document name"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tags">Tags (comma-separated)</Label>
                        <Input
                          id="tags"
                          value={newDoc.tags}
                          onChange={(e) => setNewDoc({ ...newDoc, tags: e.target.value })}
                          placeholder="tag1, tag2, tag3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDocOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddDocument}>Add Document</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {doc.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.category}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            <div className="flex gap-1 flex-wrap">
                              {doc.tags?.slice(0, 3).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {doc.tags?.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{doc.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={doc.is_active ? "default" : "secondary"}>
                              {doc.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleDocumentStatus(doc.id, doc.is_active)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteDocument(doc.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
