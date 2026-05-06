
-- Add viewer to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- Update create_default_tasks trigger to include cnc_finish
CREATE OR REPLACE FUNCTION public.create_default_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.project_tasks (project_id, task_key) VALUES
    (NEW.id, 'plan_created'),
    (NEW.id, 'achat_profile'),
    (NEW.id, 'achat_boulonnerie'),
    (NEW.id, 'piece_finition'),
    (NEW.id, 'cnc_finish');
  RETURN NEW;
END;
$function$;

-- Backfill cnc_finish task for existing projects
INSERT INTO public.project_tasks (project_id, task_key, is_done)
SELECT id, 'cnc_finish', false FROM public.projects
WHERE id NOT IN (SELECT project_id FROM public.project_tasks WHERE task_key = 'cnc_finish');
