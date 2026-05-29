import React from 'react';

interface KopranLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: number; // Size of the icon
  textColor?: string; // Class for text color, e.g. text-slate-800
}

export default function KopranLogo({
  className = '',
  iconOnly = false,
  size = 48,
  textColor = 'text-slate-800'
}: KopranLogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Brand SVG Icon Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 scale-95 transition-transform duration-300 hover:scale-100"
      >
        {/* Regular Flat-Topped Hexagon Outline */}
        <path
          d="M 30 11 L 70 11 L 91.5 45 L 70 79 L 30 79 L 8.5 45 Z"
          stroke="#7F7F7F"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="opacity-90"
        />

        {/* Hand Cupping Gestures (Upper Hand) */}
        <path
          d="M 14 36 C 24 20, 50 16, 73 24"
          stroke="#7C7C80"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 18 42 C 28 28, 52 24, 71 31"
          stroke="#7C7C80"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 23 46 C 31 36, 51 32, 65 37"
          stroke="#7C7C80"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Hand Cupping Gestures (Lower Hand) - Mirror of Upper Hand rotated */}
        <path
          d="M 86 54 C 76 70, 50 74, 27 66"
          stroke="#7C7C80"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 82 48 C 72 62, 48 66, 29 59"
          stroke="#7C7C80"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 77 44 C 69 54, 49 58, 35 53"
          stroke="#7C7C80"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Symmetric 4-Leaf Clover/Cross composed of elegant red hearts */}
        <g id="clover-hearts">
          {/* Heart facing UP */}
          <path
            d="M 50 45 C 47.2 41.5, 43.8 41.5, 43.8 38.5 C 43.8 35.5, 46.8 33.5, 50 36.5 C 53.2 33.5, 56.2 35.5, 56.2 38.5 C 56.2 41.5, 52.8 41.5, 50 45 Z"
            fill="#DC2626"
          />
          {/* Heart facing RIGHT */}
          <path
            d="M 50 45 C 53.5 42.2, 53.5 38.8, 56.5 38.8 C 59.5 38.8, 61.5 41.8, 58.5 45 C 61.5 48.2, 59.5 51.2, 56.5 51.2 C 53.5 51.2, 53.5 47.8, 50 45 Z"
            fill="#DC2626"
          />
          {/* Heart facing DOWN */}
          <path
            d="M 50 45 C 52.8 48.5, 56.2 48.5, 56.2 51.5 C 56.2 54.5, 53.2 56.5, 50 53.5 C 46.8 56.5, 43.8 54.5, 43.8 51.5 C 43.8 48.5, 47.2 48.5, 50 45 Z"
            fill="#DC2626"
          />
          {/* Heart facing LEFT */}
          <path
            d="M 50 45 C 46.5 47.8, 46.5 51.2, 43.5 51.2 C 40.5 51.2, 38.5 48.2, 41.5 45 C 38.5 41.8, 40.5 38.8, 43.5 38.8 C 46.5 38.8, 46.5 42.2, 50 45 Z"
            fill="#DC2626"
          />
        </g>
      </svg>

      {/* Styled Brand Heading Text with Outline Contour Serif Vibe */}
      {!iconOnly && (
        <div className="flex flex-col text-left">
          <span 
            className={`text-2xl font-bold font-serif tracking-wide leading-none ${textColor}`}
            style={{ 
              fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif"
            }}
          >
            Kopran
          </span>
          <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase leading-none mt-1">
            MEMBER OF KOPRAN GROUP
          </span>
        </div>
      )}
    </div>
  );
}
