-- Create storage bucket for throw videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('throw-videos', 'throw-videos', false);

-- RLS policy: Users can upload their own videos
CREATE POLICY "Users can upload their own videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'throw-videos' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- RLS policy: Users can update their own videos
CREATE POLICY "Users can update their own videos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'throw-videos' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- RLS policy: League members can view videos in their leagues
CREATE POLICY "League members can view throw videos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'throw-videos' 
  AND public.is_league_member((storage.foldername(name))[1]::uuid, auth.uid())
);

-- RLS policy: Users can delete their own videos (for cleanup)
CREATE POLICY "Users can delete their own videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'throw-videos' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Add video_url column to daily_throws table
ALTER TABLE public.daily_throws
ADD COLUMN video_url text;