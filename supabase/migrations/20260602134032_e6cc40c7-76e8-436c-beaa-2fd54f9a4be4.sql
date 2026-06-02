-- Update default task creation to use _creer / _transmettre subtasks for every step
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
    (NEW.id, 'cnc_finish_creer'),
    (NEW.id, 'cnc_finish_transmettre');
  RETURN NEW;
END;
$function$;

-- Migrate existing simple rows to "_creer" (preserve done state)
UPDATE public.project_tasks SET task_key = 'plan_created_creer'      WHERE task_key = 'plan_created';
UPDATE public.project_tasks SET task_key = 'achat_profile_creer'     WHERE task_key = 'achat_profile';
UPDATE public.project_tasks SET task_key = 'achat_boulonnerie_creer' WHERE task_key = 'achat_boulonnerie';

-- Insert missing "_transmettre" rows for every existing project (not done by default)
INSERT INTO public.project_tasks (project_id, task_key, is_done)
SELECT p.id, sub.k, false
FROM public.projects p
CROSS JOIN (VALUES
  ('plan_created_transmettre'),
  ('achat_profile_transmettre'),
  ('achat_boulonnerie_transmettre')
) AS sub(k)
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_tasks t
  WHERE t.project_id = p.id AND t.task_key = sub.k
);