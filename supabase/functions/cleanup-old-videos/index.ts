import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting cleanup of old throw videos and stale matches...");

    // Get today's date (videos from before today should be deleted)
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

    console.log(`Deleting videos from before: ${todayStr}`);

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

    // Iterate through league folders
    for (const folder of folders || []) {
      if (!folder.name) continue;

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
            // Delete videos from before today
            if (videoDate < todayStr) {
              filesToDelete.push(`${folder.name}/${userFolder.name}/${video.name}`);
            }
          }
        }
      }
    }

    // Delete old files in batches
    if (filesToDelete.length > 0) {
      console.log(`Found ${filesToDelete.length} old videos to delete`);
      
      const { data: deleteData, error: deleteError } = await supabase.storage
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

    // Clear video_url references in daily_throws for videos from before today
    const { error: updateError } = await supabase
      .from("daily_throws")
      .update({ video_url: null })
      .lt("throw_date", todayStr)
      .not("video_url", "is", null);

    if (updateError) {
      console.error("Error updating daily_throws:", updateError);
    } else {
      console.log("Cleared video_url references for old throws");
    }

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
        cutoffDate: todayStr,
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
