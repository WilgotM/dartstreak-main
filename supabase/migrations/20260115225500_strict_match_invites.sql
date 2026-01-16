-- Add throw_time_limit column to matches (in seconds, max 100, default 80)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS throw_time_limit INTEGER DEFAULT 80;

-- Add expires_at column for pending match invites (2 minutes from creation)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add last_throw_at column to track when the current player started their turn
ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_throw_at TIMESTAMPTZ;

-- Create an index for finding expired pending matches
CREATE INDEX IF NOT EXISTS idx_matches_expires_at ON matches(expires_at) WHERE status = 'pending';

-- Function to clean up expired pending matches
CREATE OR REPLACE FUNCTION cleanup_expired_pending_matches()
RETURNS void AS $$
BEGIN
  -- Delete match_throws for expired pending matches
  DELETE FROM match_throws 
  WHERE match_id IN (
    SELECT id FROM matches 
    WHERE status = 'pending' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW()
  );
  
  -- Delete match_signals for expired pending matches  
  DELETE FROM match_signals
  WHERE match_id IN (
    SELECT id FROM matches 
    WHERE status = 'pending' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW()
  );
  
  -- Delete the expired pending matches
  DELETE FROM matches 
  WHERE status = 'pending' 
  AND expires_at IS NOT NULL 
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON COLUMN matches.throw_time_limit IS 'Time in seconds each player has per throw (max 100, default 80)';
COMMENT ON COLUMN matches.expires_at IS 'For pending matches: when the invite expires (2 minutes from creation)';
COMMENT ON COLUMN matches.last_throw_at IS 'Timestamp when current player''s turn started, used for throw timeout';
