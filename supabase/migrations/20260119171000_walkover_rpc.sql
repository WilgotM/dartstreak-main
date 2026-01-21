-- Function to process walkovers for a tournament
-- Moves client-side logic to server-side to prevent race conditions

CREATE OR REPLACE FUNCTION process_tournament_walkovers(p_tournament_id UUID)
RETURNS VOID AS $$
DECLARE
    v_match RECORD;
    v_p1_participant RECORD;
    v_p2_participant RECORD;
    v_p1_active BOOLEAN;
    v_p2_active BOOLEAN;
    v_winner_id UUID;
    v_loser_id UUID;
    v_match_id_sum INTEGER;
    v_next_round INTEGER;
    v_next_match_number INTEGER;
    v_next_match_id UUID;
    v_is_odd_match BOOLEAN;
    v_round_matches_count INTEGER;
    v_completed_matches_count INTEGER;
    v_next_round_start TIMESTAMP WITH TIME ZONE;
    v_signaling_data JSONB;
    v_created_by UUID;
BEGIN
    -- Loop through scheduled matches that are past the timeout (20 seconds)
    FOR v_match IN 
        SELECT tm.*, m.signaling_data 
        FROM tournament_matches tm
        LEFT JOIN matches m ON tm.match_id = m.id
        WHERE tm.tournament_id = p_tournament_id
        AND tm.status = 'scheduled'
        AND tm.scheduled_start_at < (now() - interval '20 seconds')
    LOOP
        -- Get participants
        SELECT * INTO v_p1_participant FROM tournament_participants WHERE id = v_match.player1_participant_id;
        SELECT * INTO v_p2_participant FROM tournament_participants WHERE id = v_match.player2_participant_id;

        IF v_p1_participant IS NULL OR v_p2_participant IS NULL THEN
            CONTINUE;
        END IF;

        -- Check activity if match exists
        v_p1_active := FALSE;
        v_p2_active := FALSE;

        IF v_match.match_id IS NOT NULL THEN
            -- Check if players have thrown
            -- Check P1 activity
            IF v_p1_participant.is_bot THEN
                v_p1_active := TRUE;
            ELSIF v_p1_participant.user_id IS NOT NULL THEN
                PERFORM 1 FROM match_throws WHERE match_id = v_match.match_id AND player_id = v_p1_participant.user_id LIMIT 1;
                IF FOUND THEN v_p1_active := TRUE; END IF;
            END IF;

            -- Check P2 activity
            IF v_p2_participant.is_bot THEN
                v_p2_active := TRUE;
            ELSIF v_p2_participant.user_id IS NOT NULL THEN
                PERFORM 1 FROM match_throws WHERE match_id = v_match.match_id AND player_id = v_p2_participant.user_id LIMIT 1;
                IF FOUND THEN v_p2_active := TRUE; END IF;
            END IF;

            -- If both active, skip walkover
            IF v_p1_active AND v_p2_active THEN
                CONTINUE;
            END IF;
        END IF;

        -- If both are bots, simulate match (random winner)
        IF v_p1_participant.is_bot AND v_p2_participant.is_bot THEN
             -- Simple 50/50 for bots if they somehow timed out (should be handled by auto-sim but safe fallback)
            IF random() < 0.5 THEN
                v_winner_id := v_p1_participant.id;
                v_loser_id := v_p2_participant.id;
            ELSE
                v_winner_id := v_p2_participant.id;
                v_loser_id := v_p1_participant.id;
            END IF;
        
        -- Determine winner based on who showed up
        ELSIF v_p1_participant.is_bot AND NOT v_p2_participant.is_bot THEN
            -- Human p2 didn't show up, Bot p1 wins
            v_winner_id := v_p1_participant.id;
            v_loser_id := v_p2_participant.id;
        ELSIF NOT v_p1_participant.is_bot AND v_p2_participant.is_bot THEN
            -- Human p1 didn't show up, Bot p2 wins
            v_winner_id := v_p2_participant.id;
            v_loser_id := v_p1_participant.id;
        ELSIF v_match.match_id IS NOT NULL THEN
             -- Check who created the match
             v_signaling_data := v_match.signaling_data;
             
             IF v_signaling_data ? 'created_by' THEN
                v_created_by := (v_signaling_data->>'created_by')::UUID;
                
                IF v_p1_participant.user_id = v_created_by THEN
                    v_winner_id := v_p1_participant.id;
                    v_loser_id := v_p2_participant.id;
                ELSIF v_p2_participant.user_id = v_created_by THEN
                    v_winner_id := v_p2_participant.id;
                    v_loser_id := v_p1_participant.id;
                ELSE
                    -- Fallback if created_by doesn't match either (should not happen)
                    v_winner_id := v_p1_participant.id;
                    v_loser_id := v_p2_participant.id;
                END IF;
             ELSE
                -- No created_by, fallback to P1
                v_winner_id := v_p1_participant.id;
                v_loser_id := v_p2_participant.id;
             END IF;
        ELSE
            -- Both humans, no match created -> Deterministic fair random
            -- ASCII sum of ID modulo 2
            v_match_id_sum := 0;
            -- Simple deterministic choice based on hash of ID
            IF ('x' || substr(md5(v_match.id::text), 1, 8))::bit(32)::int % 2 = 0 THEN
                v_winner_id := v_p1_participant.id;
                v_loser_id := v_p2_participant.id;
            ELSE
                v_winner_id := v_p2_participant.id;
                v_loser_id := v_p1_participant.id;
            END IF;
        END IF;

        -- Update Match status if exists
        IF v_match.match_id IS NOT NULL THEN
            UPDATE matches 
            SET status = 'completed', 
                winner_id = (SELECT user_id FROM tournament_participants WHERE id = v_winner_id),
                completed_at = now()
            WHERE id = v_match.match_id;
        END IF;

        -- Update Tournament Match
        UPDATE tournament_matches
        SET winner_participant_id = v_winner_id,
            walkover_loser_id = v_loser_id,
            status = 'completed'
        WHERE id = v_match.id;

        -- Advance Winner Logic
        v_next_round := v_match.round + 1;
        v_next_match_number := CEIL(v_match.match_number::float / 2.0);
        
        SELECT id INTO v_next_match_id 
        FROM tournament_matches 
        WHERE tournament_id = p_tournament_id 
        AND round = v_next_round 
        AND match_number = v_next_match_number;

        IF v_next_match_id IS NULL THEN
            -- Final Match - Tournament Complete
            UPDATE tournaments 
            SET status = 'completed',
                winner_id = v_winner_id,
                completed_at = now()
            WHERE id = p_tournament_id;
        ELSE
            -- Determine slot (p1 or p2)
            v_is_odd_match := (v_match.match_number % 2) = 1;
            
            IF v_is_odd_match THEN
                UPDATE tournament_matches SET player1_participant_id = v_winner_id WHERE id = v_next_match_id;
            ELSE
                 UPDATE tournament_matches SET player2_participant_id = v_winner_id WHERE id = v_next_match_id;
            END IF;

            -- Check if next match is now ready (both players set)
            -- Note: We just updated it, so we check if both slots are filled
            -- But we can't see our own uncommitted update in a different session context? 
            -- No, within same transaction/function it is visible.
            
            -- Prepare next round scheduling
            -- Check if ALL matches in current round are completed
            SELECT count(*) INTO v_round_matches_count 
            FROM tournament_matches 
            WHERE tournament_id = p_tournament_id AND round = v_match.round;

            SELECT count(*) INTO v_completed_matches_count
            FROM tournament_matches 
            WHERE tournament_id = p_tournament_id AND round = v_match.round AND status = 'completed';

            IF v_round_matches_count = v_completed_matches_count THEN
                 v_next_round_start := now() + interval '30 seconds';

                 -- Schedule next round matches that are ready
                 UPDATE tournament_matches
                 SET status = 'scheduled',
                     scheduled_start_at = v_next_round_start
                 WHERE tournament_id = p_tournament_id
                 AND round = v_next_round
                 AND player1_participant_id IS NOT NULL
                 AND player2_participant_id IS NOT NULL;

                 -- Update tournament info
                 UPDATE tournaments
                 SET current_round = v_next_round,
                     round_started_at = v_next_round_start
                 WHERE id = p_tournament_id;
            END IF;
        END IF;

    END LOOP;
END;
$$ LANGUAGE plpgsql;
