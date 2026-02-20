import { useState, useRef, useCallback, useEffect } from "react";

interface UseCameraResult {
  videoRef: React.RefCallback<HTMLVideoElement>;
  isRecording: boolean;
  hasCamera: boolean;
  cameraError: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
}

export function useCamera(): UseCameraResult {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const headerChunkRef = useRef<Blob | null>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("");

  const [isRecording, setIsRecording] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);


  // Callback ref to attach stream when video element is available
  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    videoElementRef.current = element;

    if (element && pendingStreamRef.current) {
      console.log("Attaching pending stream to video element");
      element.srcObject = pendingStreamRef.current;
      element.play().catch(err => {
        console.error("Error playing video:", err);
      });
      pendingStreamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Din webbläsare eller enhet stöder inte kameraåtkomst. Se till att du använder HTTPS.");
        return;
      }

      chunksRef.current = [];
      headerChunkRef.current = null;

      console.log("Requesting camera access...");

      const constraints = {
        video: {
          width: { ideal: 480 },
          height: { ideal: 360 },
          frameRate: { ideal: 10, max: 15 },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...constraints.video,
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });
      } catch (envError) {
        console.log("Environment camera failed, trying any camera:", envError);
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      console.log("Camera stream obtained:", stream.getVideoTracks()[0]?.getSettings());

      streamRef.current = stream;
      setHasCamera(true);

      if (videoElementRef.current) {
        console.log("Attaching stream to existing video element");
        videoElementRef.current.srcObject = stream;
        try {
          await videoElementRef.current.play();
          console.log("Video playback started");
        } catch (playError) {
          console.error("Error playing video:", playError);
        }
      } else {
        console.log("Video element not ready, storing stream for later");
        pendingStreamRef.current = stream;
      }

      // VP9 first (better compression), then VP8 fallback
      const mimeTypes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];

      let mimeType = "";
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      mimeTypeRef.current = mimeType || "video/webm";
      console.log("Using mime type:", mimeTypeRef.current);

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 250000,
      };

      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          if (!headerChunkRef.current) {
            headerChunkRef.current = event.data;
            console.log("Header chunk captured:", event.data.size);
            return;
          }

          chunksRef.current.push(event.data);
          
          // Rolling buffer: max 10 minutes (600 seconds)
          const MAX_CHUNKS = 600;
          if (chunksRef.current.length > MAX_CHUNKS) {
            chunksRef.current.shift();
          }
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      console.log("Recording started");
    } catch (error) {
      console.error("Camera error:", error);
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          setCameraError("Kameraåtkomst nekad. Tillåt kameraåtkomst för att spela in.");
        } else if (error.name === "NotFoundError") {
          setCameraError("Ingen kamera hittades på enheten.");
        } else if (error.name === "NotReadableError") {
          setCameraError("Kameran används av ett annat program.");
        } else if (error.name === "OverconstrainedError") {
          setCameraError("Kameran stöder inte de begärda inställningarna.");
        } else {
          setCameraError(`Kamerafel: ${error.message}`);
        }
      } else {
        setCameraError("Ett okänt kamerafel uppstod.");
      }
      setHasCamera(false);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      console.log("Stopping recording...");

      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        console.log("No active recorder, returning null");
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const blobParts: Blob[] = [];
        if (headerChunkRef.current) {
          blobParts.push(headerChunkRef.current);
        }
        blobParts.push(...chunksRef.current);

        // Create clean blob without extra metadata
        const blob = new Blob(blobParts, { type: mimeTypeRef.current });
        console.log("Recording stopped, total size:", blob.size, "bytes, chunks:", chunksRef.current.length);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log("Stopped track:", track.kind);
          });
          streamRef.current = null;
        }

        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, []);

  return {
    videoRef,
    isRecording,
    hasCamera,
    cameraError,
    startRecording,
    stopRecording,
  };
}
