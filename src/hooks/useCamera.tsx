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
    
    // If we have a pending stream and the element just became available, attach it
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
      chunksRef.current = [];

      console.log("Requesting camera access...");

      // Request camera - try environment first, fall back to any camera
      // Use 640x480 (480p) resolution
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 },
          },
          audio: false,
        });
      } catch (envError) {
        console.log("Environment camera failed, trying any camera:", envError);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 },
          },
          audio: false,
        });
      }

      console.log("Camera stream obtained:", stream.getVideoTracks()[0]?.getSettings());

      streamRef.current = stream;
      setHasCamera(true);

      // Attach stream to video element if it exists, otherwise store it for later
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

      // Create MediaRecorder with low quality settings
      const mimeTypes = [
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
        videoBitsPerSecond: 500000, // 500 kbps
      };
      
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log("Recorded chunk:", event.data.size, "bytes");
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      mediaRecorder.start(1000); // Collect data every second
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

      // Set up onstop handler to resolve with the blob
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        console.log("Recording stopped, total size:", blob.size, "bytes");
        
        // Stop all tracks
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
