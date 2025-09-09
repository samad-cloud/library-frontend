-- Create department enum type for better type safety
CREATE TYPE department_type AS ENUM (
  'email_marketing',
  'google_sem', 
  'groupon',
  'social_media'
);

-- Update calendar_events table to use the enum type
ALTER TABLE calendar_events 
ALTER COLUMN department TYPE department_type 
USING department::department_type;

-- Add constraint to ensure only valid departments
ALTER TABLE calendar_events
ADD CONSTRAINT calendar_events_department_check 
CHECK (department IN ('email_marketing', 'google_sem', 'groupon', 'social_media'));