export default function CapsuleLogo({ width = 220, height = 100 }: { width?: number; height?: number }) {
  return (
    <div style={{ position: 'relative', width, height }}>
      <style>{`
@keyframes cap-b1 {
          0%   { cx: 150; cy: 110; } 25%  { cx: 200; cy:  80; }
          50%  { cx: 260; cy: 120; } 75%  { cx: 180; cy: 130; } 100% { cx: 150; cy: 110; }
        }
        @keyframes cap-b2 {
          0%   { cx: 290; cy:  90; } 25%  { cx: 240; cy: 120; }
          50%  { cx: 180; cy:  85; } 75%  { cx: 270; cy: 110; } 100% { cx: 290; cy:  90; }
        }
        @keyframes cap-b3 {
          0%   { cx: 220; cy: 100; } 50%  { cx: 220; cy: 105; } 100% { cx: 220; cy: 100; }
        }
        @keyframes cap-b4 {
          0%   { cx: 110; cy:  90; } 50%  { cx: 130; cy: 120; } 100% { cx: 110; cy:  90; }
        }
        @keyframes cap-b5 {
          0%   { cx: 330; cy: 115; } 50%  { cx: 310; cy:  85; } 100% { cx: 330; cy: 115; }
        }
        @keyframes cap-slosh {
          0%,100% { transform: translateY(-2px); }
          50%     { transform: translateY( 4px); }
        }
.cap-liq { transform-box: fill-box; transform-origin: center; }
        .cap-b1 { animation: cap-b1 7.0s ease-in-out infinite; }
        .cap-b2 { animation: cap-b2 8.4s ease-in-out infinite; }
        .cap-b3 { animation: cap-b3 6.2s ease-in-out infinite; }
        .cap-b4 { animation: cap-b4 9.1s ease-in-out infinite; }
        .cap-b5 { animation: cap-b5 7.7s ease-in-out infinite; }
        .cap-slosh { animation: cap-slosh 5.5s ease-in-out infinite; transform-box: fill-box; }
      `}</style>

      <div
        style={{
          width, height,
          filter: 'drop-shadow(0 9px 25px rgba(105,70,255,.45)) drop-shadow(0 2px 7px rgba(77,140,255,.35))',
        }}
      >
        <svg viewBox="0 0 440 200" xmlns="http://www.w3.org/2000/svg" width={width} height={height} aria-label="Capsule">
          <defs>
            <clipPath id="cap-clip">
              <rect x="6" y="6" width="428" height="188" rx="94" ry="94"/>
            </clipPath>
            <linearGradient id="cap-glass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#1c1736" stopOpacity=".95"/>
              <stop offset="55%"  stopColor="#100b22" stopOpacity=".92"/>
              <stop offset="100%" stopColor="#0a0717" stopOpacity=".96"/>
            </linearGradient>
            <linearGradient id="cap-spec" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity=".55"/>
              <stop offset="40%"  stopColor="#ffffff" stopOpacity=".08"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="cap-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#6fa8ff"/>
              <stop offset="50%"  stopColor="#b67bff"/>
              <stop offset="100%" stopColor="#4d8cff"/>
            </linearGradient>
            <radialGradient id="cap-blob-blue" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#8fbcff" stopOpacity="1"/>
              <stop offset="60%"  stopColor="#4d8cff" stopOpacity=".9"/>
              <stop offset="100%" stopColor="#2456c4" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="cap-blob-violet" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#d6b6ff" stopOpacity="1"/>
              <stop offset="60%"  stopColor="#8a4dff" stopOpacity=".9"/>
              <stop offset="100%" stopColor="#4a1f9c" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="cap-blob-mix" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#c2a8ff" stopOpacity="1"/>
              <stop offset="60%"  stopColor="#6a6dff" stopOpacity=".9"/>
              <stop offset="100%" stopColor="#3a30a0" stopOpacity="0"/>
            </radialGradient>
            <filter id="cap-goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12"/>
              <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"/>
              <feComposite in="SourceGraphic" operator="atop"/>
            </filter>
            <filter id="cap-soften" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="1.2"/>
            </filter>
          </defs>

          {/* glass body */}
          <rect x="6" y="6" width="428" height="188" rx="94" ry="94" fill="url(#cap-glass)"/>

          {/* liquid blobs */}
          <g clipPath="url(#cap-clip)">
            <ellipse cx="220" cy="100" rx="210" ry="80" fill="url(#cap-blob-mix)" opacity=".35"/>
            <g filter="url(#cap-goo)" style={{ mixBlendMode: 'screen' }}>
              <circle className="cap-liq cap-b1" r="60" fill="url(#cap-blob-blue)"/>
              <circle className="cap-liq cap-b2" r="68" fill="url(#cap-blob-violet)"/>
              <circle className="cap-liq cap-b3" r="46" fill="url(#cap-blob-mix)"/>
              <circle className="cap-liq cap-b4" r="38" fill="url(#cap-blob-blue)"/>
              <circle className="cap-liq cap-b5" r="34" fill="url(#cap-blob-violet)"/>
            </g>
            <path className="cap-slosh"
              d="M 0,100 C 60,86 120,114 220,100 C 320,86 380,114 440,100 L 440,200 L 0,200 Z"
              fill="rgba(255,255,255,0.04)"/>
          </g>

          {/* specular highlight */}
          <path d="M 100,14 Q 220,2 340,14 Q 280,42 220,42 Q 160,42 100,14 Z"
            fill="url(#cap-spec)" filter="url(#cap-soften)"/>

          {/* neon rim */}
          <rect x="6" y="6" width="428" height="188" rx="94" ry="94"
            fill="none" stroke="url(#cap-rim)" strokeWidth="1.2" opacity=".75"/>

          {/* rim highlights */}
          <path d="M 30,100 a 70,70 0 0 1 70,-70" stroke="rgba(255,255,255,.35)" strokeWidth="1.4" fill="none"/>
          <path d="M 410,100 a 70,70 0 0 1 -70,70" stroke="rgba(255,255,255,.18)" strokeWidth="1.2" fill="none"/>
        </svg>
      </div>
    </div>
  )
}
