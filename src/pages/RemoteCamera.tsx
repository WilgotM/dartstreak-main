import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, SwitchCamera, Check, Loader2 } from "lucide-react";

interface SignalPayload {
  type: string;
  sdp?: string;
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const desktopReady = useRef(false);
  const offerSent = useRef(false);

  const [streaming, setStreaming] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [error, setError] = useState<string | null>(null);

  const sendSignal = useCallback(
    async (signalType: string, payload: SignalPayload) => {
      if (!channelRef.current) return;
      console.log(`[RemoteCamera Phone] Sending ${signalType}`);
      await channelRef.current.send({
        type: "broadcast",
        event: "camera-signal",
        payload: { signalType, ...payload, from: "phone" },
      });
    },
    []
  );

  const createAndSendOffer = useCallback(async () => {
    if (!peerConnection.current || offerSent.current) return;

    try {
      console.log("[RemoteCamera Phone] Creating offer...");
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      await sendSignal("offer", { type: "offer", sdp: offer.sdp });
      offerSent.current = true;
      console.log("[RemoteCamera Phone] Offer sent");
    } catch (err) {
      console.error("[RemoteCamera Phone] Error creating offer:", err);
    }
  }, [sendSignal]);

  const processSignal = useCallback(
    async (signalType: string, payload: SignalPayload) => {
      console.log(`[RemoteCamera Phone] Processing ${signalType}`);

      if (signalType === "ready") {
        console.log("[RemoteCamera Phone] Desktop is ready");
        desktopReady.current = true;
        // If we have a peer connection ready, send offer now
        if (peerConnection.current && !offerSent.current) {
          await createAndSendOffer();
        }
        return;
      }

      if (!peerConnection.current) return;

      try {
        if (signalType === "answer") {
          if (peerConnection.current.signalingState === "have-local-offer") {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: payload.sdp })
            );
            console.log("[RemoteCamera Phone] Answer received, connection should establish");

            // Process queued candidates
            while (iceCandidateQueue.current.length > 0) {
              const candidate = iceCandidateQueue.current.shift()!;
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
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
        console.error(`[RemoteCamera Phone] Error processing ${signalType}:`, error);
      }
    },
    [createAndSendOffer]
  );

  const startCamera = async () => {
    if (!matchId || !odlareId) {
      setError(t("remoteCamera.invalidLink") || "Invalid link.");
      return;
    }

    try {
      setError(null);
      setConnecting(true);
      offerSent.current = false;
      desktopReady.current = false;

      // Get camera
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode },
          audio: false,
        });
      } catch {
        localStream.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = localStream.current;
      }

      // Set up channel first
      const channelName = `remote-camera-${matchId}-${odlareId}`;
      console.log("[RemoteCamera Phone] Channel:", channelName);

      const channel = supabase.channel(channelName);

      channel.on("broadcast", { event: "camera-signal" }, (payload) => {
        const data = payload.payload as SignalPayload & { signalType: string; from: string };
        if (data.from === "desktop") {
          processSignal(data.signalType, data);
        }
      });

      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          console.log("[RemoteCamera Phone] Channel status:", status);
          if (status === "SUBSCRIBED") {
            resolve();
          }
        });
      });

      channelRef.current = channel;

      // Create peer connection
      iceCandidateQueue.current = [];
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      });

      // Add tracks
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
        console.log("[RemoteCamera Phone] ICE state:", state);
        if (state === "connected" || state === "completed") {
          setConnected(true);
          setConnecting(false);
        } else if (state === "failed" || state === "disconnected") {
          setConnected(false);
        }
      };

      setStreaming(true);

      // Send a "phone-ready" signal and wait a bit, then create offer
      // This gives desktop time to set up if it wasn't ready
      await sendSignal("phone-ready", { type: "phone-ready" });

      // Wait a moment then send offer (desktop might already be listening)
      setTimeout(async () => {
        if (!offerSent.current && peerConnection.current) {
          await createAndSendOffer();
        }
      }, 500);

    } catch (err: any) {
      console.error("[RemoteCamera Phone] Error:", err);
      setConnecting(false);

      if (err.name === "NotAllowedError") {
        setError(t("remoteCamera.permissionDenied") || "Camera permission denied.");
      } else if (err.name === "NotFoundError") {
        setError(t("remoteCamera.noCamera") || "No camera found.");
      } else {
        setError(t("remoteCamera.cameraError") || "Failed to access camera.");
      }
    }
  };

  const stopCamera = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
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
    setConnecting(false);
    offerSent.current = false;
  };

  const switchCameraFacing = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    if (streaming && localStream.current && peerConnection.current) {
      localStream.current.getTracks().forEach((track) => track.stop());

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newMode },
          audio: false,
        });

        localStream.current = newStream;
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }

        const sender = peerConnection.current.getSenders().find((s) => s.track?.kind === "video");
        const videoTrack = newStream.getVideoTracks()[0];
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      } catch (err) {
        console.error("[RemoteCamera Phone] Error switching camera:", err);
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
            {t("remoteCamera.scanAgain") || "Please scan the QR code again."}
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
                {t("remoteCamera.description") || "Stream video to your match."}
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
          <div className="absolute top-4 left-4 bg-yellow-500/90 text-black px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
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
