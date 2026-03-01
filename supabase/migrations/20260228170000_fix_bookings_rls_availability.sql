-- Fix bookings RLS policies:
-- 1. All authenticated users should be able to SEE all bookings (for availability checks)
-- 2. Admins should see all bookings for approvals
-- 3. Only own bookings can be inserted/updated

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can read their own bookings" ON public.bookings;

-- Allow all authenticated users to read ALL bookings (needed for availability grid)
CREATE POLICY "Authenticated users can read all bookings" ON public.bookings 
  FOR SELECT TO authenticated USING (true);

-- Also allow anon read for public availability checks (optional, safe since bookings are not sensitive)
-- CREATE POLICY "Public can read bookings" ON public.bookings FOR SELECT USING (true);

-- Admins can update any booking (for approvals/rejections)
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

CREATE POLICY "Users can update their own bookings" ON public.bookings 
  FOR UPDATE TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
