import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  MessageSquare, 
  Calendar, 
  BookOpen, 
  Shield,
  ChevronRight,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Users,
  Zap
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI-Powered Assistant",
    description: "Get instant answers to your campus queries with our intelligent RAG-based chatbot that understands CSIS-specific information.",
  },
  {
    icon: Calendar,
    title: "Lab & Room Booking",
    description: "Book labs, seminar halls, and conference rooms with real-time availability and instant admin approval workflow.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base",
    description: "Access comprehensive information about academic policies, administrative procedures, and campus facilities.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your data is protected with enterprise-grade security. All conversations and bookings are private to your account.",
  },
];

const benefits = [
  "24/7 access to campus information",
  "Personalized responses based on your profile",
  "Track your booking requests in real-time",
  "Access academic policies and guidelines instantly",
  "Get help with TA applications and reimbursements",
  "Seamless integration with BITS Pilani systems",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-xl">SmartAssist</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/sign-up">
                Get Started
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Campus Assistant
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
              Your Smart Guide to{" "}
              <span className="text-primary">CSIS Campus</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Navigate academic policies, book labs, track requests, and get instant answers 
              about anything related to the Computer Science & Information Systems department.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-base">
                <Link to="/sign-up">
                  Start for Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base">
                <Link to="/sign-in">
                  Sign In
                </Link>
              </Button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span>500+ Active Users</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span>Instant Responses</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <span>Secure & Private</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              SmartAssist combines AI intelligence with campus-specific knowledge to give you 
              the best experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Why Choose SmartAssist?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Built specifically for BITS Pilani Goa Campus, SmartAssist understands your 
                unique needs and provides accurate, context-aware assistance.
              </p>
              
              <div className="grid gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 flex items-center justify-center">
                <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">SmartAssist</h4>
                      <p className="text-xs text-muted-foreground">AI Campus Guide</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-muted rounded-xl rounded-bl-md p-3">
                      <p className="text-sm">How do I apply for a TA position?</p>
                    </div>
                    <div className="bg-primary/10 rounded-xl rounded-br-md p-3 text-sm">
                      <p>To apply for a TA position in CSIS:</p>
                      <ul className="list-disc list-inside mt-2 text-muted-foreground">
                        <li>Ensure CGPA ≥ 7.5</li>
                        <li>Fill the form on CSIS Portal</li>
                        <li>Submit before deadline</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Join hundreds of students and faculty using SmartAssist to navigate campus life.
          </p>
          <Button size="lg" asChild className="text-base">
            <Link to="/sign-up">
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display font-semibold">CSIS SmartAssist</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 BITS Pilani Goa Campus. Built for CSIS Department.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
