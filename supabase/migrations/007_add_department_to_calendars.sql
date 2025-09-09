-- Add department column to calendars table
-- This allows setting department at calendar level instead of per event

ALTER TABLE public.calendars 
ADD COLUMN IF NOT EXISTS department department_type;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_calendars_department ON public.calendars(department);

-- Add comment to document the purpose
COMMENT ON COLUMN public.calendars.department IS 'Department type for the calendar - determines which AI assistant processes events from this calendar';