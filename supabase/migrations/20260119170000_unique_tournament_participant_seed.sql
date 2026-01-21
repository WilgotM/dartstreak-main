-- Add unique constraint to prevent duplicate seeds in a tournament
-- This prevents issues where bots might be generated twice for the same seed

ALTER TABLE tournament_participants
ADD CONSTRAINT unique_tournament_participant_seed UNIQUE (tournament_id, seed);
