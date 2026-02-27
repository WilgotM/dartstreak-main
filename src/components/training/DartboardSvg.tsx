import React from "react";
import { cn } from "@/lib/utils";

export interface DartboardMarker {
  x: number;
  y: number;
  color: string;
  label: string;
}

export interface DartboardClickPoint {
  x: number;
  y: number;
  distance: number;
}

interface DartboardSvgProps {
  dangerNumbers: Set<number>;
  className?: string;
  markers?: DartboardMarker[];
  onBoardClick?: (point: DartboardClickPoint) => void;
}

const BOARD_RING = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export function DartboardSvg({ dangerNumbers, className, markers = [], onBoardClick }: DartboardSvgProps) {
  const getWedgePath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1Inner = 100 + innerRadius * Math.cos(startRad);
    const y1Inner = 100 + innerRadius * Math.sin(startRad);
    const x2Inner = 100 + innerRadius * Math.cos(endRad);
    const y2Inner = 100 + innerRadius * Math.sin(endRad);

    const x1Outer = 100 + outerRadius * Math.cos(startRad);
    const y1Outer = 100 + outerRadius * Math.sin(startRad);
    const x2Outer = 100 + outerRadius * Math.cos(endRad);
    const y2Outer = 100 + outerRadius * Math.sin(endRad);

    return `
      M ${x1Inner} ${y1Inner}
      L ${x1Outer} ${y1Outer}
      A ${outerRadius} ${outerRadius} 0 0 1 ${x2Outer} ${y2Outer}
      L ${x2Inner} ${y2Inner}
      A ${innerRadius} ${innerRadius} 0 0 0 ${x1Inner} ${y1Inner}
      Z
    `;
  };

  const handleBoardClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!onBoardClick) return;

    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 200;
    const y = ((event.clientY - rect.top) / rect.height) * 200;
    const svgDistance = Math.hypot(x - 100, y - 100);

    if (svgDistance > 100) return;
    
    const SVG_TO_MM = 2.048; // 170mm real radius / 83 SVG units = 2.048 mm per SVG unit
    const distance_mm = svgDistance * SVG_TO_MM;

    onBoardClick({ x, y, distance: distance_mm });
  };

  return (
    <svg
      viewBox="0 0 200 200"
      className={cn("w-full max-w-sm mx-auto", onBoardClick && "cursor-crosshair", className)}
      onClick={handleBoardClick}
      role={onBoardClick ? "button" : undefined}
      aria-label={onBoardClick ? "Interactive dartboard" : undefined}
    >
      {/* Outer base shape */}
      <circle cx="100" cy="100" r="100" fill="#12121A" />
      
      {/* Number ring background */}
      <circle cx="100" cy="100" r="95" fill="#1A1A24" stroke="#222" strokeWidth="1" />

      {BOARD_RING.map((number, index) => {
        const isDanger = dangerNumbers.has(number);
        const startAngle = index * 18 - 9;
        const endAngle = index * 18 + 9;
        
        const isEven = index % 2 === 0;
        
        // Colors
        const singleColor = isDanger 
          ? "#ef4444" // solid red
          : (isEven ? "#0a0a0f" : "#1a1a24"); // standard dark theme
          
        const ringColor = isDanger
          ? "#b91c1c" // slightly darker/richer red for texture
          : (isEven ? "#7f1d1d" : "#064e3b"); // muted red/green

        // Text positions
        const textRad = ((index * 18 - 90) * Math.PI) / 180;
        const textX = 100 + 87 * Math.cos(textRad);
        const textY = 100 + 87 * Math.sin(textRad);

        return (
          <g key={number}>
            {/* Inner single */}
            <path
              d={getWedgePath(startAngle, endAngle, 9, 43)}
              fill={singleColor}
              stroke="#222"
              strokeWidth="0.5"
              className="transition-colors duration-300"
            />
            {/* Treble ring */}
            <path
              d={getWedgePath(startAngle, endAngle, 43, 51)}
              fill={ringColor}
              stroke="#222"
              strokeWidth="0.5"
              className="transition-colors duration-300"
            />
            {/* Outer single */}
            <path
              d={getWedgePath(startAngle, endAngle, 51, 75)}
              fill={singleColor}
              stroke="#222"
              strokeWidth="0.5"
              className="transition-colors duration-300"
            />
            {/* Double ring */}
            <path
              d={getWedgePath(startAngle, endAngle, 75, 83)}
              fill={ringColor}
              stroke="#222"
              strokeWidth="0.5"
              className="transition-colors duration-300"
            />
            {/* Number text */}
            <text
              x={textX}
              y={textY}
              fill={isDanger ? "#ef4444" : "#94a3b8"}
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="central"
              className="transition-colors duration-300"
            >
              {number}
            </text>
          </g>
        );
      })}
      
      {/* Bullseyes */}
      <circle cx="100" cy="100" r="9" fill="#064e3b" stroke="#222" strokeWidth="0.5" />
      <circle cx="100" cy="100" r="4" fill="#7f1d1d" stroke="#222" strokeWidth="0.5" />

      {markers.length > 0 && (
        <g pointerEvents="none">
          {markers.map((marker, index) => (
            <g key={`marker-${index}`}>
              <circle cx={marker.x} cy={marker.y} r="4.2" fill={marker.color} stroke="#F8FAFC" strokeWidth="1.2" />
              <text
                x={marker.x}
                y={marker.y}
                fill="#F8FAFC"
                fontSize="4.8"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {marker.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
