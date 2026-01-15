import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SignalPayload {
  type: string;
  sdp?: string;
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  signalType?: string;
  from?: string;
}

export function useRemoteCamera(matchId?: string) {
  const { user } = useAuth();
  const [remoteCameraStream, setRemoteCameraStream] = useState<MediaStream | null>(null);
  const [remoteCameraState, setRemoteCameraState] = useState<string>("new");

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const isReady = useRef(false);

  const sendSignal = useCallback(
    async (signalType: string, payload: SignalPayload) => {
      if (!channelRef.current) {
        console.warn("[RemoteCamera Desktop] No channel");
        return;
      }
      console.log(`[RemoteCamera Desktop] Sending ${signalType}`);
      await channelRef.current.send({
        type: "broadcast",
        event: "camera-signal",
        payload: { signalType, ...payload, from: "desktop" },
      });
    },
    []
  );

  const processSignal = useCallback(
    async (signalType: string, payload: SignalPayload) => {
      if (!peerConnection.current) {
        console.warn("[RemoteCamera Desktop] No peer connection");
        return;
      }

      console.log(`[RemoteCamera Desktop] Processing ${signalType}`);

      try {
        if (signalType === "offer") {
          // Reset connection for new offer
          if (peerConnection.current.signalingState !== "stable") {
            console.log("[RemoteCamera Desktop] Resetting connection for new offer");
            await peerConnection.current.setLocalDescription({ type: "rollback" }).catch(() => {});
          }

          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: payload.sdp })
          );
          console.log("[RemoteCamera Desktop] Remote description set");

          // Process queued candidates
          while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift()!;
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          }

          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          await sendSignal("answer", { type: "answer", sdp: answer.sdp });
          console.log("[RemoteCamera Desktop] Answer sent");

        } else if (signalType === "candidate" && payload.candidate) {
          const candidate: RTCIceCandidateInit = {
            candidate: payload.candidate,
            sdpMid: payload.sdpMid,
            sdpMLineIndex: payload.sdpMLineIndex,
          };

          if (peerConnection.current.remoteDescription) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            iceCandidateQueue.current.push(candidate);
          }
        }
      } catch (error) {
        console.error(`[RemoteCamera Desktop] Error processing ${signalType}:`, error);
      }
    },
    [sendSignal]
  );

  const initializeRemoteCameraReceiver = useCallback(async () => {
    if (!matchId || !user) {
      console.error("[RemoteCamera Desktop] No matchId or user");
      return false;
    }

    if (isReady.current) {
      console.log("[RemoteCamera Desktop] Already initialized");
      return true;
    }

    try {
      console.log("[RemoteCamera Desktop] Initializing...");

      iceCandidateQueue.current = [];
      mediaStream.current = null;
      setRemoteCameraStream(null);

      // Create peer connection
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      });

      peerConnection.current.ontrack = (event) => {
        console.log("[RemoteCamera Desktop] Got track:", event.track.kind);
        if (!mediaStream.current) {
          mediaStream.current = new MediaStream();
        }
        mediaStream.current.addTrack(event.track);
        setRemoteCameraStream(mediaStream.current);
      };

      peerConnection.current.onicecandidate = async (event) => {
        if (event.candidate) {
          await sendSignal("candidate", {
            type: "candidate",
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          });
        }
      };

      peerConnection.current.oniceconnectionstatechange = () => {
        const state = peerConnection.current?.iceConnectionState || "unknown";
        console.log("[RemoteCamera Desktop] ICE state:", state);
        setRemoteCameraState(state);
      };

      // Set up channel and wait for subscription
      const channelName = `remote-camera-${matchId}-${user.id}`;
      console.log("[RemoteCamera Desktop] Channel:", channelName);

      const channel = supabase.channel(channelName);

      channel.on("broadcast", { event: "camera-signal" }, (payload) => {
        const data = payload.payload as SignalPayload & { signalType: string; from: string };
        if (data.from === "phone") {
          processSignal(data.signalType, data);
        }
      });

      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          console.log("[RemoteCamera Desktop] Channel status:", status);
          if (status === "SUBSCRIBED") {
            resolve();
          }
        });
      });

      channelRef.current = channel;
      isReady.current = true;

      // Send ready signal so phone knows we're listening
      await sendSignal("ready", { type: "ready" });
      console.log("[RemoteCamera Desktop] Ready signal sent");

      return true;
    } catch (error) {
      console.error("[RemoteCamera Desktop] Error:", error);
      return false;
    }
  }, [matchId, user, processSignal, sendSignal]);

  const cleanupRemoteCamera = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteCameraStream(null);
    setRemoteCameraState("new");
    iceCandidateQueue.current = [];
    isReady.current = false;
  }, []);

  const generateCameraToken = useCallback(() => {
    if (!user) return "";
    return btoa(user.id).replace(/=/g, "");
  }, [user]);

  useEffect(() => {
    return () => {
      cleanupRemoteCamera();
    };
  }, [cleanupRemoteCamera]);

  return {
    remoteCameraStream,
    remoteCameraState,
    initializeRemoteCameraReceiver,
    cleanupRemoteCamera,
    generateCameraToken,
  };
}
