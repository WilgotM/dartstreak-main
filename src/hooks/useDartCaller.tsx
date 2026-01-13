import { useCallback, useRef } from "react";

// Dart caller hook for playing score announcements
// Expects audio files in /sounds/{score}.mp3 or /sounds/{score}.wav
// Supports scores from 0-180

export function useDartCaller() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playScore = useCallback((score: number) => {
    // Validate score range (0-180 for three darts)
    if (score < 0 || score > 180) {
      console.warn(`Invalid dart score for caller: ${score}`);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Try to play the score audio file
    // First try mp3, then wav
    const audio = new Audio();
    
    const tryPlay = (extension: string) => {
      audio.src = `/sounds/${score}.${extension}`;
      audio.play().catch((error) => {
        if (extension === "mp3") {
          // If mp3 fails, try wav
          tryPlay("wav");
        } else {
          console.warn(`Could not play dart caller sound for score ${score}:`, error);
        }
      });
    };

    audioRef.current = audio;
    tryPlay("mp3");
  }, []);

  const playRoundScore = useCallback((dart1: number, dart2: number, dart3: number) => {
    const total = dart1 + dart2 + dart3;
    playScore(total);
  }, [playScore]);

  const playGameOn = useCallback(() => {
    const audio = new Audio();
    audio.src = "/sounds/gameon.mp3";
    audio.play().catch(() => {
      audio.src = "/sounds/gameon.wav";
      audio.play().catch(() => {});
    });
  }, []);

  const playGameShot = useCallback(() => {
    const audio = new Audio();
    audio.src = "/sounds/gameshot.mp3";
    audio.play().catch(() => {
      audio.src = "/sounds/gameshot.wav";
      audio.play().catch(() => {});
    });
  }, []);

  const playBusted = useCallback(() => {
    const audio = new Audio();
    audio.src = "/sounds/busted.mp3";
    audio.play().catch(() => {
      audio.src = "/sounds/busted.wav";
      audio.play().catch(() => {});
    });
  }, []);

  return {
    playScore,
    playRoundScore,
    playGameOn,
    playGameShot,
    playBusted,
  };
}
