import { useCallback } from 'react';

/**
 * Hook for providing native-like haptic feedback.
 * Uses the Vibration API with iOS/Android-optimized patterns.
 */
export function useHaptics() {
    const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

    const vibrate = useCallback((pattern: number | number[]) => {
        if (isSupported) {
            try {
                navigator.vibrate(pattern);
            } catch {
                // Silently fail if vibration is blocked
            }
        }
    }, [isSupported]);

    /** Light tap - for subtle UI feedback like switching tabs */
    const light = useCallback(() => vibrate(10), [vibrate]);

    /** Medium tap - for button presses and confirmations */
    const medium = useCallback(() => vibrate(20), [vibrate]);

    /** Heavy tap - for important actions or errors */
    const heavy = useCallback(() => vibrate(40), [vibrate]);

    /** Success pattern - for completed actions */
    const success = useCallback(() => vibrate([10, 50, 20]), [vibrate]);

    /** Error pattern - for failed actions */
    const error = useCallback(() => vibrate([40, 30, 40]), [vibrate]);

    /** Selection changed - very subtle for list navigation */
    const selection = useCallback(() => vibrate(5), [vibrate]);

    return {
        isSupported,
        light,
        medium,
        heavy,
        success,
        error,
        selection,
        vibrate,
    };
}
