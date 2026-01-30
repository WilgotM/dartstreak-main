import React, { useEffect, useState } from 'react';

export function HeroBackground() {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true" style={{ perspective: '1200px' }}>
            {/* Background Gradient - Stronger overlay for text contrast while keeping board visible */}
            <div className="absolute inset-0 bg-background/80 z-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50 z-20" />

            {/* 3D Scene Container - Centered and Fixed-ish */}
            <div
                className="fixed top-0 left-0 w-full h-[100vh] flex items-center justify-center z-0 will-change-transform"
                style={{
                    opacity: Math.max(0.3, 1 - scrollY / 800),
                    transform: `translateY(${-40 + scrollY * 0.05}px)`
                }}
            >
                <style>
                    {`
                @keyframes slowSpin {
                    from { transform: rotateZ(0deg); }
                    to { transform: rotateZ(360deg); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px) scale(1.1); }
                    50% { transform: translateY(-20px) scale(1.1); }
                }
            `}
                </style>

                {/* World Transform Group */}
                <div
                    className="relative w-[600px] h-[600px] preserve-3d transition-transform duration-75"
                    style={{
                        // Base transform handled by animation
                        animation: 'float 8s ease-in-out infinite'
                    }}
                >
                    {/* Dartboard Layer - Spinning */}
                    <div
                        className="absolute inset-0 flex items-center justify-center transform-gpu"
                        style={{
                            transform: 'translateZ(0px)',
                            animation: 'slowSpin 120s linear infinite' // Very slow, majestic rotation
                        }}
                    >
                        <DartboardSVG />
                    </div>
                </div>
            </div>
        </div >
    );
}

function DartboardSVG() {
    const colors = {
        black: "#27272a", // zinc-800
        white: "#e4e4e7", // zinc-100
        red: "#ef4444",   // red-500
        green: "#22c55e", // green-500
        wire: "#a1a1aa",  // zinc-400
        border: "#18181b" // zinc-900
    };

    const numbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

    return (
        <svg
            viewBox="-250 -250 500 500"
            className="w-[90vw] h-[90vw] md:w-[650px] md:h-[650px] max-h-[75vh] max-w-[75vh] overflow-visible"
            style={{
                filter: "drop-shadow(30px 30px 50px rgba(0,0,0,0.6))"
            }}
        >
            <defs>
                <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                    <stop offset="50%" stopColor="transparent" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
                </linearGradient>
            </defs>

            <g transform="scale(0.9)">
                {/* Board Base */}
                <circle r="250" fill={colors.border} />
                {/* Sisal area */}
                <circle r="220" fill={colors.black} stroke={colors.wire} strokeWidth="1" />

                {numbers.map((num, i) => {
                    const angle = (360 / 20);
                    const startAngle = (i * angle) - 90 - (angle / 2);
                    const endAngle = startAngle + angle;

                    const getP = (r: number, a: number) => {
                        const rad = (a * Math.PI) / 180;
                        return `${r * Math.cos(rad)} ${r * Math.sin(rad)}`;
                    };

                    const rDoubleOuter = 210;
                    const rDoubleInner = 195;
                    const rTripleOuter = 125;
                    const rTripleInner = 110;

                    const wedge = (rO: number, rI: number) => `
               M ${getP(rI, startAngle)}
               L ${getP(rO, startAngle)}
               A ${rO} ${rO} 0 0 1 ${getP(rO, endAngle)}
               L ${getP(rI, endAngle)}
               A ${rI} ${rI} 0 0 0 ${getP(rI, startAngle)}
               Z
             `;

                    const isEven = i % 2 === 0;
                    const singleColor = isEven ? colors.black : colors.white;
                    const specialColor = isEven ? colors.red : colors.green;

                    return (
                        <g key={i}>
                            <path d={wedge(rDoubleOuter, rDoubleInner)} fill={specialColor} stroke={colors.wire} strokeWidth="1" />
                            <path d={wedge(rDoubleInner, rTripleOuter)} fill={singleColor} stroke={colors.wire} strokeWidth="1" />
                            <path d={wedge(rTripleOuter, rTripleInner)} fill={specialColor} stroke={colors.wire} strokeWidth="1" />
                            <path d={wedge(rTripleInner, 30)} fill={singleColor} stroke={colors.wire} strokeWidth="1" />
                        </g>
                    );
                })}

                {/* Wire Structure */}
                <circle r="210" fill="none" stroke={colors.wire} strokeWidth="2" />
                <circle r="195" fill="none" stroke={colors.wire} strokeWidth="2" />
                <circle r="125" fill="none" stroke={colors.wire} strokeWidth="2" />
                <circle r="110" fill="none" stroke={colors.wire} strokeWidth="2" />
                <circle r="30" fill="none" stroke={colors.wire} strokeWidth="2" />

                {/* Bulls */}
                <circle r="30" fill={colors.green} stroke={colors.wire} strokeWidth="1" />
                <circle r="12" fill={colors.red} stroke={colors.wire} strokeWidth="1" />

                {/* Number Ring */}
                {numbers.map((num, i) => {
                    const angleDeg = (i * 360) / 20 - 90;
                    const angleRad = (angleDeg * Math.PI) / 180;
                    const r = 232;
                    const x = r * Math.cos(angleRad);
                    const y = r * Math.sin(angleRad);

                    return (
                        <text
                            key={`n-${num}`}
                            x={x}
                            y={y}
                            fill="#a1a1aa"
                            fontSize="24"
                            fontWeight="700"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="font-display select-none"
                        >
                            {num}
                        </text>
                    );
                })}

                <circle r="250" fill="url(#sheen)" style={{ pointerEvents: 'none' }} />
            </g>
        </svg>
    );
}
