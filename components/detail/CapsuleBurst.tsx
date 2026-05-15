'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'

const BLOBS = [
  { x: -120, y: -80,  color: '#4d8cff', size: 48 },
  { x:  130, y: -70,  color: '#8a4dff', size: 56 },
  { x:    0, y: -130, color: '#6a6dff', size: 38 },
  { x: -100, y:  100, color: '#4d8cff', size: 42 },
  { x:  110, y:   90, color: '#b67bff', size: 36 },
]

export default function CapsuleBurst({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2400)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8"
      style={{ background: 'radial-gradient(circle at 50% 50%, #14102a 0%, #050510 100%)' }}
    >
      <div className="relative flex items-center justify-center" style={{ width: 240, height: 110 }}>

        {/* Blobs qui s'échappent */}
        {BLOBS.map((blob, i) => (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0.8, opacity: 1 }}
            animate={{ x: blob.x, y: blob.y, scale: 0.1, opacity: 0 }}
            transition={{ duration: 1.1, delay: 0.3 + i * 0.06, ease: [0.2, 0, 0.8, 1] }}
            className="absolute rounded-full"
            style={{
              width: blob.size,
              height: blob.size,
              background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
              filter: 'blur(6px)',
            }}
          />
        ))}

        {/* Coque capsule qui se dissout */}
        <motion.svg
          viewBox="0 0 440 200"
          width={240}
          height={110}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: [0.85, 1, 1.2], opacity: [0, 1, 0] }}
          transition={{ duration: 1.8, times: [0, 0.18, 1], ease: 'easeOut' }}
          className="absolute"
          style={{
            filter: 'drop-shadow(0 0 30px rgba(138,77,255,0.6)) drop-shadow(0 0 60px rgba(77,140,255,0.4))',
          }}
        >
          <defs>
            <linearGradient id="burst-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#6fa8ff"/>
              <stop offset="50%"  stopColor="#b67bff"/>
              <stop offset="100%" stopColor="#4d8cff"/>
            </linearGradient>
            <linearGradient id="burst-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#1c1736" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#0a0717" stopOpacity="0.4"/>
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="428" height="188" rx="94" ry="94" fill="url(#burst-fill)"/>
          <rect x="6" y="6" width="428" height="188" rx="94" ry="94"
            fill="none" stroke="url(#burst-rim)" strokeWidth="2" opacity="0.9"/>
          <path d="M 100,14 Q 220,2 340,14 Q 280,42 220,42 Q 160,42 100,14 Z"
            fill="rgba(255,255,255,0.15)"/>
        </motion.svg>
      </div>

      {/* Label */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -8] }}
        transition={{ duration: 2.1, times: [0, 0.15, 0.72, 1] }}
        className="text-lg font-semibold tracking-wide"
        style={{
          background: 'linear-gradient(135deg, #6fa8ff, #b67bff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Archivé dans ta bibliothèque
      </motion.p>
    </motion.div>
  )
}
