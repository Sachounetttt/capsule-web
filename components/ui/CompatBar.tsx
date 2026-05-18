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
    let id1: number, id2: number
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setDisplayed(score))
    })
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
  }, [score])

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <style>{`
        @keyframes cb-wave { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-8px)} }
        .cb-wave-inner { animation: cb-wave 5s ease-in-out infinite; }
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

      {/* Bar — div CSS pur, compatible partout */}
      <div
        className="relative overflow-hidden"
        style={{
          height: 52,
          borderRadius: 26,
          background: 'linear-gradient(135deg, #1c1736ee, #0a0717ee)',
          border: '1px solid rgba(255,255,255,.15)',
          boxShadow: '0 8px 24px rgba(105,70,255,.2)',
        }}
      >
        {/* Remplissage liquide */}
        <div
          style={{
            position: 'absolute',
            inset: '0 auto 0 0',
            width: `${displayed}%`,
            background: 'linear-gradient(90deg, #4d8cff, #8a4dff)',
            borderRadius: 26,
            transition: 'width 900ms cubic-bezier(.4,0,.2,1)',
            boxShadow: '2px 0 12px rgba(105,70,255,.5)',
            overflow: 'hidden',
          }}
        >
          {/* Vague animée */}
          <div className="cb-wave-inner absolute inset-0" style={{ width: '150%' }}>
            <svg
              className="absolute bottom-0 left-0 w-full"
              viewBox="0 0 600 52"
              preserveAspectRatio="none"
              style={{ height: '100%' }}
            >
              <path
                d="M0,26 Q75,14 150,26 T300,26 T450,26 T600,26 L600,52 L0,52 Z"
                fill="rgba(255,255,255,.12)"
              />
              <path
                d="M0,32 Q75,22 150,32 T300,32 T450,32 T600,32 L600,52 L0,52 Z"
                fill="rgba(255,255,255,.08)"
              />
            </svg>
          </div>
          {/* Reflet haut */}
          <div
            style={{
              position: 'absolute',
              top: 6, left: 10, right: 10, height: 1,
              background: 'rgba(255,255,255,.45)',
              borderRadius: 4,
            }}
          />
        </div>

        {/* Reflet global */}
        <div
          style={{
            position: 'absolute',
            top: 6, left: 10, right: 10, height: 1,
            background: 'rgba(255,255,255,.1)',
            borderRadius: 4,
          }}
        />
      </div>

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
