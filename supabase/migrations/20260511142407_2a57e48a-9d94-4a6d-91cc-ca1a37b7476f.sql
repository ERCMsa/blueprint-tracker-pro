
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS invalidated_by uuid,
  ADD COLUMN IF NOT EXISTS invalidated_at timestamptz,
  ADD COLUMN IF NOT EXISTS invalidation_reason text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS date_validation_projet date,
  ADD COLUMN IF NOT EXISTS date_impression_plans date;
