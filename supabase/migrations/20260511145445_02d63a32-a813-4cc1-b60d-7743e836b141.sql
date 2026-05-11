DROP TRIGGER IF EXISTS prevent_task_uncheck ON public.project_tasks;
DROP FUNCTION IF EXISTS public.prevent_uncheck_task();
ALTER TABLE public.projects ALTER COLUMN deadline DROP NOT NULL;