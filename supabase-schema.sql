-- COWC Wedding App - Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- =============================================
-- 1. USERS TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'couple' CHECK (role IN ('admin', 'coordinator', 'couple')),
  phone TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. WEDDINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_name TEXT NOT NULL,
  couple_user_id UUID REFERENCES public.users(id),
  wedding_date DATE,
  ceremony_time TIME DEFAULT '16:00',
  venue_name TEXT,
  venue_address TEXT,
  guest_count INTEGER DEFAULT 0,
  budget DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  notes TEXT,
  -- Theme fields
  theme_primary_color TEXT DEFAULT '#d4a574',
  theme_secondary_color TEXT DEFAULT '#2d3748',
  theme_accent_color TEXT DEFAULT '#faf9f7',
  theme_vibe TEXT DEFAULT 'Classic Elegant',
  inspiration_photos TEXT[], -- Array of URLs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. COORDINATOR ASSIGNMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.coordinator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  coordinator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_lead BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wedding_id, coordinator_id)
);

-- =============================================
-- 4. TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  assigned_to TEXT DEFAULT 'couple' CHECK (assigned_to IN ('couple', 'coordinator', 'vendor')),
  assigned_user_id UUID REFERENCES public.users(id),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. VENDORS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_email TEXT,
  phone TEXT,
  website TEXT,
  notes TEXT,
  cost DECIMAL(12,2),
  paid DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'booked', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. TIMELINE ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.timeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time TIME,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. CHANGE LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  changed_by_user_id UUID REFERENCES public.users(id),
  change_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_weddings_couple_user ON public.weddings(couple_user_id);
CREATE INDEX IF NOT EXISTS idx_weddings_date ON public.weddings(wedding_date);
CREATE INDEX IF NOT EXISTS idx_tasks_wedding ON public.tasks(wedding_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_vendors_wedding ON public.vendors(wedding_id);
CREATE INDEX IF NOT EXISTS idx_timeline_wedding ON public.timeline_items(wedding_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_assignments_wedding ON public.coordinator_assignments(wedding_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_assignments_coordinator ON public.coordinator_assignments(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users: Can read own profile, admins can read all
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Weddings: Couples see their own, coordinators see assigned, admins see all
CREATE POLICY "Admins can do anything with weddings" ON public.weddings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Couples can view their weddings" ON public.weddings
  FOR SELECT USING (couple_user_id = auth.uid());

CREATE POLICY "Coordinators can view assigned weddings" ON public.weddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coordinator_assignments
      WHERE wedding_id = weddings.id AND coordinator_id = auth.uid()
    )
  );

-- Tasks: Similar to weddings
CREATE POLICY "Admins can do anything with tasks" ON public.tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view tasks for their weddings" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.weddings w
      WHERE w.id = tasks.wedding_id
      AND (w.couple_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.coordinator_assignments ca
        WHERE ca.wedding_id = w.id AND ca.coordinator_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can update tasks for their weddings" ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.weddings w
      WHERE w.id = tasks.wedding_id
      AND (w.couple_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.coordinator_assignments ca
        WHERE ca.wedding_id = w.id AND ca.coordinator_id = auth.uid()
      ))
    )
  );

-- Vendors, Timeline Items, Change Logs - similar patterns
CREATE POLICY "Admins can do anything with vendors" ON public.vendors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can do anything with timeline" ON public.timeline_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can do anything with change_logs" ON public.change_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can do anything with coordinator_assignments" ON public.coordinator_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications: Users can only see their own
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- FUNCTIONS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_weddings_updated_at BEFORE UPDATE ON public.weddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_timeline_items_updated_at BEFORE UPDATE ON public.timeline_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- FUNCTION: Create user profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'couple')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- DONE! Now run the test users script below.
-- =============================================
