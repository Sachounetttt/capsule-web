'use client'

import { useEffect, useState } from 'react'

interface Props {
  score: number
  myInitials: string
  friendInitials: string
  myName: string
  friendName: string
}

export default function CompatBar({ score, myInitials, friendInitials, myName, friendName }: Props) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDisplayed(score), 120)
    return () => clearTimeout(t)
  }, [score])

  const p = displayed / 100

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <style>{`
        @keyframes cb-breath { 0%,100%{transform:translateY(-2px)} 50%{transform:translateY(2px)} }
        @keyframes cb-wave   { 0%,100%{transform:translateY(-2px)} 50%{transform:translateY(2px)} }
        @keyframes cb-bub {
          0%  {transform:translate(0,0) scale(.6);opacity:0}
          20% {opacity:.8}
          100%{transform:translate(0,-36px) scale(1);opacity:0}
        }
        .cb-svg   { animation: cb-breath 6s ease-in-out infinite; }
        .cb-wave  { animation: cb-wave   5s ease-in-out infinite; transform-box:fill-box; }
        .cb-bub   { animation: cb-bub    4s ease-in infinite; transform-origin:center; }
        .cb-bub:nth-child(2){ animation-delay:-1.2s; }
        .cb-bub:nth-child(3){ animation-delay:-2.4s; }
        .cb-bub:nth-child(4){ animation-delay:-3.0s; }
      `}</style>

      {/* Score */}
      <div className="flex items-baseline justify-center gap-1">
        <span className="font-bold" style={{
          fontSize: 38, lineHeight: 1, letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #6fa8ff, #b67bff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {displayed}
        </span>
        <span style={{
          fontSize: 18, fontWeight: 500,
          background: 'linear-gradient(135deg, #6fa8ff, #b67bff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>%</span>
        <span className="text-sm ml-2" style={{ color: 'rgba(255,255,255,0.4)', WebkitTextFillColor: 'unset' }}>
          de goûts similaires
        </span>
      </div>

      {/* Bar */}
      <svg
        className="cb-svg w-full"
        viewBox="0 0 440 100"
        aria-hidden="true"
        style={{
          filter: 'drop-shadow(0 8px 24px rgba(105,70,255,.35)) drop-shadow(0 2px 8px rgba(77,140,255,.25))',
        }}
      >
        <defs>
          <clipPath id="cb-cap">
            <rect x="20" y="20" width="400" height="60" rx="30" ry="30"/>
          </clipPath>
          <linearGradient id="cb-liq" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4d8cff"/>
            <stop offset="100%" stopColor="#8a4dff"/>
          </linearGradient>
          <linearGradient id="cb-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1c1736" stopOpacity=".9"/>
            <stop offset="100%" stopColor="#0a0717" stopOpacity=".9"/>
          </linearGradient>
        </defs>

        {/* Track */}
        <rect x="20" y="20" width="400" height="60" rx="30" ry="30" fill="url(#cb-glass)"/>

        {/* Liquid fill */}
        <g clipPath="url(#cb-cap)">
          <g style={{
            clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
            transition: 'clip-path 800ms cubic-bezier(.4,0,.2,1)',
          }}>
            <rect x="20" y="20" width="400" height="60" fill="url(#cb-liq)"/>
            <path
              className="cb-wave"
              d="M -10,20 Q 30,12 70,20 T 150,20 T 230,20 T 310,20 T 390,20 T 470,20 L 470,26 L -10,26 Z"
              fill="rgba(255,255,255,.18)"
            />
            <circle className="cb-bub" cx="80"  cy="68" r="3"   fill="rgba(255,255,255,.5)"/>
            <circle className="cb-bub" cx="160" cy="68" r="2"   fill="rgba(255,255,255,.5)"/>
            <circle className="cb-bub" cx="240" cy="68" r="2.5" fill="rgba(255,255,255,.5)"/>
            <circle className="cb-bub" cx="320" cy="68" r="2"   fill="rgba(255,255,255,.5)"/>
          </g>
        </g>

        {/* Rim */}
        <rect x="20" y="20" width="400" height="60" rx="30" ry="30"
          fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1"/>
        <path d="M 80,26 Q 220,20 360,26" stroke="rgba(255,255,255,.4)" strokeWidth="1.2" fill="none"/>
      </svg>

      {/* Avatars */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #4d8cff, #6fa8ff)' }}>
            {myInitials}
          </div>
          <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{myName}</span>
        </div>
        <div className="flex items-center gap-2 flex-row-reverse">
          <div className="rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #8a4dff, #b67bff)' }}>
            {friendInitials}
          </div>
          <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{friendName}</span>
        </div>
      </div>
    </div>
  )
}
