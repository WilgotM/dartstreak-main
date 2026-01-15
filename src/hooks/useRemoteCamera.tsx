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
  
  const cameraPeerConnection = useRef<RTCPeerConnection | null>(null);
  const remoteCameraMediaStream = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const sendSignal = useCallback(
    async (signalType: "offer" | "answer" | "candidate", payload: SignalPayload) => {
      if (!channelRef.current) {
        console.warn("[RemoteCamera Desktop] No channel to send signal");
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
      if (!cameraPeerConnection.current) {
        console.warn("[RemoteCamera Desktop] No peer connection");
        return;
      }

      console.log(`[RemoteCamera Desktop] Processing ${signalType}`);

      try {
        if (signalType === "offer") {
          await cameraPeerConnection.current.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: payload.sdp })
          );
          console.log("[RemoteCamera Desktop] Remote description set from offer");

          while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift()!;
            await cameraPeerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          }

          const answer = await cameraPeerConnection.current.createAnswer();
          await cameraPeerConnection.current.setLocalDescription(answer);
          await sendSignal("answer", { type: "answer", sdp: answer.sdp });
        } else if (signalType === "answer") {
          if (cameraPeerConnection.current.signalingState === "have-local-offer") {
            await cameraPeerConnection.current.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: payload.sdp })
            );
            while (iceCandidateQueue.current.length > 0) {
              const candidate = iceCandidateQueue.current.shift()!;
              await cameraPeerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
        } else if (signalType === "candidate") {
          const candidate: RTCIceCandidateInit = {
            candidate: payload.candidate,
            sdpMid: payload.sdpMid,
            sdpMLineIndex: payload.sdpMLineIndex,
          };

          if (cameraPeerConnection.current.remoteDescription) {
            await cameraPeerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
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

    try {
      console.log("[RemoteCamera Desktop] Initializing receiver...");

      iceCandidateQueue.current = [];
      remoteCameraMediaStream.current = null;
      setRemoteCameraStream(null);

      // Set up broadcast channel
      const channel = supabase
        .channel(`remote-camera-${matchId}-${user.id}`)
        .on("broadcast", { event: "camera-signal" }, (payload) => {
          const data = payload.payload as SignalPayload & { signalType: string; from: string };
          console.log("[RemoteCamera Desktop] Received broadcast:", data.signalType, data.from);
          if (data.from === "phone") {
            processSignal(data.signalType, data);
          }
        })
        .subscribe((status) => {
          console.log("[RemoteCamera Desktop] Channel status:", status);
        });

      channelRef.current = channel;

      cameraPeerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      cameraPeerConnection.current.ontrack = (event) => {
        console.log("[RemoteCamera Desktop] Received track:", event.track.kind);
        if (!remoteCameraMediaStream.current) {
          remoteCameraMediaStream.current = new MediaStream();
        }
        remoteCameraMediaStream.current.addTrack(event.track);
        setRemoteCameraStream(remoteCameraMediaStream.current);
      };

      cameraPeerConnection.current.onicecandidate = async (event) => {
        if (event.candidate) {
          await sendSignal("candidate", {
            type: "candidate",
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          });
        }
      };

      cameraPeerConnection.current.oniceconnectionstatechange = () => {
        const state = cameraPeerConnection.current?.iceConnectionState || "unknown";
        console.log("[RemoteCamera Desktop] ICE connection state:", state);
        setRemoteCameraState(state);
      };

      return true;
    } catch (error) {
      console.error("[RemoteCamera Desktop] Error initializing receiver:", error);
      return false;
    }
  }, [matchId, user, processSignal, sendSignal]);

  const cleanupRemoteCamera = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (cameraPeerConnection.current) {
      cameraPeerConnection.current.close();
      cameraPeerConnection.current = null;
    }
    setRemoteCameraStream(null);
    setRemoteCameraState("new");
    iceCandidateQueue.current = [];
  }, []);

  const generateCameraToken = useCallback(() => {
    if (!user) return "";
    return btoa(user.id).replace(/=/g, "");
  }, [user]);

  // Cleanup on unmount
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
