
-- Enum
CREATE TYPE public.app_role AS ENUM ('boss', 'engineer');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'engineer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role);
$$;

-- Get full name helper
CREATE OR REPLACE FUNCTION public.get_full_name(_user_id UUID)
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT full_name FROM public.profiles WHERE id = _user_id;
$$;

-- Profiles RLS
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Boss can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'boss'));
CREATE POLICY "Boss can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'boss'));

-- handle_new_user trigger: create profile from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'engineer')
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  engineer_name TEXT NOT NULL,
  type TEXT NOT NULL,
  deadline DATE NOT NULL,
  responsable TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects viewable by authenticated" ON public.projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Boss insert projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'boss'));
CREATE POLICY "Boss update projects" ON public.projects
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'boss'));
CREATE POLICY "Boss delete projects" ON public.projects
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'boss'));

-- Project tasks
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  done_by UUID REFERENCES public.profiles(id)
);
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- Auto create 4 tasks on project insert
CREATE OR REPLACE FUNCTION public.create_default_tasks()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_tasks (project_id, task_key) VALUES
    (NEW.id, 'plan_created'),
    (NEW.id, 'achat_profile'),
    (NEW.id, 'achat_boulonnerie'),
    (NEW.id, 'piece_finition');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.create_default_tasks();

-- Prevent unchecking tasks
CREATE OR REPLACE FUNCTION public.prevent_uncheck_task()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.is_done = true AND NEW.is_done = false THEN
    RAISE EXCEPTION 'Cannot uncheck a completed task';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prevent_task_uncheck
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.prevent_uncheck_task();

CREATE POLICY "Tasks viewable by authenticated" ON public.project_tasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Boss or responsable update tasks" ON public.project_tasks
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'boss')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_tasks.project_id
        AND p.responsable = public.get_full_name(auth.uid())
    )
  );

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated" ON public.comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert own comments" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own comments" ON public.comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Realtime
ALTER TABLE public.project_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
