
-- Bookings table for lab/room reservations
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose TEXT,
  requested_by TEXT NOT NULL DEFAULT 'Guest',
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat conversations
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Venues/Labs reference table
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'lab' CHECK (type IN ('lab', 'seminar_hall', 'conference_room', 'classroom')),
  capacity INTEGER,
  floor TEXT,
  equipment TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "Allow public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update bookings" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Allow public read conversations" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Allow public insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete conversations" ON public.conversations FOR DELETE USING (true);
CREATE POLICY "Allow public read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read venues" ON public.venues FOR SELECT USING (true);

-- Insert sample venues
INSERT INTO public.venues (name, type, capacity, floor, equipment) VALUES
  ('Lab 1 - AI & ML Lab', 'lab', 30, '2nd Floor', ARRAY['GPU Workstations', 'Projector', 'Whiteboard']),
  ('Lab 2 - Networks Lab', 'lab', 25, '2nd Floor', ARRAY['Cisco Routers', 'Switches', 'Projector']),
  ('Lab 3 - Software Lab', 'lab', 40, '3rd Floor', ARRAY['Projector', 'Whiteboard', 'PCs']),
  ('Lab 4 - Data Science Lab', 'lab', 20, '3rd Floor', ARRAY['GPU Servers', 'Large Display', 'Whiteboard']),
  ('Seminar Hall A', 'seminar_hall', 100, '1st Floor', ARRAY['Projector', 'Sound System', 'Podium', 'Recording Equipment']),
  ('Conference Room 101', 'conference_room', 15, '1st Floor', ARRAY['TV Display', 'Video Conferencing', 'Whiteboard']),
  ('Classroom C201', 'classroom', 60, '2nd Floor', ARRAY['Projector', 'Whiteboard', 'Speakers']);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
