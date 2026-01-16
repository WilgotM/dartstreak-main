-- Add column to track who didn't show up (walkover loser)
ALTER TABLE tournament_matches 
ADD COLUMN IF NOT EXISTS walkover_loser_id UUID REFERENCES tournament_participants(id);

-- Add comment for documentation
COMMENT ON COLUMN tournament_matches.walkover_loser_id IS 'Participant ID of the player who lost by walkover (did not show up)';
