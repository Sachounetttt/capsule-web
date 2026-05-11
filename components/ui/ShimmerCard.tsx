'use client'
import { motion } from 'framer-motion'

export default function ShimmerCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`glass rounded-[20px] overflow-hidden relative ${className}`}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}
