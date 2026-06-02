-- Split cnc_finish and piece_finition into two subtasks each: "creer" and "transmettre".
-- 1. Update default task creation function to insert subtasks instead of single rows.
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
    (NEW.id, 'piece_finition_creer'),
    (NEW.id, 'piece_finition_transmettre'),
    (NEW.id, 'cnc_finish_creer'),
    (NEW.id, 'cnc_finish_transmettre');
  RETURN NEW;
END;
$function$;

-- 2. Migrate existing rows: rename old single rows to "_creer" (preserving done state)
UPDATE public.project_tasks SET task_key = 'cnc_finish_creer' WHERE task_key = 'cnc_finish';
UPDATE public.project_tasks SET task_key = 'piece_finition_creer' WHERE task_key = 'piece_finition';

-- 3. Insert missing "_transmettre" rows for every existing project (not done by default)
INSERT INTO public.project_tasks (project_id, task_key, is_done)
SELECT p.id, 'cnc_finish_transmettre', false
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_tasks t
  WHERE t.project_id = p.id AND t.task_key = 'cnc_finish_transmettre'
);

INSERT INTO public.project_tasks (project_id, task_key, is_done)
SELECT p.id, 'piece_finition_transmettre', false
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_tasks t
  WHERE t.project_id = p.id AND t.task_key = 'piece_finition_transmettre'
);