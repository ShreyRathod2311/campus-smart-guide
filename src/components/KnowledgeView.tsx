import { FileText, BookOpen, GraduationCap, CreditCard, Building2, Users } from "lucide-react";

const KNOWLEDGE_ITEMS = [
  {
    icon: GraduationCap,
    title: "TA Application Process",
    description: "Fill out the TA Application Form on the CSIS Portal and submit before the deadline. Results are announced within 2 weeks.",
    source: "TA Guidelines Circular, Aug 2025",
    tags: ["TA", "Application", "Students"],
  },
  {
    icon: CreditCard,
    title: "Bill Forwarding & Reimbursement",
    description: "Submit bills with proper documentation to the department office. Processing takes 5-7 working days. Travel reimbursements need prior approval.",
    source: "Finance Policy Document",
    tags: ["Finance", "Reimbursement", "Bills"],
  },
  {
    icon: Building2,
    title: "Lab Booking Guidelines",
    description: "Labs can be booked through SmartAssist. All bookings require admin approval. Available labs include AI & ML, Networks, Software, and Data Science labs.",
    source: "Lab Usage Policy",
    tags: ["Labs", "Booking", "Facilities"],
  },
  {
    icon: BookOpen,
    title: "Academic Policies",
    description: "Course registration, grade appeals, credit transfer policies, and examination rules. Consult the academic calendar for important dates.",
    source: "Academic Handbook 2025-26",
    tags: ["Academic", "Policies", "Courses"],
  },
  {
    icon: Users,
    title: "Faculty Office Hours",
    description: "Faculty maintain regular office hours for student consultations. Check the department notice board or website for schedules.",
    source: "Department Website",
    tags: ["Faculty", "Office Hours", "Contact"],
  },
  {
    icon: FileText,
    title: "Internship & Placement Guidelines",
    description: "PS-1 and PS-2 guidelines, NOC applications for off-campus internships, and placement registration procedures.",
    source: "Practice School Division",
    tags: ["Internship", "Placement", "PS"],
  },
];

export default function KnowledgeView() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 h-full overflow-y-auto scrollbar-thin">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Browse the indexed documents and policies that SmartAssist uses to answer your queries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KNOWLEDGE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="bg-card rounded-xl border border-border p-5 hover:border-primary/20 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Icon size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {item.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic">Source: {item.source}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
