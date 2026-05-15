export default function Loader({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="Chargement">
      <style>{`
        @keyframes l06spin { to { transform: rotate(360deg); } }
        @keyframes l06b { 0%,100% { r: 14; } 50% { r: 22; } }
        .l06-ring { transform-origin: 100px 100px; animation: l06spin 4s linear infinite; }
        .l06-ring circle { fill: white; transform-origin: center; animation: l06b 1.6s ease-in-out infinite; }
        .l06-ring circle:nth-child(1) { animation-delay:  0s; }
        .l06-ring circle:nth-child(2) { animation-delay: -.2s; }
        .l06-ring circle:nth-child(3) { animation-delay: -.4s; }
        .l06-ring circle:nth-child(4) { animation-delay: -.6s; }
        .l06-ring circle:nth-child(5) { animation-delay: -.8s; }
        .l06-ring circle:nth-child(6) { animation-delay: -1.0s; }
      `}</style>
      <defs>
        <filter id="goo-l06">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6"/>
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"/>
          <feComposite in="SourceGraphic" operator="atop"/>
        </filter>
      </defs>
      <g className="l06-ring" filter="url(#goo-l06)">
        <circle cx="100" cy="40"  r="18"/>
        <circle cx="152" cy="70"  r="18"/>
        <circle cx="152" cy="130" r="18"/>
        <circle cx="100" cy="160" r="18"/>
        <circle cx="48"  cy="130" r="18"/>
        <circle cx="48"  cy="70"  r="18"/>
      </g>
    </svg>
  )
}
