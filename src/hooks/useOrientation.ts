import { useState, useEffect } from "react";

/**
 * Detects if the device is in landscape orientation.
 * Uses both `matchMedia` (orientation) and a height check to ensure
 * it only activates on actual mobile-sized devices in landscape,
 * not desktop monitors.
 */
export function useOrientation() {
    const [isLandscape, setIsLandscape] = useState(() => {
        if (typeof window === "undefined") return false;
        return (
            window.matchMedia("(orientation: landscape)").matches &&
            window.innerHeight < 500
        );
    });

    useEffect(() => {
        const checkOrientation = () => {
            const landscape =
                window.matchMedia("(orientation: landscape)").matches &&
                window.innerHeight < 500;
            setIsLandscape(landscape);
        };

        window.addEventListener("resize", checkOrientation);
        window.addEventListener("orientationchange", checkOrientation);

        // Also listen via matchMedia for more reliable detection
        const mql = window.matchMedia("(orientation: landscape)");
        mql.addEventListener("change", checkOrientation);

        return () => {
            window.removeEventListener("resize", checkOrientation);
            window.removeEventListener("orientationchange", checkOrientation);
            mql.removeEventListener("change", checkOrientation);
        };
    }, []);

    return isLandscape;
}
