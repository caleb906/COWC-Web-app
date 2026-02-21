-- COWC Wedding App - Test Users
-- Run this AFTER the schema, in Supabase SQL Editor
--
-- IMPORTANT: You also need to create these users in Supabase Auth!
-- Go to: Dashboard > Authentication > Users > Add User
-- Create each user with these emails and a password like 'testpass123'

-- First, we need to insert users manually since auth.users is managed by Supabase Auth
-- These will be created automatically when users sign up via the handle_new_user trigger

-- For testing, you can manually insert into public.users if the auth users exist:
-- (Replace the UUIDs with actual auth.users IDs after creating them in the Auth dashboard)

-- Option 1: If you want to test WITHOUT auth, temporarily disable RLS:
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.weddings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.vendors DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.timeline_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.coordinator_assignments DISABLE ROW LEVEL SECURITY;

-- Then insert test data:
INSERT INTO public.users (id, email, full_name, role, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'amanda@cowc.com', 'Amanda Hoffmann', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'coordinator@cowc.com', 'Sarah Johnson', 'coordinator', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'couple@cowc.com', 'Jessica Miller', 'couple', 'active')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Insert a sample wedding
INSERT INTO public.weddings (id, couple_name, couple_user_id, wedding_date, venue_name, venue_address, guest_count, budget, status, theme_vibe) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Jessica & Michael', '00000000-0000-0000-0000-000000000003', '2026-06-15', 'Brasada Ranch', 'Brasada Ranch, Bend, OR', 150, 45000, 'active', 'Mountain Elegant')
ON CONFLICT (id) DO NOTHING;

-- Assign coordinator to the wedding
INSERT INTO public.coordinator_assignments (wedding_id, coordinator_id, is_lead) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', true)
ON CONFLICT (wedding_id, coordinator_id) DO NOTHING;

-- Insert sample tasks
INSERT INTO public.tasks (wedding_id, title, description, due_date, assigned_to, completed) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Book photographer', 'Research and book wedding photographer', '2026-02-01', 'couple', false),
  ('10000000-0000-0000-0000-000000000001', 'Send save the dates', 'Design and mail save the date cards', '2026-02-15', 'couple', false),
  ('10000000-0000-0000-0000-000000000001', 'Venue walkthrough', 'Schedule walkthrough with venue coordinator', '2026-03-01', 'coordinator', false),
  ('10000000-0000-0000-0000-000000000001', 'Finalize guest list', 'Confirm final guest count with venue', '2026-04-01', 'couple', false),
  ('10000000-0000-0000-0000-000000000001', 'Book florist', 'Select and book florist', '2026-02-20', 'couple', true);

-- Insert sample vendors
INSERT INTO public.vendors (wedding_id, name, category, contact_email, phone, status) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Mountain Light Photography', 'photographer', 'info@mountainlight.com', '541-555-0101', 'booked'),
  ('10000000-0000-0000-0000-000000000001', 'Bend Floral Design', 'florist', 'hello@bendfloral.com', '541-555-0102', 'pending'),
  ('10000000-0000-0000-0000-000000000001', 'Central Oregon Catering', 'caterer', 'events@coregoncatering.com', '541-555-0103', 'booked');

-- Insert sample timeline
INSERT INTO public.timeline_items (wedding_id, title, time, description, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Guest Arrival', '15:30', 'Guests begin arriving at venue', 1),
  ('10000000-0000-0000-0000-000000000001', 'Ceremony', '16:00', 'Wedding ceremony begins', 2),
  ('10000000-0000-0000-0000-000000000001', 'Cocktail Hour', '16:45', 'Cocktails and appetizers', 3),
  ('10000000-0000-0000-0000-000000000001', 'Reception', '18:00', 'Dinner and celebration', 4),
  ('10000000-0000-0000-0000-000000000001', 'First Dance', '19:00', 'Couple''s first dance', 5),
  ('10000000-0000-0000-0000-000000000001', 'Cake Cutting', '20:00', 'Wedding cake cutting ceremony', 6),
  ('10000000-0000-0000-0000-000000000001', 'Send Off', '22:00', 'Sparkler send-off', 7);

SELECT 'Test data inserted successfully!' as result;
