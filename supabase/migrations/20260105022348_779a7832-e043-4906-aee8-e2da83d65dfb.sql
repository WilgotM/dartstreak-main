-- Add timezone to profiles table
ALTER TABLE public.profiles 
ADD COLUMN timezone TEXT DEFAULT 'Europe/Stockholm',
ADD COLUMN display_name_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN email_changed_at TIMESTAMP WITH TIME ZONE;