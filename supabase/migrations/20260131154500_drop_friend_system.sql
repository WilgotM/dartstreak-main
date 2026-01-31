-- Drop friend system tables and functions
-- This migration removes the entire friend system as it's no longer needed
-- Users now join leagues only via invite codes

-- Drop tables (cascade will handle foreign keys and policies)
DROP TABLE IF EXISTS public.league_invites CASCADE;
DROP TABLE IF EXISTS public.friend_requests CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;

-- Drop helper function
DROP FUNCTION IF EXISTS public.are_friends(uuid, uuid);
