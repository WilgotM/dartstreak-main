import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getSpeechLocale, normalizeLanguageCode } from "@/i18n/languages";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionClass {
  new(): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionClass;
    webkitSpeechRecognition?: SpeechRecognitionClass;
  }
}

interface VoiceScore {
  score: number;
  multiplier: 1 | 2 | 3;
}

interface UseVoiceInputProps {
  onScoreDetected: (score: number) => void;
  disabled?: boolean;
  autoStart?: boolean; // Auto-start when disabled changes from true to false
}

// Number words in English - extended for better recognition
const englishNumbers: Record<string, number> = {
  zero: 0, oh: 0, o: 0,
  one: 1, won: 1,
  two: 2, to: 2, too: 2,
  three: 3, tree: 3,
  four: 4, for: 4, fore: 4,
  five: 5,
  six: 6, sex: 6,
  seven: 7,
  eight: 8, ate: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  "twenty-five": 25, "twenty five": 25, twentyfive: 25,
  // Bull/outer variants
  outer: 25, "outer bull": 25, "single bull": 25, "outer ring": 25,
  bull: 50, bullseye: 50, "bulls eye": 50, "bull's eye": 50, "double bull": 50, "inner bull": 50,
};

// Number words in Swedish - extended for better recognition
const swedishNumbers: Record<string, number> = {
  noll: 0,
  ett: 1, en: 1,
  två: 2, tva: 2,
  tre: 3,
  fyra: 4,
  fem: 5,
  sex: 6,
  sju: 7,
  åtta: 8, atta: 8,
  nio: 9,
  tio: 10,
  elva: 11,
  tolv: 12,
  tretton: 13,
  fjorton: 14,
  femton: 15,
  sexton: 16,
  sjutton: 17,
  arton: 18, aderton: 18,
  nitton: 19,
  tjugo: 20,
  tjugofem: 25, "tjugo fem": 25,
  // Bull/outer variants  
  outer: 25, "yttre bull": 25, "singel bull": 25, "yttre": 25,
  bull: 50, bullseye: 50, "dubbel bull": 50, "inre bull": 50, "inre": 50,
};

// Multiplier words for better recognition
const germanNumbers: Record<string, number> = {
  null: 0,
  eins: 1, ein: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  funf: 5, fünf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9,
  zehn: 10,
  elf: 11,
  zwolf: 12, zwölf: 12,
  dreizehn: 13,
  vierzehn: 14,
  funfzehn: 15, fünfzehn: 15,
  sechzehn: 16,
  siebzehn: 17,
  achtzehn: 18,
  neunzehn: 19,
  zwanzig: 20,
  funfundzwanzig: 25, fünfundzwanzig: 25,
  bull: 50, bullseye: 50,
};

const dutchNumbers: Record<string, number> = {
  nul: 0,
  een: 1,
  twee: 2,
  drie: 3,
  vier: 4,
  vijf: 5,
  zes: 6,
  zeven: 7,
  acht: 8,
  negen: 9,
  tien: 10,
  elf: 11,
  twaalf: 12,
  dertien: 13,
  veertien: 14,
  vijftien: 15,
  zestien: 16,
  zeventien: 17,
  achttien: 18,
  negentien: 19,
  twintig: 20,
  vijfentwintig: 25,
  bull: 50, bullseye: 50,
};

const languageNumberMaps: Partial<Record<string, Record<string, number>>> = {
  sv: swedishNumbers,
  de: germanNumbers,
  nl: dutchNumbers,
};

const languageActivationWords: Partial<Record<string, string[]>> = {
  sv: ["poäng", "poing", "score"],
  de: ["punkte", "punktzahl", "score"],
  nl: ["punten", "score"],
};

const languageMissWords: Partial<Record<string, string[]>> = {
  sv: ["missa", "bom", "inget", "noll", "miss"],
  de: ["vorbei", "fehlwurf", "nichts", "null", "miss"],
  nl: ["mis", "niets", "nul", "miss"],
};

const multiplierWords = {
  triple: 3, trippel: 3, tripple: 3, treble: 3, dreifach: 3, drievoudig: 3,
  double: 2, dubbel: 2, dubble: 2, doppelt: 2,
  single: 1, singel: 1, enkel: 1, einfach: 1,
} as const;

export function useVoiceInput({ onScoreDetected, disabled, autoStart = false }: UseVoiceInputProps) {
  const { i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [needsRestart, setNeedsRestart] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldBeListeningRef = useRef(false);
  const processedResultsRef = useRef<Set<string>>(new Set());
  const lastProcessedIndexRef = useRef(-1);
  const languageCode = normalizeLanguageCode(i18n.resolvedLanguage || i18n.language);

  // Parse voice command - now supports both with and without activation word
  const parseVoiceCommand = useCallback((transcript: string): VoiceScore | null => {
    const text = transcript.toLowerCase().trim();

    if (!text) return null;

    console.log("Processing voice:", text);

    // Check for activation word (optional now)
    const activationWords = languageActivationWords[languageCode] ?? ["score", "points", "point"];

    let command = text;

    // If activation word is present, use the part after it
    for (const activationWord of activationWords) {
      if (text.includes(activationWord)) {
        const parts = text.split(activationWord);
        if (parts.length >= 2 && parts[1].trim()) {
          command = parts[1].trim();
          break;
        }
      }
    }

    // Determine multiplier
    let multiplier: 1 | 2 | 3 = 1;
    let scoreText = command;

    for (const [word, mult] of Object.entries(multiplierWords)) {
      if (command.includes(word)) {
        multiplier = mult as 1 | 2 | 3;
        scoreText = command.replace(new RegExp(word, "gi"), "").trim();
        break;
      }
    }

    // Handle miss
    const missWords = languageMissWords[languageCode] ?? ["miss", "missed", "nothing", "zero"];
    if (missWords.some(word => scoreText === word || scoreText.startsWith(word + " "))) {
      return { score: 0, multiplier: 1 };
    }

    // Try to parse number
    const numberMap = languageNumberMaps[languageCode] ?? englishNumbers;

    // Check word numbers first (longer matches first to avoid partial matches)
    const sortedWords = Object.entries(numberMap).sort((a, b) => b[0].length - a[0].length);

    for (const [word, num] of sortedWords) {
      if (scoreText.includes(word)) {
        // Special handling for bull/bullseye
        if (word === "bullseye" || word === "bulls eye" || word === "bull's eye") {
          return { score: 50, multiplier: 1 };
        }
        if (word === "bull") {
          return { score: multiplier === 2 ? 50 : 25, multiplier: 1 };
        }

        // Validate the score
        const calculatedScore = num * multiplier;
        if (calculatedScore >= 0 && calculatedScore <= 60) {
          return { score: calculatedScore, multiplier };
        }
      }
    }

    // Try to parse as digit - look for any number in the text
    const digitMatches = scoreText.match(/\d+/g);
    if (digitMatches) {
      for (const match of digitMatches) {
        const num = parseInt(match, 10);
        if (num >= 0 && num <= 20) {
          const calculatedScore = num * multiplier;
          if (calculatedScore <= 60) {
            return { score: calculatedScore, multiplier };
          }
        }
        if (num === 25) {
          return { score: multiplier === 2 ? 50 : 25, multiplier: 1 };
        }
        // Also accept direct scores (like saying "60" for T20)
        if (num >= 0 && num <= 60) {
          return { score: num, multiplier: 1 };
        }
      }
    }

    return null;
  }, [languageCode]);

  const createRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.error("Speech recognition not supported");
      return null;
    }

    const recognition = new SpeechRecognitionAPI();

    // CRITICAL: continuous mode keeps the session alive
    recognition.continuous = true;

    // interimResults gives us faster feedback and keeps the connection alive
    recognition.interimResults = true;

    // Get multiple alternatives for better accuracy
    recognition.maxAlternatives = 3;

    recognition.lang = getSpeechLocale(languageCode);

    return recognition;
  }, [languageCode]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      console.log("Already listening, ignoring start request");
      return;
    }

    const recognition = createRecognition();
    if (!recognition) return;

    shouldBeListeningRef.current = true;
    processedResultsRef.current.clear();
    lastProcessedIndexRef.current = -1;
    setNeedsRestart(false);

    recognition.onstart = () => {
      setIsListening(true);
      setNeedsRestart(false);
      console.log("🎤 Voice recognition started - listening continuously");
    };

    recognition.onaudiostart = () => {
      console.log("🔊 Audio capture started");
    };

    recognition.onsoundstart = () => {
      console.log("🔉 Sound detected");
    };

    recognition.onresult = (event) => {
      const results = event.results;

      // Process only new results starting from resultIndex
      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i];

        // Create a unique ID for this result to avoid double-processing
        const resultId = `${i}-${result[0].transcript}`;

        if (result.isFinal && !processedResultsRef.current.has(resultId)) {
          processedResultsRef.current.add(resultId);

          // Try each alternative for better accuracy
          for (let altIndex = 0; altIndex < result.length; altIndex++) {
            const alternative = result[altIndex];
            const transcript = alternative.transcript;

            console.log(`Final result [alt ${altIndex}]: "${transcript}" (confidence: ${(alternative.confidence * 100).toFixed(1)}%)`);
            setLastTranscript(transcript);

            const parsed = parseVoiceCommand(transcript);
            if (parsed) {
              console.log("✅ Score detected:", parsed.score);
              onScoreDetected(parsed.score);
              break; // Stop checking alternatives once we find a match
            }
          }
        } else if (!result.isFinal) {
          // Log interim results for debugging
          const interim = result[0].transcript;
          if (interim.length > 2) {
            console.log(`Interim: "${interim}"`);
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      // Handle different error types
      switch (event.error) {
        case "aborted":
          // User or system aborted - don't do anything
          break;
        case "no-speech":
          // No speech detected - this is normal, recognition will continue
          console.log("No speech detected, still listening...");
          break;
        case "not-allowed":
          // Permission denied - stop completely
          console.error("Microphone permission denied");
          shouldBeListeningRef.current = false;
          setIsListening(false);
          break;
        case "network":
          // Network error - show that restart is needed
          console.error("Network error - voice recognition requires internet");
          setNeedsRestart(true);
          break;
        case "audio-capture":
          // Microphone not available
          console.error("Microphone not available");
          shouldBeListeningRef.current = false;
          setIsListening(false);
          break;
        default:
          console.error("Unknown error:", event.error);
      }
    };

    recognition.onend = () => {
      console.log("Voice recognition session ended");
      recognitionRef.current = null;

      // If we're supposed to still be listening, the session died unexpectedly
      // Show visual indicator that user needs to tap to restart
      if (shouldBeListeningRef.current && !disabled) {
        console.log("⚠️ Session ended unexpectedly - user needs to restart");
        setIsListening(false);
        setNeedsRestart(true);
        // Do NOT auto-restart to avoid beeps on Android
      } else {
        setIsListening(false);
        setNeedsRestart(false);
      }
    };

    recognition.onsoundend = () => {
      console.log("🔇 Sound ended");
    };

    recognition.onaudioend = () => {
      console.log("🔊 Audio capture ended");
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      console.error("Could not start recognition:", e);
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [createRecognition, parseVoiceCommand, onScoreDetected, disabled]);

  const stopListening = useCallback(() => {
    shouldBeListeningRef.current = false;
    setNeedsRestart(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop(); // Use stop() to get any final results
      } catch (e) {
        console.log("Could not stop recognition");
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
    processedResultsRef.current.clear();
    lastProcessedIndexRef.current = -1;
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  // Auto-start/stop based on disabled state
  const prevDisabledRef = useRef(disabled);
  useEffect(() => {
    const wasDisabled = prevDisabledRef.current;
    prevDisabledRef.current = disabled;

    if (disabled) {
      // Don't fully stop when disabled - just pause so we can resume
      // This avoids the beep when restarting
      if (recognitionRef.current) {
        shouldBeListeningRef.current = false;
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
        recognitionRef.current = null;
        setIsListening(false);
      }
    } else if (autoStart && wasDisabled && !isListening && !recognitionRef.current) {
      // Auto-start when transitioning from disabled to enabled
      console.log("🎤 Auto-starting voice recognition (your turn)");
      startListening();
    }
  }, [disabled, autoStart, isListening, startListening]);

  return {
    isListening,
    isSupported: "webkitSpeechRecognition" in window || "SpeechRecognition" in window,
    lastTranscript,
    needsRestart, // New: indicates session died and needs manual restart
    startListening,
    stopListening,
    toggleListening,
  };
}
