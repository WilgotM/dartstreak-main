import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Friend {
  id: string;
  display_name: string;
  friendship_id: string;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_user_name: string;
  status: string;
  created_at: string;
}

export interface LeagueInvite {
  id: string;
  league_id: string;
  league_name: string;
  from_user_id: string;
  from_user_name: string;
  status: string;
  created_at: string;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [leagueInvites, setLeagueInvites] = useState<LeagueInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    // Fetch friendships where user is either user_id or friend_id
    const { data: friendships } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (friendships) {
      const friendIds = friendships.map((f) =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", friendIds);

        if (profiles) {
          const friendsList: Friend[] = profiles.map((p) => ({
            id: p.id,
            display_name: p.display_name,
            friendship_id: friendships.find(
              (f) => f.user_id === p.id || f.friend_id === p.id
            )?.id || "",
          }));
          setFriends(friendsList);
        }
      } else {
        setFriends([]);
      }
    }
  }, [user]);

  const fetchRequests = useCallback(async () => {
    if (!user) return;

    // Fetch incoming requests
    const { data: incoming } = await supabase
      .from("friend_requests")
      .select("id, from_user_id, to_user_id, status, created_at")
      .eq("to_user_id", user.id)
      .eq("status", "pending");

    if (incoming && incoming.length > 0) {
      const fromUserIds = incoming.map((r) => r.from_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", fromUserIds);

      const requestsWithNames: FriendRequest[] = incoming.map((r) => ({
        ...r,
        from_user_name:
          profiles?.find((p) => p.id === r.from_user_id)?.display_name || "Unknown",
      }));
      setIncomingRequests(requestsWithNames);
    } else {
      setIncomingRequests([]);
    }

    // Fetch outgoing requests
    const { data: outgoing } = await supabase
      .from("friend_requests")
      .select("id, from_user_id, to_user_id, status, created_at")
      .eq("from_user_id", user.id)
      .eq("status", "pending");

    if (outgoing && outgoing.length > 0) {
      const toUserIds = outgoing.map((r) => r.to_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", toUserIds);

      const requestsWithNames: FriendRequest[] = outgoing.map((r) => ({
        ...r,
        from_user_name:
          profiles?.find((p) => p.id === r.to_user_id)?.display_name || "Unknown",
      }));
      setOutgoingRequests(requestsWithNames);
    } else {
      setOutgoingRequests([]);
    }
  }, [user]);

  const fetchLeagueInvites = useCallback(async () => {
    if (!user) return;

    const { data: invites } = await supabase
      .from("league_invites")
      .select("id, league_id, from_user_id, status, created_at")
      .eq("to_user_id", user.id)
      .eq("status", "pending");

    if (invites && invites.length > 0) {
      const leagueIds = invites.map((i) => i.league_id);
      const fromUserIds = invites.map((i) => i.from_user_id);

      const [{ data: leagues }, { data: profiles }] = await Promise.all([
        supabase.from("leagues").select("id, name").in("id", leagueIds),
        supabase.from("profiles").select("id, display_name").in("id", fromUserIds),
      ]);

      const invitesWithDetails: LeagueInvite[] = invites.map((i) => ({
        ...i,
        league_name: leagues?.find((l) => l.id === i.league_id)?.name || "Unknown",
        from_user_name:
          profiles?.find((p) => p.id === i.from_user_id)?.display_name || "Unknown",
      }));
      setLeagueInvites(invitesWithDetails);
    } else {
      setLeagueInvites([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchFriends(), fetchRequests(), fetchLeagueInvites()]).finally(
        () => setLoading(false)
      );

      // Setup realtime subscriptions for friend requests and league invites
      const friendRequestsChannel = supabase
        .channel("friend-requests-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friend_requests",
            filter: `to_user_id=eq.${user.id}`,
          },
          () => {
            fetchRequests();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friend_requests",
            filter: `from_user_id=eq.${user.id}`,
          },
          () => {
            fetchRequests();
          }
        )
        .subscribe();

      const leagueInvitesChannel = supabase
        .channel("league-invites-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "league_invites",
            filter: `to_user_id=eq.${user.id}`,
          },
          () => {
            fetchLeagueInvites();
          }
        )
        .subscribe();

      const friendshipsChannel = supabase
        .channel("friendships-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friendships",
          },
          () => {
            fetchFriends();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(friendRequestsChannel);
        supabase.removeChannel(leagueInvitesChannel);
        supabase.removeChannel(friendshipsChannel);
      };
    }
  }, [user, fetchFriends, fetchRequests, fetchLeagueInvites]);

  const sendFriendRequest = async (username: string) => {
    if (!user) return { error: "Not authenticated" };

    // Find user by display_name
    const { data: profile, error: findError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("display_name", username)
      .maybeSingle();

    if (findError || !profile) {
      return { error: "User not found" };
    }

    if (profile.id === user.id) {
      return { error: "Cannot send request to yourself" };
    }

    // Check if already friends
    const { data: existingFriendship } = await supabase
      .from("friendships")
      .select("id")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existingFriendship) {
      return { error: "Already friends" };
    }

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from("friend_requests")
      .select("id, status")
      .or(
        `and(from_user_id.eq.${user.id},to_user_id.eq.${profile.id}),and(from_user_id.eq.${profile.id},to_user_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return { error: "Request already pending" };
      }
    }

    const { error } = await supabase.from("friend_requests").insert({
      from_user_id: user.id,
      to_user_id: profile.id,
    });

    if (error) {
      return { error: "Could not send request" };
    }

    await fetchRequests();
    return { error: null };
  };

  const acceptFriendRequest = async (requestId: string) => {
    if (!user) return;

    const request = incomingRequests.find((r) => r.id === requestId);
    if (!request) return;

    // Create friendship (both directions for easier querying)
    await supabase.from("friendships").insert({
      user_id: user.id,
      friend_id: request.from_user_id,
    });

    // Update request status
    await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    await Promise.all([fetchFriends(), fetchRequests()]);
  };

  const rejectFriendRequest = async (requestId: string) => {
    await supabase
      .from("friend_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    await fetchRequests();
  };

  const cancelFriendRequest = async (requestId: string) => {
    await supabase.from("friend_requests").delete().eq("id", requestId);
    await fetchRequests();
  };

  const removeFriend = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    await fetchFriends();
  };

  const sendLeagueInvite = async (leagueId: string, friendId: string) => {
    if (!user) return { error: "Not authenticated" };

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("league_members")
      .select("id")
      .eq("league_id", leagueId)
      .eq("user_id", friendId)
      .maybeSingle();

    if (existingMember) {
      return { error: "Already a member" };
    }

    const { error } = await supabase.from("league_invites").insert({
      league_id: leagueId,
      from_user_id: user.id,
      to_user_id: friendId,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "Already invited" };
      }
      return { error: "Could not send invite" };
    }

    return { error: null };
  };

  const acceptLeagueInvite = async (inviteId: string) => {
    if (!user) return;

    const invite = leagueInvites.find((i) => i.id === inviteId);
    if (!invite) return;

    // Join the league
    await supabase.from("league_members").insert({
      league_id: invite.league_id,
      user_id: user.id,
    });

    // Update invite status
    await supabase
      .from("league_invites")
      .update({ status: "accepted" })
      .eq("id", inviteId);

    await fetchLeagueInvites();
    return invite.league_id;
  };

  const rejectLeagueInvite = async (inviteId: string) => {
    await supabase
      .from("league_invites")
      .update({ status: "rejected" })
      .eq("id", inviteId);

    await fetchLeagueInvites();
  };

  const totalNotifications = incomingRequests.length + leagueInvites.length;

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    leagueInvites,
    loading,
    totalNotifications,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    sendLeagueInvite,
    acceptLeagueInvite,
    rejectLeagueInvite,
    refetch: () => Promise.all([fetchFriends(), fetchRequests(), fetchLeagueInvites()]),
  };
}
