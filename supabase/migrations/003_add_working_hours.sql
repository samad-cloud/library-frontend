-- Migration: Add working hours to user_preferences
-- Description: Adds working hours configuration for calendar day view highlighting

-- Add working hours columns to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS working_hours_start TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS working_hours_end TIME DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Monday to Friday
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS highlight_working_hours BOOLEAN DEFAULT true;

-- Add check constraint to ensure valid time range
ALTER TABLE public.user_preferences
ADD CONSTRAINT check_working_hours_valid 
CHECK (working_hours_start < working_hours_end);

-- Add check constraint for valid working days (0-6, where 0 is Sunday)
ALTER TABLE public.user_preferences
ADD CONSTRAINT check_working_days_valid
CHECK (working_days <@ ARRAY[0,1,2,3,4,5,6]::integer[]);

-- Create index for user_id if not exists (for performance)
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON public.user_preferences(user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.user_preferences.working_hours_start IS 'Start time of working hours in HH:MM:SS format';
COMMENT ON COLUMN public.user_preferences.working_hours_end IS 'End time of working hours in HH:MM:SS format';
COMMENT ON COLUMN public.user_preferences.working_days IS 'Array of working days (0=Sunday, 1=Monday, ..., 6=Saturday)';
COMMENT ON COLUMN public.user_preferences.timezone IS 'User timezone for working hours calculation';
COMMENT ON COLUMN public.user_preferences.highlight_working_hours IS 'Whether to highlight working hours in calendar views';

-- Optional: Add a more flexible schedule for future enhancement
-- This allows different hours per day if needed later
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS custom_schedule JSONB DEFAULT NULL;

-- Example custom_schedule format:
-- {
--   "monday": {"start": "09:00", "end": "18:00", "enabled": true},
--   "tuesday": {"start": "09:00", "end": "18:00", "enabled": true},
--   "wednesday": {"start": "09:00", "end": "17:00", "enabled": true},
--   "thursday": {"start": "10:00", "end": "19:00", "enabled": true},
--   "friday": {"start": "09:00", "end": "16:00", "enabled": true},
--   "saturday": {"enabled": false},
--   "sunday": {"enabled": false}
-- }

COMMENT ON COLUMN public.user_preferences.custom_schedule IS 'Optional custom schedule per day, overrides default working_hours when set';