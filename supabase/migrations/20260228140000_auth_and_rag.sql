-- Enable required extensions for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- User profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'professor', 'admin', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campus knowledge base for RAG
CREATE TABLE public.campus_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('academic', 'administrative', 'facilities', 'events', 'policies', 'faq', 'general')),
  tags TEXT[],
  source TEXT,
  embedding vector(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX campus_documents_embedding_idx ON public.campus_documents 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_documents ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Profiles are created on signup" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Campus documents policies (read access for authenticated users)
CREATE POLICY "Authenticated users can read active campus documents" ON public.campus_documents 
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage campus documents" ON public.campus_documents 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update conversation and messages policies for authenticated users
DROP POLICY IF EXISTS "Allow public read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public delete conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow public insert messages" ON public.messages;

-- Add user_id to conversations
ALTER TABLE public.conversations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- New conversation policies
CREATE POLICY "Users can read their own conversations" ON public.conversations 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON public.conversations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON public.conversations 
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON public.conversations 
  FOR UPDATE USING (auth.uid() = user_id);

-- New messages policies
CREATE POLICY "Users can read messages from their conversations" ON public.messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their conversations" ON public.messages 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their conversations" ON public.messages 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- Update bookings policies for authenticated users
DROP POLICY IF EXISTS "Allow public read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public update bookings" ON public.bookings;

ALTER TABLE public.bookings ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can read their own bookings" ON public.bookings 
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Authenticated users can insert bookings" ON public.bookings 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON public.bookings 
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role from metadata, default to 'student'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  
  -- Validate role
  IF user_role NOT IN ('student', 'professor', 'admin', 'staff') THEN
    user_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    user_role
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for RAG similarity search
CREATE OR REPLACE FUNCTION match_campus_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  source TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cd.id,
    cd.title,
    cd.content,
    cd.category,
    cd.source,
    1 - (cd.embedding <=> query_embedding) AS similarity
  FROM public.campus_documents cd
  WHERE cd.is_active = true
    AND 1 - (cd.embedding <=> query_embedding) > match_threshold
  ORDER BY cd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Updated_at trigger for new tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campus_documents_updated_at
  BEFORE UPDATE ON public.campus_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample campus documents for RAG
INSERT INTO public.campus_documents (title, content, category, tags, source) VALUES
-- Academic Information
('TA Application Process', 
'Teaching Assistant (TA) Application Process at CSIS BITS Pilani Goa Campus:

1. **Eligibility**: Students with CGPA >= 7.5 and completed at least 2 semesters
2. **Application Period**: Usually opens 2 weeks before each semester
3. **Process**: 
   - Fill out the TA Application Form on the CSIS Portal
   - Select up to 3 preferred courses in order of preference
   - Upload your resume and grade sheet
   - Submit before the deadline
4. **Selection**: Faculty review applications and selections are made based on academic performance and course relevance
5. **Responsibilities**: Assisting in labs, grading assignments, holding office hours (8-10 hours/week)
6. **Compensation**: Rs. 10,000-15,000 per month depending on course load

Contact: csis-office@goa.bits-pilani.ac.in for queries.
Source: TA Guidelines Circular, August 2025', 
'academic', ARRAY['ta', 'teaching assistant', 'application', 'jobs'], 'TA Guidelines Circular'),

('Course Registration',
'Course Registration at BITS Pilani Goa Campus:

1. **Timetable Release**: Published 1 week before registration opens
2. **Pre-Registration**: Students can view available courses and plan schedule
3. **Registration Window**: Opens for 3 days, priority based on CGPA
4. **Add/Drop Period**: First 2 weeks of semester
5. **Maximum Credits**: 25 credits per semester (28 with permission)
6. **Minimum Credits**: 12 credits to maintain full-time status

Important Tips:
- Register for backup courses as popular ones fill up quickly
- Check for laboratory components that may have separate timing
- Verify prerequisite completion before registering

Portal: erp.bits-pilani.ac.in
Source: Academic Regulations 2025', 
'academic', ARRAY['registration', 'courses', 'credits', 'timetable'], 'Academic Regulations'),

('Exam Schedule and Policies',
'Examination Guidelines at BITS Pilani Goa Campus:

**Mid-Semester Examination**:
- Duration: 1.5 hours
- Weightage: 25-35% typically
- Schedule: Published 2 weeks before exams

**Comprehensive Examination**:
- Duration: 3 hours
- Weightage: 35-45% typically
- Held during examination week at semester end

**Policies**:
1. Bring valid ID card to all examinations
2. Electronic devices are prohibited unless specified
3. Late entry: Maximum 15 minutes, no extra time given
4. Malpractice: Results in zero marks + disciplinary action

**Make-up Exams**:
- Apply within 3 days of missing exam
- Medical certificate required for health-related absence
- Dean approval needed for other valid reasons

Source: Examination Division Guidelines 2025',
'academic', ARRAY['exam', 'examination', 'midsem', 'comprehensive', 'schedule'], 'Examination Division'),

-- Administrative Information
('Bill Forwarding and Reimbursement',
'Bill Forwarding and Reimbursement Process at BITS Pilani Goa Campus:

**Bill Forwarding**:
1. Submit original bills to department office
2. Fill out Bill Forwarding Form (available at admin office)
3. Get approval signature from faculty/HOD
4. Submit to accounts section
5. Processing time: 5-7 working days

**Types of Reimbursements**:
- Conference/Workshop registration fees
- Travel expenses (domestic/international)
- Research equipment purchases
- Publication charges

**Required Documents**:
- Original receipts/invoices
- Travel: Boarding passes, hotel bills
- Approval letter from guide/HOD
- Bank account details

**Important Notes**:
- Travel claims must be submitted within 15 days of return
- Prior approval required for international travel
- GST invoices preferred for equipment purchases

Contact: accounts@goa.bits-pilani.ac.in
Source: Finance Policy Document 2025',
'administrative', ARRAY['reimbursement', 'bill', 'finance', 'travel', 'expenses'], 'Finance Policy Document'),

('Leave Application Process',
'Leave Application Process for Students:

**Types of Leave**:
1. Medical Leave: Requires medical certificate
2. Personal Leave: Family emergencies, personal reasons
3. Academic Leave: Conference attendance, internships

**Process**:
1. Login to ERP portal
2. Navigate to Student Services > Leave Application
3. Select leave type and dates
4. Upload supporting documents
5. Submit for approval

**Important Guidelines**:
- Apply at least 3 days in advance for planned leave
- Medical leave can be applied post-facto within 2 days
- Maximum consecutive days: 15 (longer requires Dean approval)
- Attendance below 75% may result in grade reduction

Contact: student-affairs@goa.bits-pilani.ac.in',
'administrative', ARRAY['leave', 'application', 'attendance', 'medical'], 'Student Handbook'),

-- Facilities Information
('Lab Booking Procedures',
'Lab Booking at CSIS Department:

**Available Labs**:
1. AI & ML Lab (Room 205) - 30 seats, GPU workstations
2. Networks Lab (Room 207) - 25 seats, Cisco equipment
3. Software Lab (Room 301) - 40 seats, general purpose
4. Data Science Lab (Room 303) - 20 seats, high-performance computing

**Booking Process**:
1. Use SmartAssist or visit CSIS portal
2. Check availability for desired slot
3. Select date, time, and duration (max 3 hours)
4. Provide purpose and expected attendees
5. Submit for admin approval

**Booking Rules**:
- Advance booking: Minimum 24 hours, maximum 2 weeks
- Cancellation: Must cancel 12 hours before slot
- Equipment requests: Specify during booking
- Weekend bookings: Require additional justification

**Priority**:
1. Academic classes
2. Research activities
3. Student projects
4. Club activities

Contact: csis-lab@goa.bits-pilani.ac.in',
'facilities', ARRAY['lab', 'booking', 'reservation', 'room'], 'CSIS Lab Guidelines'),

('Library Services',
'Academic Library - BITS Pilani Goa Campus:

**Operating Hours**:
- Weekdays: 8:00 AM - 11:00 PM
- Weekends: 9:00 AM - 9:00 PM
- Exam Period: Extended to midnight

**Services**:
1. Book lending (7 books for 14 days)
2. Digital library access (IEEE, ACM, Springer, etc.)
3. Inter-library loan facility
4. Printing and scanning (nominal charges)
5. Discussion rooms (book on LibCal)
6. Research assistance

**Digital Resources**:
- Access 500+ databases from campus network
- VPN available for off-campus access
- E-books and journals available 24/7

**Fines**:
- Overdue: Rs. 5 per day per book
- Lost/damaged: Replacement cost + 25% processing fee

Contact: library@goa.bits-pilani.ac.in
Source: Library User Guide 2025',
'facilities', ARRAY['library', 'books', 'reading', 'digital', 'study'], 'Library User Guide'),

-- Events and Activities
('Club Activities Registration',
'Student Club Activities at BITS Pilani Goa Campus:

**Technical Clubs (CSIS related)**:
- ACM Student Chapter: Competitive programming, workshops
- IEEE Computer Society: Technical talks, hackathons
- Google Developer Student Clubs: App development, cloud computing
- Cybersecurity Club: CTFs, security workshops

**Registration**:
1. Attend induction sessions (held in first month of semester)
2. Fill registration form on club website
3. Pay nominal membership fee (if applicable)
4. Attend regular meetings and events

**Starting a New Club**:
1. Minimum 20 interested students
2. Faculty advisor required
3. Submit proposal to Student Activity Center
4. Present to Student Union for approval

**Funding**:
- SU grants available for registered clubs
- Sponsorship allowed with permission
- Account with SAC required for funds

Contact: sac@goa.bits-pilani.ac.in',
'events', ARRAY['club', 'activities', 'technical', 'ieee', 'acm'], 'Student Activity Center'),

-- Policies
('Academic Integrity Policy',
'Academic Integrity at BITS Pilani:

**Definition of Academic Misconduct**:
- Plagiarism: Using others'' work without citation
- Cheating: Unauthorized assistance in exams
- Fabrication: Falsifying research data
- Multiple submission: Same work for multiple courses
- Collusion: Unauthorized collaboration

**Consequences**:
1. First offense: Zero in assignment + warning
2. Second offense: F grade in course
3. Third offense: Disciplinary committee review, possible expulsion

**How to Avoid**:
- Cite all sources properly (IEEE/APA format)
- Discuss with faculty if unsure about collaboration
- Use plagiarism checker before submission
- Keep records of your work progress

**Reporting**:
- Use anonymous reporting portal
- Contact program coordinator

Source: Academic Integrity Policy 2025',
'policies', ARRAY['plagiarism', 'cheating', 'integrity', 'ethics', 'misconduct'], 'Academic Integrity Policy'),

('Campus Safety Guidelines',
'Campus Safety at BITS Pilani Goa Campus:

**Emergency Contacts**:
- Security Control Room: +91-832-258-0101
- Medical Center: +91-832-258-0102
- Fire Emergency: +91-832-258-0103

**Safety Protocols**:
1. Carry ID card at all times
2. Report suspicious activities to security
3. Know emergency exit routes in buildings
4. Participate in fire drills

**Medical Facilities**:
- Campus Health Center: 24/7 service
- Ambulance available for emergencies
- Tie-up with Manipal Hospital for serious cases

**Transportation**:
- Campus shuttle: Every 30 minutes (7 AM - 10 PM)
- Late night escort service available
- Visitor vehicles require gate pass

**Hostel Safety**:
- Entry/exit recorded at gates
- Visitors allowed only in designated areas
- Night out permission required for leaving campus

Contact: security@goa.bits-pilani.ac.in',
'policies', ARRAY['safety', 'emergency', 'security', 'medical', 'health'], 'Campus Safety Manual'),

-- FAQ
('Frequently Asked Questions',
'Common Questions at BITS Pilani Goa Campus CSIS Department:

**Q: How do I get my assignment/lab work evaluated?**
A: Submit through the course ERP/Moodle. Lab work is evaluated during lab hours.

**Q: Where can I find course materials?**
A: Check course page on ERP/Moodle or course website shared by instructor.

**Q: How do I contact my course instructor?**
A: Use email listed on course page or visit during office hours.

**Q: What if I have a timetable clash?**
A: Contact course coordinator within first week of classes for alternatives.

**Q: How to apply for project extension?**
A: Email faculty with valid reason at least 3 days before deadline.

**Q: Where is the CSIS office?**
A: D-Block, Room 103, Ground Floor

**Q: How to book meeting with HOD?**
A: Email csis-office@goa.bits-pilani.ac.in for appointment

**Q: What are the coding lab timings?**
A: Labs are open 8 AM - 10 PM on weekdays, subject to availability',
'faq', ARRAY['faq', 'questions', 'help', 'common'], 'CSIS FAQ');

-- Add realtime for campus_documents
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================================
-- ADMIN USER SETUP INSTRUCTIONS
-- ============================================================
-- To create an admin user, follow these steps:
-- 
-- 1. Sign up a new user through the application (or use existing user)
-- 2. Update their role to 'admin' by running this SQL in Supabase SQL Editor:
--
--    UPDATE public.profiles 
--    SET role = 'admin' 
--    WHERE email = 'your-admin-email@example.com';
--
-- OR if you know the user's ID:
--
--    UPDATE public.profiles 
--    SET role = 'admin' 
--    WHERE id = 'user-uuid-here';
--
-- Available roles: 'student', 'professor', 'admin', 'staff'
-- ============================================================
