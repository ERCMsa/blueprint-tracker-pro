
-- Remove CNC transmettre subtask entirely
DELETE FROM public.project_tasks WHERE task_key = 'cnc_finish_transmettre';

-- Update the default tasks function: CNC is now standalone
CREATE OR REPLACE FUNCTION public.create_default_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.project_tasks (project_id, task_key) VALUES
    (NEW.id, 'plan_created_creer'),
    (NEW.id, 'plan_created_transmettre'),
    (NEW.id, 'achat_profile_creer'),
    (NEW.id, 'achat_profile_transmettre'),
    (NEW.id, 'achat_boulonnerie_creer'),
    (NEW.id, 'achat_boulonnerie_transmettre'),
    (NEW.id, 'piece_finition_creer'),
    (NEW.id, 'piece_finition_transmettre'),
    (NEW.id, 'cnc_finish');
  RETURN NEW;
END;
$function$;

-- Create cnc_finish row for any existing projects missing it
INSERT INTO public.project_tasks (project_id, task_key)
SELECT p.id, 'cnc_finish'
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_tasks t
  WHERE t.project_id = p.id AND t.task_key = 'cnc_finish'
);

-- Issues table
CREATE TABLE public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO authenticated;
GRANT ALL ON public.issues TO service_role;

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issues viewable by authenticated"
  ON public.issues FOR SELECT TO authenticated USING (true);

CREATE POLICY "Boss can insert issues"
  ON public.issues FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'boss'::app_role) AND created_by = auth.uid());

CREATE POLICY "Boss can delete issues"
  ON public.issues FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'boss'::app_role));

CREATE INDEX issues_project_id_idx ON public.issues(project_id);
