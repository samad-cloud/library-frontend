-- Migration: Add unique constraint on user_id in user_preferences
-- Description: Ensures each user can only have one preferences row, preventing duplicates

-- First, let's check if there are any duplicate user_ids and clean them up if needed
-- This will keep only the most recently updated row for each user
DELETE FROM public.user_preferences a
USING public.user_preferences b
WHERE a.user_id = b.user_id 
  AND a.updated_at < b.updated_at;

-- Now add the unique constraint on user_id
-- Drop the constraint if it exists first (for idempotency)
ALTER TABLE public.user_preferences 
DROP CONSTRAINT IF EXISTS user_preferences_user_id_unique;

-- Add the unique constraint
ALTER TABLE public.user_preferences
ADD CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT user_preferences_user_id_unique ON public.user_preferences 
IS 'Ensures each user can only have one preferences row';

-- Also update the upsert behavior comment
COMMENT ON TABLE public.user_preferences 
IS 'Stores user preferences for image generation and calendar display. Each user has exactly one row in this table.';