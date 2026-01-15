import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, SwitchCamera, Check } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

const CAMERA_SUFFIX = "_camera";

interface SignalPayload {
  type: string;
  sdp?: string;
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  isRemoteCamera?: boolean;
}

export default function RemoteCamera() {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const token = searchParams.get("token");
  const odlareId = token ? atob(token) : null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const processedSignals = useRef<Set<string>>(new Set());
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const [streaming, setStreaming] = useState(false);
  const [connected, setConnected] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [error, setError] = useState<string | null>(null);

  const getCameraUserId = useCallback(() => {
    if (!odlareId) return null;
    return odlareId + CAMERA_SUFFIX;
  }, [odlareId]);

  const sendSignal = useCallback(
    async (signalType: "offer" | "answer" | "candidate", payload: SignalPayload) => {
      if (!matchId || !odlareId) return;

      const cameraUserId = getCameraUserId();
      const signalData = {
        match_id: matchId,
        from_user_id: cameraUserId,
        to_user_id: cameraUserId,
        signal_type: signalType,
        payload: { ...payload, isRemoteCamera: true } as unknown as Json,
      };

      const { error } = await supabase.from("match_signals").insert(signalData);
      if (error) {
        console.error("[RemoteCamera] Error sending signal:", error);
      }
    },
    [matchId, odlareId, getCameraUserId]
  );

  const processSignal = useCallback(
    async (signalType: string, payload: SignalPayload, signalId: string) => {
      if (processedSignals.current.has(signalId)) return;
      if (!peerConnection.current) return;

      console.log(`[RemoteCamera] Processing ${signalType}`);

      try {
        if (signalType === "answer") {
          if (peerConnection.current.signalingState === "have-local-offer") {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: payload.sdp })
            );
            while (iceCandidateQueue.current.length > 0) {
              const candidate = iceCandidateQueue.current.shift()!;
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
        } else if (signalType === "candidate") {
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

        processedSignals.current.add(signalId);
      } catch (error) {
        console.error(`[RemoteCamera] Error processing ${signalType}:`, error);
      }
    },
    []
  );

  useEffect(() => {
    if (!matchId || !odlareId || !streaming) return;

    const cameraUserId = getCameraUserId();
    const channel = supabase
      .channel(`remote-cam-${matchId}`)
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
            from_user_id: string;
            to_user_id: string;
            signal_type: string;
            payload: unknown;
          };

          const signalPayload = signal.payload as unknown as SignalPayload;
          if (
            signal.to_user_id === cameraUserId &&
            signal.from_user_id !== cameraUserId &&
            signalPayload?.isRemoteCamera
          ) {
            await processSignal(signal.signal_type, signalPayload, signal.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, odlareId, streaming, processSignal, getCameraUserId]);

  const startCamera = async () => {
    if (!matchId || !odlareId) {
      setError(t("remoteCamera.invalidLink") || "Invalid link. Please scan the QR code again.");
      return;
    }

    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setError(t("remoteCamera.httpsRequired") || "Camera requires HTTPS. Please use a secure connection.");
      return;
    }

    try {
      setError(null);

      // Try with ideal constraints first, fallback to simpler constraints for iOS
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: facingMode,
          },
          audio: false,
        });
      } catch (constraintError) {
        console.warn("[RemoteCamera] Ideal constraints failed, trying simple constraints:", constraintError);
        // Fallback for iOS - use simpler constraints
        localStream.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = localStream.current;
      }

      processedSignals.current.clear();
      iceCandidateQueue.current = [];

      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      localStream.current.getTracks().forEach((track) => {
        if (localStream.current && peerConnection.current) {
          peerConnection.current.addTrack(track, localStream.current);
        }
      });

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
        const state = peerConnection.current?.iceConnectionState;
        console.log("[RemoteCamera] ICE state:", state);
        setConnected(state === "connected" || state === "completed");
      };

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      await sendSignal("offer", { type: "offer", sdp: offer.sdp });

      setStreaming(true);
    } catch (err: any) {
      console.error("[RemoteCamera] Error:", err);
      
      // Provide more specific error messages
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError(t("remoteCamera.permissionDenied") || "Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError(t("remoteCamera.noCamera") || "No camera found on this device.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setError(t("remoteCamera.cameraInUse") || "Camera is in use by another app. Please close other apps using the camera.");
      } else if (err.name === "OverconstrainedError") {
        setError(t("remoteCamera.cameraError") || "Camera constraints not supported. Try again.");
      } else {
        setError(t("remoteCamera.cameraError") || "Failed to access camera. Please check permissions.");
      }
    }
  };

  const stopCamera = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setStreaming(false);
    setConnected(false);
  };

  const switchCameraFacing = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    if (streaming && localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: newMode,
          },
          audio: false,
        });

        localStream.current = newStream;
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }

        if (peerConnection.current) {
          const sender = peerConnection.current.getSenders().find(s => s.track?.kind === "video");
          const videoTrack = newStream.getVideoTracks()[0];
          if (sender && videoTrack) {
            await sender.replaceTrack(videoTrack);
          }
        }
      } catch (err) {
        console.error("[RemoteCamera] Error switching camera:", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!token || !odlareId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <CameraOff className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold">{t("remoteCamera.invalidLink") || "Invalid Link"}</h1>
          <p className="text-muted-foreground max-w-xs mx-auto">
            {t("remoteCamera.scanAgain") || "Please scan the QR code from the match page again."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {!streaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center space-y-4 p-6">
              <Camera className="w-20 h-20 mx-auto text-primary" />
              <h1 className="text-2xl font-bold">{t("remoteCamera.title") || "Dartboard Camera"}</h1>
              <p className="text-muted-foreground max-w-xs mx-auto">
                {t("remoteCamera.description") || "This device will stream video to your match."}
              </p>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button onClick={startCamera} size="lg" className="gap-2">
                <Camera className="w-5 h-5" />
                {t("remoteCamera.startCamera") || "Start Camera"}
              </Button>
            </div>
          </div>
        )}

        {connected && (
          <div className="absolute top-4 left-4 bg-green-500/90 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium">
            <Check className="w-4 h-4" />
            {t("remoteCamera.connected") || "Connected"}
          </div>
        )}

        {streaming && !connected && (
          <div className="absolute top-4 left-4 bg-yellow-500/90 text-black px-3 py-1.5 rounded-full text-sm font-medium animate-pulse">
            {t("remoteCamera.connecting") || "Connecting..."}
          </div>
        )}
      </div>

      {streaming && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-center gap-4 pb-[env(safe-area-inset-bottom)]">
            <Button
              variant="outline"
              size="icon"
              className="w-14 h-14 rounded-full bg-white/10 border-white/20 hover:bg-white/20"
              onClick={switchCameraFacing}
            >
              <SwitchCamera className="w-6 h-6 text-white" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={stopCamera}
            >
              <CameraOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
