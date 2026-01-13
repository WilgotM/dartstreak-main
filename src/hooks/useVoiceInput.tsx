import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionClass {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
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
}

// Number words in English
const englishNumbers: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  "twenty-five": 25, "twenty five": 25, twentyfive: 25,
  bull: 25, bullseye: 50,
};

// Number words in Swedish
const swedishNumbers: Record<string, number> = {
  noll: 0, ett: 1, två: 2, tre: 3, fyra: 4, fem: 5,
  sex: 6, sju: 7, åtta: 8, nio: 9, tio: 10,
  elva: 11, tolv: 12, tretton: 13, fjorton: 14, femton: 15,
  sexton: 16, sjutton: 17, arton: 18, nitton: 19, tjugo: 20,
  tjugofem: 25, "tjugo fem": 25,
  bull: 25, bullseye: 50,
};

export function useVoiceInput({ onScoreDetected, disabled }: UseVoiceInputProps) {
  const { i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldRestartRef = useRef(false);
  const restartTimeoutRef = useRef<number | null>(null);
  const isSwedish = i18n.language === "sv";

  const parseVoiceCommand = useCallback((transcript: string): VoiceScore | null => {
    const text = transcript.toLowerCase().trim();
    console.log("Voice transcript:", text);
    
    // Check for activation word
    const activationWord = isSwedish ? "poäng" : "score";
    if (!text.includes(activationWord)) {
      return null;
    }

    // Get the part after the activation word
    const parts = text.split(activationWord);
    if (parts.length < 2) return null;
    
    const command = parts[1].trim();
    if (!command) return null;

    // Determine multiplier
    let multiplier: 1 | 2 | 3 = 1;
    let scoreText = command;

    if (isSwedish) {
      if (command.includes("trippel") || command.includes("triple")) {
        multiplier = 3;
        scoreText = command.replace(/trippel|triple/gi, "").trim();
      } else if (command.includes("dubbel") || command.includes("double")) {
        multiplier = 2;
        scoreText = command.replace(/dubbel|double/gi, "").trim();
      }
    } else {
      if (command.includes("triple")) {
        multiplier = 3;
        scoreText = command.replace(/triple/gi, "").trim();
      } else if (command.includes("double")) {
        multiplier = 2;
        scoreText = command.replace(/double/gi, "").trim();
      }
    }

    // Handle miss
    if (scoreText === "miss" || scoreText === "missa" || scoreText === "bom") {
      return { score: 0, multiplier: 1 };
    }

    // Try to parse number
    const numberMap = isSwedish ? swedishNumbers : englishNumbers;
    
    // Check word numbers first
    for (const [word, num] of Object.entries(numberMap)) {
      if (scoreText.includes(word)) {
        // Special handling for bull/bullseye
        if (word === "bullseye") {
          return { score: 50, multiplier: 1 };
        }
        if (word === "bull") {
          return { score: multiplier === 2 ? 50 : 25, multiplier: 1 };
        }
        return { score: num * multiplier, multiplier };
      }
    }

    // Try to parse as digit
    const digitMatch = scoreText.match(/\d+/);
    if (digitMatch) {
      const num = parseInt(digitMatch[0], 10);
      if (num >= 0 && num <= 20) {
        return { score: num * multiplier, multiplier };
      }
      if (num === 25) {
        return { score: multiplier === 2 ? 50 : 25, multiplier: 1 };
      }
    }

    return null;
  }, [isSwedish]);

  const createRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.error("Speech recognition not supported");
      return null;
    }

    const recognition = new SpeechRecognitionAPI();
    
    // Use continuous mode but don't restart automatically
    recognition.continuous = true;
    recognition.interimResults = false; // Only get final results to reduce noise
    recognition.lang = isSwedish ? "sv-SE" : "en-US";

    return recognition;
  }, [isSwedish]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      return; // Already listening
    }

    const recognition = createRecognition();
    if (!recognition) return;

    shouldRestartRef.current = true;

    recognition.onstart = () => {
      setIsListening(true);
      console.log("Voice recognition started");
    };

    recognition.onresult = (event) => {
      const results = event.results;
      
      // Process all new results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript;
          setLastTranscript(transcript);
          
          const parsed = parseVoiceCommand(transcript);
          if (parsed) {
            console.log("Voice score detected:", parsed);
            onScoreDetected(parsed.score);
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      
      // Don't restart on abort or no-speech
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }
      
      // For other errors, stop completely
      if (event.error === "not-allowed") {
        shouldRestartRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      console.log("Voice recognition ended");
      
      // Only restart if we're supposed to still be listening
      if (shouldRestartRef.current && !disabled) {
        // Use a longer delay to prevent rapid restart beeps on Android
        restartTimeoutRef.current = window.setTimeout(() => {
          if (shouldRestartRef.current && !disabled) {
            recognitionRef.current = null;
            startListening();
          }
        }, 500); // 500ms delay prevents beep spam on Android
      } else {
        setIsListening(false);
        recognitionRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.error("Could not start recognition:", e);
      recognitionRef.current = null;
    }
  }, [createRecognition, parseVoiceCommand, onScoreDetected, disabled]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort(); // Use abort instead of stop to prevent final result
      } catch (e) {
        console.log("Could not abort recognition");
      }
      recognitionRef.current = null;
    }
    
    setIsListening(false);
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
      shouldRestartRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  // Stop listening when disabled
  useEffect(() => {
    if (disabled) {
      stopListening();
    }
  }, [disabled, stopListening]);

  return {
    isListening,
    isSupported: "webkitSpeechRecognition" in window || "SpeechRecognition" in window,
    lastTranscript,
    startListening,
    stopListening,
    toggleListening,
  };
}
