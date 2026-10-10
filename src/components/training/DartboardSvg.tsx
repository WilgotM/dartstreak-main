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
const MM_PER_SVG_UNIT = 170 / 83;
const BULL_RADIUS = 6.35 / MM_PER_SVG_UNIT;
const OUTER_BULL_RADIUS = 15.9 / MM_PER_SVG_UNIT;
const TREBLE_INNER_RADIUS = 99.4 / MM_PER_SVG_UNIT;
const TREBLE_OUTER_RADIUS = 107.4 / MM_PER_SVG_UNIT;
const DOUBLE_INNER_RADIUS = 162 / MM_PER_SVG_UNIT;
const NUMBER_RADIUS = 94;
const WIRE_COLOR = "#b8b6aa";

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
    
    const distance_mm = svgDistance * MM_PER_SVG_UNIT;

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
      {/* Keep the scoring face at radius 83 so real throw coordinates stay aligned. */}
      <circle cx="100" cy="100" r="100" fill="#191b1d" />
      <circle cx="100" cy="100" r="99" fill="#141618" stroke="#55595b" strokeWidth="0.45" />

      {BOARD_RING.map((number, index) => {
        const isDanger = dangerNumbers.has(number);
        const startAngle = index * 18 - 9;
        const endAngle = index * 18 + 9;
        
        const isEven = index % 2 === 0;
        
        const singleColor = isDanger
          ? "#ef4444"
          : (isEven ? "#20211f" : "#f1e8d5");
          
        const ringColor = isDanger
          ? "#b91c1c"
          : (isEven ? "#c82f36" : "#16815b");

        // Text positions
        const textRad = ((index * 18 - 90) * Math.PI) / 180;
        const textX = 100 + NUMBER_RADIUS * Math.cos(textRad);
        const textY = 100 + NUMBER_RADIUS * Math.sin(textRad);

        return (
          <g key={number}>
            {/* Inner single */}
            <path
              d={getWedgePath(startAngle, endAngle, OUTER_BULL_RADIUS, TREBLE_INNER_RADIUS)}
              fill={singleColor}
              stroke={WIRE_COLOR}
              strokeWidth="0.35"
              className="transition-colors duration-300"
            />
            {/* Treble ring */}
            <path
              d={getWedgePath(startAngle, endAngle, TREBLE_INNER_RADIUS, TREBLE_OUTER_RADIUS)}
              fill={ringColor}
              stroke={WIRE_COLOR}
              strokeWidth="0.35"
              className="transition-colors duration-300"
            />
            {/* Outer single */}
            <path
              d={getWedgePath(startAngle, endAngle, TREBLE_OUTER_RADIUS, DOUBLE_INNER_RADIUS)}
              fill={singleColor}
              stroke={WIRE_COLOR}
              strokeWidth="0.35"
              className="transition-colors duration-300"
            />
            {/* Double ring */}
            <path
              d={getWedgePath(startAngle, endAngle, DOUBLE_INNER_RADIUS, 83)}
              fill={ringColor}
              stroke={WIRE_COLOR}
              strokeWidth="0.35"
              className="transition-colors duration-300"
            />
            {/* Number text */}
            <text
              x={textX}
              y={textY}
              fill={isDanger ? "#ff8888" : "#f4f2e9"}
              fontSize="8.5"
              fontWeight="600"
              fontFamily="Arial, Helvetica, sans-serif"
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
      <circle cx="100" cy="100" r={OUTER_BULL_RADIUS} fill="#16815b" stroke={WIRE_COLOR} strokeWidth="0.35" />
      <circle cx="100" cy="100" r={BULL_RADIUS} fill="#c82f36" stroke={WIRE_COLOR} strokeWidth="0.35" />

      {/* Manufacturer-style branding sits outside every scoring segment. */}
      <text
        x="100"
        y="188"
        fill="#a5a7a5"
        fontSize="3"
        fontWeight="600"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.7"
        textAnchor="middle"
        pointerEvents="none"
      >
        DARTSTREAK
      </text>

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
