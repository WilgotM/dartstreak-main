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

  // Motion detection refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const motionDetectedRef = useRef<boolean>(false);
  const motionTimeoutRef = useRef<number | null>(null);
  const motionIntervalRef = useRef<number | null>(null);
  const pendingChunkRef = useRef<Blob | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Motion detection threshold (percentage of pixels that must change)
  const MOTION_THRESHOLD = 0.02; // 2% of pixels
  const PIXEL_DIFF_THRESHOLD = 30; // Minimum difference per pixel channel
  const MOTION_COOLDOWN_MS = 2000; // Keep recording 2 seconds after motion stops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (motionIntervalRef.current) {
        clearInterval(motionIntervalRef.current);
      }
      if (motionTimeoutRef.current) {
        clearTimeout(motionTimeoutRef.current);
      }
      if (canvasRef.current) {
        canvasRef.current.remove();
      }
    };
  }, []);

  // Detect motion by comparing current frame to previous frame
  const detectMotion = useCallback((): boolean => {
    const video = videoElementRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return false;
    }

    // Create canvas if it doesn't exist
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;

    // Use small resolution for faster processing
    const width = 64;
    const height = 48;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;

    // Draw current frame
    ctx.drawImage(video, 0, 0, width, height);
    const currentFrame = ctx.getImageData(0, 0, width, height);
    const currentData = currentFrame.data;

    // If no previous frame, store current and return false
    if (!prevFrameDataRef.current) {
      prevFrameDataRef.current = new Uint8ClampedArray(currentData);
      return false;
    }

    const prevData = prevFrameDataRef.current;
    let changedPixels = 0;
    const totalPixels = width * height;

    // Compare pixels (skip alpha channel, compare RGB only)
    for (let i = 0; i < currentData.length; i += 4) {
      const rDiff = Math.abs(currentData[i] - prevData[i]);
      const gDiff = Math.abs(currentData[i + 1] - prevData[i + 1]);
      const bDiff = Math.abs(currentData[i + 2] - prevData[i + 2]);

      if (rDiff > PIXEL_DIFF_THRESHOLD || gDiff > PIXEL_DIFF_THRESHOLD || bDiff > PIXEL_DIFF_THRESHOLD) {
        changedPixels++;
      }
    }

    // Store current frame for next comparison
    prevFrameDataRef.current = new Uint8ClampedArray(currentData);

    const motionRatio = changedPixels / totalPixels;
    const hasMotion = motionRatio > MOTION_THRESHOLD;

    if (hasMotion) {
      console.log(`Motion detected: ${(motionRatio * 100).toFixed(1)}% pixels changed`);
    }

    return hasMotion;
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
      prevFrameDataRef.current = null;
      motionDetectedRef.current = false;
      pendingChunkRef.current = null;

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
          // Always capture header chunk
          if (!headerChunkRef.current) {
            headerChunkRef.current = event.data;
            console.log("Header chunk captured:", event.data.size);
            return;
          }

          // Only save chunk if motion was detected recently
          if (motionDetectedRef.current) {
            chunksRef.current.push(event.data);

            // Rolling buffer: max 10 minutes
            const MAX_CHUNKS = 600;
            if (chunksRef.current.length > MAX_CHUNKS) {
              chunksRef.current.shift();
            }
          } else {
            // Store the latest chunk in case motion is detected on next check
            pendingChunkRef.current = event.data;
          }
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      // Start motion detection interval
      motionIntervalRef.current = window.setInterval(() => {
        const hasMotion = detectMotion();

        if (hasMotion) {
          // Motion detected - include pending chunk if any
          if (pendingChunkRef.current && !motionDetectedRef.current) {
            chunksRef.current.push(pendingChunkRef.current);
            pendingChunkRef.current = null;
          }

          motionDetectedRef.current = true;

          // Clear any existing cooldown timeout
          if (motionTimeoutRef.current) {
            clearTimeout(motionTimeoutRef.current);
            motionTimeoutRef.current = null;
          }
        } else if (motionDetectedRef.current) {
          // No motion, but was previously recording - start cooldown
          if (!motionTimeoutRef.current) {
            motionTimeoutRef.current = window.setTimeout(() => {
              console.log("Motion cooldown ended, pausing chunk recording");
              motionDetectedRef.current = false;
              motionTimeoutRef.current = null;
            }, MOTION_COOLDOWN_MS);
          }
        }
      }, 500);

      mediaRecorder.start(1000);
      setIsRecording(true);
      console.log("Recording started with motion detection");
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
  }, [detectMotion]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      console.log("Stopping recording...");

      // Clear motion detection interval
      if (motionIntervalRef.current) {
        clearInterval(motionIntervalRef.current);
        motionIntervalRef.current = null;
      }
      if (motionTimeoutRef.current) {
        clearTimeout(motionTimeoutRef.current);
        motionTimeoutRef.current = null;
      }

      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        console.log("No active recorder, returning null");
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        // Construct final blob: Header + Motion-detected chunks (metadata stripped by only using necessary parts)
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

        // Cleanup canvas
        if (canvasRef.current) {
          canvasRef.current.remove();
          canvasRef.current = null;
        }
        prevFrameDataRef.current = null;

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
