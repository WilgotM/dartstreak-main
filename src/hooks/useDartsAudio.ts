import { useCallback, useEffect, useRef } from "react";

// Synthesized locally: no microphone, audio downloads or third-party service.
export default function useDartsAudio(enabled: boolean) {
  const context = useRef<AudioContext | null>(null);
  const crowd = useRef<GainNode | null>(null);
  const enable = useCallback(() => {
    try {
      const audio = context.current ?? new AudioContext();
      context.current = audio;
      void audio.resume().catch(() => undefined);
      if (crowd.current) return;
      const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
      const samples = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < samples.length; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02; samples[i] = last; }
      const source = audio.createBufferSource(); source.buffer = buffer; source.loop = true;
      const filter = audio.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 650;
      const gain = audio.createGain(); gain.gain.value = 0.12;
      source.connect(filter).connect(gain).connect(audio.destination); source.start();
      crowd.current = gain;
    } catch { /* Sound is optional when the browser has no Web Audio support. */ }
  }, []);
  useEffect(() => {
    if (context.current) {
      if (enabled) { enable(); } else void context.current.suspend().catch(() => undefined);
    }
  }, [enable, enabled]);
  useEffect(() => () => { void context.current?.close().catch(() => undefined); }, []);
  const hit = useCallback(() => {
    const audio = context.current;
    if (!enabled || !audio || audio.state !== "running") return;
    const now = audio.currentTime;
    const oscillator = audio.createOscillator(); oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(240, now); oscillator.frequency.exponentialRampToValueAtTime(65, now + 0.08);
    const gain = audio.createGain(); gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    oscillator.connect(gain).connect(audio.destination); oscillator.start(now); oscillator.stop(now + 0.11);
  }, [enabled]);
  const cheer = useCallback(() => {
    const audio = context.current;
    if (!enabled || !audio || !crowd.current || audio.state !== "running") return;
    const now = audio.currentTime;
    crowd.current.gain.cancelScheduledValues(now);
    crowd.current.gain.setValueAtTime(0.12, now);
    crowd.current.gain.linearRampToValueAtTime(0.65, now + 0.35);
    crowd.current.gain.exponentialRampToValueAtTime(0.12, now + 2.5);
  }, [enabled]);
  return { enable, hit, cheer };
}
