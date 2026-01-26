import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseCloudflareCallsProps {
  matchId: string;
  isPlayer1: boolean;
}

export function useCloudflareCalls({ matchId, isPlayer1 }: UseCloudflareCallsProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>("new");
  const [error, setError] = useState<string | null>(null);
  const [localVideoReady, setLocalVideoReady] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isSubscribedToRemote = useRef(false);

  // Camera controls
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);

  // Track IDs for Cloudflare
  const localTrackIds = useRef<string[]>([]);

  const callCloudflare = async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("video-auth", {
      body: { action, ...payload },
    });
    if (error) throw error;
    return data;
  };

  const initSession = useCallback(async () => {
    if (!matchId) return;

    try {
      setConnectionState("connecting");
      console.log("Initializing Cloudflare Calls session...");

      // Create session
      const sessionData = await callCloudflare("create_session");
      if (!sessionData?.sessionId) {
        throw new Error("No session ID returned");
      }

      console.log("Session created:", sessionData.sessionId);
      setSessionId(sessionData.sessionId);

      // Get user media
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "environment",
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setLocalVideoReady(true);
      setFacingMode("environment");

      // Check zoom capabilities
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min: number; max: number } };
        if (capabilities?.zoom) {
          setMaxZoom(capabilities.zoom.max || 1);
        }
      }

      // Create PeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
        bundlePolicy: "max-bundle",
      });

      peerConnection.current = pc;

      // Handle incoming tracks (from remote peer via SFU)
      pc.ontrack = (event) => {
        console.log("Received remote track:", event.track.kind);
        const newStream = new MediaStream();
        event.streams[0]?.getTracks().forEach(track => newStream.addTrack(track));
        setRemoteStream(newStream);
        setConnectionState("connected");
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("ICE state:", state);
        if (state === "connected" || state === "completed") {
          setConnectionState("connected");
        } else if (state === "failed" || state === "disconnected") {
          setConnectionState(state);
        }
      };

      // Add local tracks as sendonly
      stream.getTracks().forEach((track) => {
        pc.addTransceiver(track, { direction: "sendonly" });
      });

      // Create and send offer to push local tracks
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const pushResponse = await callCloudflare("proxy", {
        path: `/sessions/${sessionData.sessionId}/tracks/new`,
        method: "POST",
        body: {
          sessionDescription: {
            sdp: offer.sdp,
            type: "offer",
          },
          tracks: stream.getTracks().map((t, idx) => ({
            location: "local",
            mid: String(idx),
            trackName: `${isPlayer1 ? "p1" : "p2"}-${t.kind}-${matchId}`,
          })),
        },
      });

      if (pushResponse.sessionDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(pushResponse.sessionDescription));
      }

      // Store track IDs
      if (pushResponse.tracks) {
        localTrackIds.current = pushResponse.tracks.map((t: { trackName: string }) => t.trackName);
      }

      console.log("Published local tracks:", localTrackIds.current);

      // Save session ID to database for opponent to pull
      const updateColumn = isPlayer1 ? "player1_video_track" : "player2_video_track";
      await supabase
        .from("matches")
        .update({ [updateColumn]: sessionData.sessionId } as Record<string, string>)
        .eq("id", matchId);

      setConnectionState("connected");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Cloudflare Calls Error:", err);
      setError(message);
      setConnectionState("failed");
    }
  }, [matchId, isPlayer1]);

  // Subscribe to opponent's tracks
  const subscribeToRemoteTracks = useCallback(async (remoteSessionId: string) => {
    if (!sessionId || !peerConnection.current || isSubscribedToRemote.current) return;

    try {
      console.log("Subscribing to remote session:", remoteSessionId);
      isSubscribedToRemote.current = true;

      const pc = peerConnection.current;

      // Add a recvonly transceiver for incoming video
      pc.addTransceiver("video", { direction: "recvonly" });

      // Create new offer with the recvonly transceiver
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Pull remote tracks
      const pullResponse = await callCloudflare("proxy", {
        path: `/sessions/${sessionId}/tracks/new`,
        method: "POST",
        body: {
          sessionDescription: {
            sdp: offer.sdp,
            type: "offer",
          },
          tracks: [{
            location: "remote",
            sessionId: remoteSessionId,
            trackName: `${isPlayer1 ? "p2" : "p1"}-video-${matchId}`,
          }],
        },
      });

      if (pullResponse.sessionDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(pullResponse.sessionDescription));
      }

      console.log("Subscribed to remote tracks");
    } catch (err) {
      console.error("Error subscribing to remote tracks:", err);
      isSubscribedToRemote.current = false;
    }
  }, [sessionId, matchId, isPlayer1]);

  // Listen for opponent's session ID in database
  useEffect(() => {
    if (!matchId || !sessionId) return;

    const opponentColumn = isPlayer1 ? "player2_video_track" : "player1_video_track";

    // Check current value first
    const checkOpponent = async () => {
      const { data } = await supabase
        .from("matches")
        .select(opponentColumn)
        .eq("id", matchId)
        .single();

      const remoteSessionId = data?.[opponentColumn as keyof typeof data] as string | null;
      if (remoteSessionId && remoteSessionId !== sessionId) {
        await subscribeToRemoteTracks(remoteSessionId);
      }
    };

    checkOpponent();

    // Subscribe to changes
    const channel = supabase
      .channel(`match-video-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        async (payload) => {
          const remoteSessionId = payload.new[opponentColumn] as string | null;
          if (remoteSessionId && remoteSessionId !== sessionId) {
            await subscribeToRemoteTracks(remoteSessionId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, sessionId, isPlayer1, subscribeToRemoteTracks]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current || !peerConnection.current) return;

    const newFacingMode = facingMode === "user" ? "environment" : "user";

    // Stop current tracks
    localStreamRef.current.getTracks().forEach(track => track.stop());

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: newFacingMode,
        },
        audio: false,
      });

      localStreamRef.current = newStream;
      setLocalStream(newStream);
      setFacingMode(newFacingMode);

      // Check zoom for new camera
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min: number; max: number } };
        setMaxZoom(capabilities?.zoom?.max || 1);
        setZoomLevel(1);
      }

      // Replace track in peer connection
      const sender = peerConnection.current.getSenders().find(s => s.track?.kind === "video");
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    } catch (err) {
      console.error("Error switching camera:", err);
    }
  }, [facingMode]);

  // Apply zoom
  const applyZoom = useCallback(async (zoom: number) => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      try {
        await videoTrack.applyConstraints({
          advanced: [{ zoom } as MediaTrackConstraintSet]
        });
        setZoomLevel(zoom);
      } catch (err) {
        console.error("Error applying zoom:", err);
      }
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setSessionId(null);
    setLocalVideoReady(false);
    setConnectionState("new");
    isSubscribedToRemote.current = false;
  }, []);

  return {
    sessionId,
    localStream,
    remoteStream,
    connectionState,
    localVideoReady,
    error,
    initSession,
    cleanup,
    facingMode,
    switchCamera,
    zoomLevel,
    maxZoom,
    applyZoom,
  };
}
