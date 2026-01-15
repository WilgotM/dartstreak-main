import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";

interface SignalPayload {
  type: string;
  sdp?: string;
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  isRemoteCamera?: boolean;
}

const CAMERA_SUFFIX = "_camera";

export function useRemoteCamera(matchId?: string) {
  const { user } = useAuth();
  const [remoteCameraStream, setRemoteCameraStream] = useState<MediaStream | null>(null);
  const [remoteCameraState, setRemoteCameraState] = useState<string>("new");
  
  const cameraPeerConnection = useRef<RTCPeerConnection | null>(null);
  const remoteCameraMediaStream = useRef<MediaStream | null>(null);
  const processedCameraSignals = useRef<Set<string>>(new Set());
  const queuedCameraSignals = useRef<Set<string>>(new Set());
  const pendingCameraSignals = useRef<Array<{ id: string; signalType: string; payload: SignalPayload }>>([]);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const getCameraUserId = useCallback(() => {
    if (!user) return null;
    return user.id + CAMERA_SUFFIX;
  }, [user]);

  const sendCameraSignal = useCallback(
    async (signalType: "offer" | "answer" | "candidate", payload: SignalPayload) => {
      if (!matchId || !user) return;

      const cameraUserId = getCameraUserId();
      const signalData = {
        match_id: matchId,
        from_user_id: user.id,
        to_user_id: cameraUserId,
        signal_type: signalType,
        payload: { ...payload, isRemoteCamera: true } as unknown as Json,
      };

      const { error } = await supabase.from("match_signals").insert(signalData);
      if (error) {
        console.error("[RemoteCamera] Error sending camera signal:", error);
      }
    },
    [matchId, user, getCameraUserId]
  );

  const enqueueCameraSignal = useCallback((signalType: string, payload: SignalPayload, signalId: string) => {
    if (processedCameraSignals.current.has(signalId) || queuedCameraSignals.current.has(signalId)) return;
    queuedCameraSignals.current.add(signalId);
    pendingCameraSignals.current.push({ id: signalId, signalType, payload });
    console.log(`[RemoteCamera] Queued ${signalType} signal`);
  }, []);

  const processCameraSignal = useCallback(
    async (signalType: string, payload: SignalPayload, signalId: string) => {
      if (processedCameraSignals.current.has(signalId)) return;
      if (!cameraPeerConnection.current) {
        console.warn("[RemoteCamera] Cannot process signal - peer connection not ready");
        return;
      }

      console.log(`[RemoteCamera] Processing ${signalType} signal`);

      try {
        if (signalType === "offer") {
          await cameraPeerConnection.current.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: payload.sdp })
          );
          console.log("[RemoteCamera] Remote description set from offer");

          while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift()!;
            await cameraPeerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          }

          const answer = await cameraPeerConnection.current.createAnswer();
          await cameraPeerConnection.current.setLocalDescription(answer);
          await sendCameraSignal("answer", { type: "answer", sdp: answer.sdp });
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

        processedCameraSignals.current.add(signalId);
      } catch (error) {
        console.error(`[RemoteCamera] Error processing ${signalType} signal:`, error);
      }
    },
    [sendCameraSignal]
  );

  const flushQueuedCameraSignals = useCallback(async () => {
    if (!cameraPeerConnection.current) return;

    const queued = [...pendingCameraSignals.current];
    pendingCameraSignals.current = [];

    for (const item of queued) {
      queuedCameraSignals.current.delete(item.id);
      await processCameraSignal(item.signalType, item.payload, item.id);
    }
  }, [processCameraSignal]);

  const processOrQueueCameraSignal = useCallback(async (signalType: string, payload: SignalPayload, signalId: string) => {
    if (processedCameraSignals.current.has(signalId) || queuedCameraSignals.current.has(signalId)) return;

    if (!cameraPeerConnection.current) {
      enqueueCameraSignal(signalType, payload, signalId);
      return;
    }

    await processCameraSignal(signalType, payload, signalId);
  }, [enqueueCameraSignal, processCameraSignal]);

  const fetchExistingCameraSignals = useCallback(async () => {
    if (!matchId || !user) return;

    const cameraUserId = getCameraUserId();
    const { data: signals, error } = await supabase
      .from("match_signals")
      .select("*")
      .eq("match_id", matchId)
      .eq("to_user_id", cameraUserId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[RemoteCamera] Error fetching signals:", error);
      return;
    }

    for (const signal of signals || []) {
      const payload = signal.payload as unknown as SignalPayload;
      if (payload?.isRemoteCamera) {
        await processOrQueueCameraSignal(signal.signal_type, payload, signal.id);
      }
    }
  }, [matchId, user, getCameraUserId, processOrQueueCameraSignal]);

  useEffect(() => {
    if (!matchId || !user) return;

    const cameraUserId = getCameraUserId();
    const channel = supabase
      .channel(`camera-signals-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_signals",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          const signal = payload.new as {
            id: string;
            to_user_id: string;
            signal_type: string;
            payload: unknown;
          };

          const signalPayload = signal.payload as unknown as SignalPayload;
          if (signal.to_user_id === cameraUserId && signalPayload?.isRemoteCamera) {
            console.log(`[RemoteCamera] Realtime: received ${signal.signal_type} signal`);
            await processOrQueueCameraSignal(signal.signal_type, signalPayload, signal.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user?.id, processOrQueueCameraSignal, getCameraUserId]);

  const initializeRemoteCameraReceiver = useCallback(async () => {
    try {
      console.log("[RemoteCamera] Initializing receiver...");

      processedCameraSignals.current.clear();
      queuedCameraSignals.current.clear();
      pendingCameraSignals.current = [];
      iceCandidateQueue.current = [];

      remoteCameraMediaStream.current = null;
      setRemoteCameraStream(null);

      cameraPeerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      cameraPeerConnection.current.ontrack = (event) => {
        console.log("[RemoteCamera] Received track:", event.track.kind);
        if (!remoteCameraMediaStream.current) {
          remoteCameraMediaStream.current = new MediaStream();
        }
        remoteCameraMediaStream.current.addTrack(event.track);
        setRemoteCameraStream(remoteCameraMediaStream.current);
      };

      cameraPeerConnection.current.onicecandidate = async (event) => {
        if (event.candidate) {
          await sendCameraSignal("candidate", {
            type: "candidate",
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          });
        }
      };

      cameraPeerConnection.current.oniceconnectionstatechange = () => {
        const state = cameraPeerConnection.current?.iceConnectionState || "unknown";
        console.log("[RemoteCamera] ICE connection state:", state);
        setRemoteCameraState(state);
      };

      await fetchExistingCameraSignals();
      await flushQueuedCameraSignals();

      return true;
    } catch (error) {
      console.error("[RemoteCamera] Error initializing receiver:", error);
      return false;
    }
  }, [sendCameraSignal, fetchExistingCameraSignals, flushQueuedCameraSignals]);

  const cleanupRemoteCamera = useCallback(() => {
    if (cameraPeerConnection.current) {
      cameraPeerConnection.current.close();
      cameraPeerConnection.current = null;
    }
    setRemoteCameraStream(null);
    setRemoteCameraState("new");
    processedCameraSignals.current.clear();
    queuedCameraSignals.current.clear();
    pendingCameraSignals.current = [];
    iceCandidateQueue.current = [];
  }, []);

  const generateCameraToken = useCallback(() => {
    if (!user) return "";
    return btoa(user.id).replace(/=/g, "");
  }, [user]);

  return {
    remoteCameraStream,
    remoteCameraState,
    initializeRemoteCameraReceiver,
    cleanupRemoteCamera,
    generateCameraToken,
  };
}

export { CAMERA_SUFFIX };
