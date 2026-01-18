import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get today's date string in a specific timezone
function getTodayInTimezone(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // Format returns YYYY-MM-DD for sv-SE locale
    return formatter.format(now);
  } catch {
    // Fallback to UTC if timezone is invalid
    console.warn(`Invalid timezone: ${timezone}, falling back to UTC`);
    return new Date().toISOString().split("T")[0];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting timezone-aware cleanup of old throw videos...");

    // Fetch all leagues with their creator's timezone
    const { data: leagues, error: leaguesError } = await supabase
      .from("leagues")
      .select(`
        id,
        name,
        profiles!leagues_created_by_fkey (
          timezone
        )
      `);

    if (leaguesError) {
      console.error("Error fetching leagues:", leaguesError);
      throw leaguesError;
    }

    // Build a map of league_id -> today's date in that league's timezone
    const leagueTimezones: Map<string, string> = new Map();
    for (const league of leagues || []) {
      const timezone = (league.profiles as { timezone?: string })?.timezone || "Europe/Stockholm";
      const todayInTz = getTodayInTimezone(timezone);
      leagueTimezones.set(league.id, todayInTz);
      console.log(`League "${league.name}": today is ${todayInTz} in ${timezone}`);
    }

    // List all files in the throw-videos bucket
    const { data: folders, error: listError } = await supabase.storage
      .from("throw-videos")
      .list("", { limit: 1000 });

    if (listError) {
      console.error("Error listing folders:", listError);
      throw listError;
    }

    let totalDeleted = 0;
    const filesToDelete: string[] = [];

    // Iterate through league folders (folder.name = league_id)
    for (const folder of folders || []) {
      if (!folder.name) continue;

      const leagueId = folder.name;
      const todayForLeague = leagueTimezones.get(leagueId);

      if (!todayForLeague) {
        // Unknown league (maybe deleted), use UTC as fallback
        console.log(`League ${leagueId} not found, using UTC fallback`);
      }

      const cutoffDate = todayForLeague || new Date().toISOString().split("T")[0];

      // List user folders within each league
      const { data: userFolders, error: userListError } = await supabase.storage
        .from("throw-videos")
        .list(folder.name, { limit: 1000 });

      if (userListError) {
        console.error(`Error listing user folders in ${folder.name}:`, userListError);
        continue;
      }

      for (const userFolder of userFolders || []) {
        if (!userFolder.name) continue;

        // List videos within each user folder
        const { data: videos, error: videoListError } = await supabase.storage
          .from("throw-videos")
          .list(`${folder.name}/${userFolder.name}`, { limit: 1000 });

        if (videoListError) {
          console.error(`Error listing videos in ${folder.name}/${userFolder.name}:`, videoListError);
          continue;
        }

        for (const video of videos || []) {
          if (!video.name) continue;

          // Extract date from filename (format: YYYY-MM-DD.webm)
          const dateMatch = video.name.match(/^(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            const videoDate = dateMatch[1];
            // Delete videos from before "today" in this league's timezone
            if (videoDate < cutoffDate) {
              filesToDelete.push(`${folder.name}/${userFolder.name}/${video.name}`);
            }
          }
        }
      }
    }

    // Delete old files in batches
    if (filesToDelete.length > 0) {
      console.log(`Found ${filesToDelete.length} old videos to delete`);

      const { error: deleteError } = await supabase.storage
        .from("throw-videos")
        .remove(filesToDelete);

      if (deleteError) {
        console.error("Error deleting files:", deleteError);
        throw deleteError;
      }

      totalDeleted = filesToDelete.length;
      console.log(`Successfully deleted ${totalDeleted} old videos`);
    } else {
      console.log("No old videos found to delete");
    }

    // Clear video_url references in daily_throws per league, respecting timezone
    for (const [leagueId, todayForLeague] of leagueTimezones) {
      const { error: updateError } = await supabase
        .from("daily_throws")
        .update({ video_url: null })
        .eq("league_id", leagueId)
        .lt("throw_date", todayForLeague)
        .not("video_url", "is", null);

      if (updateError) {
        console.error(`Error updating daily_throws for league ${leagueId}:`, updateError);
      }
    }
    console.log("Cleared video_url references for old throws (timezone-aware)");

    // Cleanup stale matches (active/pending matches older than 1 hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const matchCutoffTime = oneHourAgo.toISOString();

    console.log(`Deleting active/pending matches older than: ${matchCutoffTime}`);

    // First, delete match_throws for stale matches
    const { data: staleMatches, error: staleMatchesError } = await supabase
      .from("matches")
      .select("id")
      .in("status", ["active", "pending"])
      .lt("created_at", matchCutoffTime);

    if (staleMatchesError) {
      console.error("Error fetching stale matches:", staleMatchesError);
    } else if (staleMatches && staleMatches.length > 0) {
      const staleMatchIds = staleMatches.map((m) => m.id);
      console.log(`Found ${staleMatchIds.length} stale matches to delete`);

      // Delete match_throws first
      const { error: throwsDeleteError } = await supabase
        .from("match_throws")
        .delete()
        .in("match_id", staleMatchIds);

      if (throwsDeleteError) {
        console.error("Error deleting match throws:", throwsDeleteError);
      }

      // Delete match_signals
      const { error: signalsDeleteError } = await supabase
        .from("match_signals")
        .delete()
        .in("match_id", staleMatchIds);

      if (signalsDeleteError) {
        console.error("Error deleting match signals:", signalsDeleteError);
      }

      // Delete the matches
      const { error: matchDeleteError } = await supabase
        .from("matches")
        .delete()
        .in("id", staleMatchIds);

      if (matchDeleteError) {
        console.error("Error deleting stale matches:", matchDeleteError);
      } else {
        console.log(`Successfully deleted ${staleMatchIds.length} stale matches`);
      }
    } else {
      console.log("No stale matches found to delete");
    }

    // Cleanup stale tournaments (open tournaments older than 24 hours without activity)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const tournamentCutoffTime = twentyFourHoursAgo.toISOString();

    console.log(`Cleaning up stale tournaments older than: ${tournamentCutoffTime}`);

    // Get stale open tournaments
    const { data: staleTournaments, error: staleTournamentsError } = await supabase
      .from("tournaments")
      .select("id")
      .eq("status", "open")
      .lt("created_at", tournamentCutoffTime);

    if (staleTournamentsError) {
      console.error("Error fetching stale tournaments:", staleTournamentsError);
    } else if (staleTournaments && staleTournaments.length > 0) {
      const staleTournamentIds = staleTournaments.map((t) => t.id);
      console.log(`Found ${staleTournamentIds.length} stale tournaments to delete`);

      // Delete tournament invites
      const { error: invitesDeleteError } = await supabase
        .from("tournament_invites")
        .delete()
        .in("tournament_id", staleTournamentIds);

      if (invitesDeleteError) {
        console.error("Error deleting tournament invites:", invitesDeleteError);
      }

      // Delete tournament participants
      const { error: participantsDeleteError } = await supabase
        .from("tournament_participants")
        .delete()
        .in("tournament_id", staleTournamentIds);

      if (participantsDeleteError) {
        console.error("Error deleting tournament participants:", participantsDeleteError);
      }

      // Delete tournament matches
      const { error: tournamentMatchesDeleteError } = await supabase
        .from("tournament_matches")
        .delete()
        .in("tournament_id", staleTournamentIds);

      if (tournamentMatchesDeleteError) {
        console.error("Error deleting tournament matches:", tournamentMatchesDeleteError);
      }

      // Delete the tournaments
      const { error: tournamentDeleteError } = await supabase
        .from("tournaments")
        .delete()
        .in("id", staleTournamentIds);

      if (tournamentDeleteError) {
        console.error("Error deleting stale tournaments:", tournamentDeleteError);
      } else {
        console.log(`Successfully deleted ${staleTournamentIds.length} stale tournaments`);
      }
    } else {
      console.log("No stale tournaments found to delete");
    }

    // Cleanup in_progress tournaments older than 6 hours (likely abandoned)
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
    const inProgressCutoffTime = sixHoursAgo.toISOString();

    const { data: abandonedTournaments, error: abandonedError } = await supabase
      .from("tournaments")
      .select("id")
      .eq("status", "in_progress")
      .lt("started_at", inProgressCutoffTime);

    if (abandonedError) {
      console.error("Error fetching abandoned tournaments:", abandonedError);
    } else if (abandonedTournaments && abandonedTournaments.length > 0) {
      const abandonedIds = abandonedTournaments.map((t) => t.id);
      console.log(`Found ${abandonedIds.length} abandoned in-progress tournaments`);

      // Delete related data
      await supabase.from("tournament_invites").delete().in("tournament_id", abandonedIds);
      await supabase.from("tournament_participants").delete().in("tournament_id", abandonedIds);
      await supabase.from("tournament_matches").delete().in("tournament_id", abandonedIds);

      const { error: abandonedDeleteError } = await supabase
        .from("tournaments")
        .delete()
        .in("id", abandonedIds);

      if (!abandonedDeleteError) {
        console.log(`Successfully deleted ${abandonedIds.length} abandoned tournaments`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedVideos: totalDeleted,
        leaguesProcessed: leagueTimezones.size,
        matchesCutoff: matchCutoffTime,
        tournamentCutoff: tournamentCutoffTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Cleanup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
