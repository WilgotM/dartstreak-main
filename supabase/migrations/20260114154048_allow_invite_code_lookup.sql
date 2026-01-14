-- Allow authenticated users to find leagues by invite_code (for joining)
-- This is needed because the existing RLS policy only allows viewing leagues you're already a member of

CREATE POLICY "Anyone can search leagues by invite_code"
ON public.leagues FOR SELECT
USING (auth.uid() IS NOT NULL);
