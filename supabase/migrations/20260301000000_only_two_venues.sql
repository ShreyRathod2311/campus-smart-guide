-- Replace all venues with only D-153 and CC Lab
DELETE FROM public.venues;

INSERT INTO public.venues (name, type, capacity, floor, equipment) VALUES
  ('D-153', 'lab', 30, 'Ground Floor', ARRAY['PCs', 'Projector', 'Whiteboard']),
  ('CC Lab', 'lab', 40, 'Ground Floor', ARRAY['PCs', 'Projector', 'Whiteboard', 'Printers']);
